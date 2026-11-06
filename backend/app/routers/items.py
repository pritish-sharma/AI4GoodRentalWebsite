from decimal import Decimal
from typing import Literal
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import current_user_id
from app.db import get_db

router = APIRouter(prefix="/items", tags=["items"])

# Columns the frontend's Item type expects (see frontend/lib/api.ts).
ITEM_CARD_SQL = """
    select i.id, i.title, i.category, i.price_per_day::float as price_per_day,
           i.photos[1] as photo_url,
           s.quality_score, s.quality_label
    from items i
    left join ai_scores s on s.item_id = i.id
"""


class NewItem(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(default="", max_length=2000)
    category: str
    price_per_day: Decimal = Field(ge=0, le=500)
    condition_stated: Literal["like new", "good", "worn"] = "good"
    photos: list[str] = []


@router.get("")
def search_items(
    q: str | None = None,
    category: str | None = None,
    sort: Literal["newest", "quality", "price"] = "newest",
    db: psycopg.Connection = Depends(get_db),
):
    order = {
        "newest": "i.created_at desc",
        "quality": "s.quality_score desc nulls last",
        "price": "i.price_per_day asc",
    }[sort]
    return db.execute(
        ITEM_CARD_SQL
        + """
        where i.status = 'active'
          and (%(q)s::text is null or i.title ilike '%%' || %(q)s || '%%'
               or i.description ilike '%%' || %(q)s || '%%')
          and (%(category)s::text is null or i.category = %(category)s)
        order by """
        + order
        + " limit 50",
        {"q": q, "category": category},
    ).fetchall()


@router.get("/{item_id}")
def get_item(item_id: UUID, db: psycopg.Connection = Depends(get_db)):
    # UUID type: a malformed id gets a clean 422 instead of a database error.
    item = db.execute(
        """
        select i.*, u.name as owner_name,
               s.quality_score, s.quality_label, s.similar_item_ids
        from items i
        join users u on u.id = i.owner_id
        left join ai_scores s on s.item_id = i.id
        where i.id = %s
        """,
        (item_id,),
    ).fetchone()
    if item is None:
        raise HTTPException(404, "Item not found")

    item["reviews"] = db.execute(
        """
        select r.stars, r.text, r.created_at, u.name as reviewer_name
        from reviews r
        join rentals rt on rt.id = r.rental_id
        join users u on u.id = r.reviewer_id
        where rt.item_id = %s and r.target = 'item'
        order by r.created_at desc
        """,
        (item_id,),
    ).fetchall()
    return item


@router.post("", status_code=201)
def create_item(
    body: NewItem,
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    return db.execute(
        """
        insert into items (owner_id, title, description, category,
                           price_per_day, condition_stated, photos)
        values (%s, %s, %s, %s, %s, %s, %s)
        returning *
        """,
        (
            user_id,
            body.title,
            body.description,
            body.category,
            body.price_per_day,
            body.condition_stated,
            body.photos,
        ),
    ).fetchone()
