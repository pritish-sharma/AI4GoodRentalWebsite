import re
from decimal import Decimal
from typing import Literal
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import registered_user_id
from app.db import get_db

router = APIRouter(prefix="/items", tags=["items"])

# Must match frontend/lib/categories.ts.
CATEGORIES = ("Cameras", "Outdoor", "Gardening", "Beauty", "Tech", "Other")
Category = Literal["Cameras", "Outdoor", "Gardening", "Beauty", "Tech", "Other"]
Condition = Literal["like new", "good", "worn"]

# Words that keep listings safe and legal (see "Blocked items" in the project plan).
BLOCKED_WORDS = {
    # word people might type -> word shown in the error
    "gun": "gun", "guns": "gun", "knife": "knife", "knives": "knife",
    "weapon": "weapon", "weapons": "weapon", "ammo": "ammo",
    "alcohol": "alcohol", "beer": "beer", "vodka": "vodka", "liquor": "liquor",
    "vape": "vape", "vapes": "vape", "medication": "medication",
    "prescription": "prescription", "pill": "pills", "pills": "pills",
    "drug": "drug", "drugs": "drug",
}

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
    category: Category
    price_per_day: Decimal = Field(gt=0, le=500, decimal_places=2)
    condition_stated: Condition = "good"
    photos: list[str] = Field(default=[], max_length=6)


class ItemChanges(BaseModel):
    """Every field is optional: send only what changed."""
    title: str | None = Field(default=None, min_length=3, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    category: Category | None = None
    price_per_day: Decimal | None = Field(default=None, gt=0, le=500, decimal_places=2)
    condition_stated: Condition | None = None
    photos: list[str] | None = Field(default=None, max_length=6)
    status: Literal["active", "paused"] | None = None


def blocked_word(*texts: str | None) -> str | None:
    """Returns the first blocked word found in the listing text, if any."""
    words = re.findall(r"[a-z]+", " ".join(t or "" for t in texts).lower())
    return next((BLOCKED_WORDS[w] for w in words if w in BLOCKED_WORDS), None)


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
        select i.id, i.owner_id, i.title, i.description, i.category,
               i.price_per_day::float as price_per_day, i.condition_stated,
               i.photos, i.status, i.created_at,
               u.name as owner_name,
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

    # Dates already taken, so the request form can warn before sending.
    item["booked"] = db.execute(
        """
        select start_date, end_date from rentals
        where item_id = %s and status in ('accepted', 'active') and end_date >= current_date
        order by start_date
        """,
        (item_id,),
    ).fetchall()
    return item


@router.post("", status_code=201)
def create_item(
    body: NewItem,
    user_id: str = Depends(registered_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    word = blocked_word(body.title, body.description)
    if word:
        raise HTTPException(400, f"Listings can't include “{word}”. See the community rules.")
    return db.execute(
        """
        insert into items (owner_id, title, description, category,
                           price_per_day, condition_stated, photos)
        values (%s, %s, %s, %s, %s, %s, %s)
        returning id
        """,
        (
            user_id,
            body.title.strip(),
            body.description.strip(),
            body.category,
            body.price_per_day,
            body.condition_stated,
            body.photos,
        ),
    ).fetchone()


@router.patch("/{item_id}")
def update_item(
    item_id: UUID,
    body: ItemChanges,
    user_id: str = Depends(registered_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    item = db.execute(
        "select owner_id, title, description from items where id = %s for update", (item_id,)
    ).fetchone()
    if item is None:
        raise HTTPException(404, "Item not found")
    if str(item["owner_id"]) != user_id:
        raise HTTPException(403, "You can only edit your own listings")

    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(400, "Nothing to change")
    word = blocked_word(changes.get("title"), changes.get("description"))
    if word:
        raise HTTPException(400, f"Listings can't include “{word}”. See the community rules.")

    # Column names come from the ItemChanges model, never from user input.
    assignments = ", ".join(f"{column} = %({column})s" for column in changes)
    return db.execute(
        f"update items set {assignments} where id = %(id)s returning id, status",
        {**changes, "id": item_id},
    ).fetchone()
