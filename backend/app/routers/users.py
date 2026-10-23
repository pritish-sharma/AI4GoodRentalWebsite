import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import current_user_id
from app.db import get_db

router = APIRouter(tags=["users"])


class Profile(BaseModel):
    email: str
    name: str = Field(min_length=1, max_length=80)


@router.post("/me")
def create_or_update_profile(
    body: Profile,
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    """Call once right after sign-up so the user has a row in `users`."""
    if not body.email.lower().endswith(".edu"):
        raise HTTPException(400, "Please sign up with your .edu email")
    return db.execute(
        """
        insert into users (id, email, name) values (%s, %s, %s)
        on conflict (id) do update set name = excluded.name
        returning id, email, name
        """,
        (user_id, body.email, body.name),
    ).fetchone()


@router.get("/users/{user_id}")
def public_profile(user_id: str, db: psycopg.Connection = Depends(get_db)):
    """Public view: name and average rating. Email stays private."""
    user = db.execute(
        """
        select u.id, u.name,
               round(avg(r.stars)::numeric, 1)::float as avg_rating,
               count(r.*) as review_count
        from users u
        left join reviews r on r.target = 'user'
             and r.rental_id in (select id from rentals where renter_id = u.id
                                 union select rt.id from rentals rt
                                 join items i on i.id = rt.item_id where i.owner_id = u.id)
             and r.reviewer_id <> u.id
        where u.id = %s
        group by u.id
        """,
        (user_id,),
    ).fetchone()
    if user is None:
        raise HTTPException(404, "User not found")
    return user


class Event(BaseModel):
    item_id: str
    type: str = Field(pattern="^(view|search)$")


@router.post("/events", status_code=204)
def log_event(body: Event, db: psycopg.Connection = Depends(get_db)):
    """Anonymous view/search logging for the recommender."""
    db.execute(
        "insert into events (item_id, type) values (%s, %s)",
        (body.item_id, body.type),
    )
