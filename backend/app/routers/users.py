from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import current_user_id
from app.db import get_db
from app.routers.items import ITEM_CARD_SQL

router = APIRouter(tags=["users"])

# Reviews written about a person: their renters review them as an owner,
# and owners review them as a renter.
REVIEWS_ABOUT_USER_SQL = """
    select v.stars, v.text, v.created_at, author.name as reviewer_name,
           case when rt.renter_id = %(id)s then 'renter' else 'owner' end as as_role
    from reviews v
    join rentals rt on rt.id = v.rental_id
    join items i on i.id = rt.item_id
    join users author on author.id = v.reviewer_id
    where v.target = 'user' and v.reviewer_id <> %(id)s
      and (rt.renter_id = %(id)s or i.owner_id = %(id)s)
"""


class Profile(BaseModel):
    email: str = Field(max_length=200)
    name: str = Field(min_length=1, max_length=80)


@router.post("/me")
def create_or_update_profile(
    body: Profile,
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    """The frontend calls this after every login, so a `users` row always exists."""
    if not body.email.strip().lower().endswith(".edu"):
        raise HTTPException(400, "Please sign up with your .edu email")
    return db.execute(
        """
        insert into users (id, email, name) values (%s, %s, %s)
        on conflict (id) do update set name = excluded.name
        returning id, email, name
        """,
        (user_id, body.email.strip().lower(), body.name.strip()),
    ).fetchone()


@router.get("/me/items")
def my_listings(
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    """My listings, including paused ones, with how many requests are waiting."""
    return db.execute(
        """
        select i.id, i.title, i.category, i.price_per_day::float as price_per_day,
               i.photos[1] as photo_url, i.status, i.created_at,
               s.quality_score, s.quality_label,
               (select count(*) from rentals r
                where r.item_id = i.id and r.status = 'requested') as pending_requests,
               (select count(*) from rentals r
                where r.item_id = i.id and r.status = 'returned') as times_rented
        from items i
        left join ai_scores s on s.item_id = i.id
        where i.owner_id = %s
        order by i.created_at desc
        """,
        (user_id,),
    ).fetchall()


@router.get("/users/{user_id}")
def public_profile(user_id: UUID, db: psycopg.Connection = Depends(get_db)):
    """Public view: name, ratings, listings and reviews. Email stays private."""
    user = db.execute(
        "select id, name, created_at from users where id = %s", (user_id,)
    ).fetchone()
    if user is None:
        raise HTTPException(404, "User not found")

    params = {"id": user_id}
    reviews = db.execute(
        REVIEWS_ABOUT_USER_SQL + " order by v.created_at desc limit 20", params
    ).fetchall()
    stats = db.execute(
        f"""
        select round(avg(stars)::numeric, 1)::float as avg_rating, count(*) as review_count
        from ({REVIEWS_ABOUT_USER_SQL}) all_reviews
        """,
        params,
    ).fetchone()
    user["avg_rating"] = stats["avg_rating"]
    user["review_count"] = stats["review_count"]
    user["reviews"] = reviews
    user["listings"] = db.execute(
        ITEM_CARD_SQL + " where i.owner_id = %(id)s and i.status = 'active' order by i.created_at desc",
        params,
    ).fetchall()
    user["rentals_completed"] = db.execute(
        """
        select count(*) as n from rentals r join items i on i.id = r.item_id
        where r.status = 'returned' and (r.renter_id = %(id)s or i.owner_id = %(id)s)
        """,
        params,
    ).fetchone()["n"]
    return user


class Event(BaseModel):
    item_id: UUID
    type: str = Field(pattern="^(view|search)$")


@router.post("/events", status_code=204)
def log_event(body: Event, db: psycopg.Connection = Depends(get_db)):
    """Anonymous view/search logging for the recommender."""
    db.execute(
        "insert into events (item_id, type) values (%s, %s)",
        (body.item_id, body.type),
    )
