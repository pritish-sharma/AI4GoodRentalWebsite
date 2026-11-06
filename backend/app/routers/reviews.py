"""Reviews after a rental is returned.

- The renter can review the item (feeds the AI quality score) and the owner.
- The owner can review the renter.
Only finished (returned) rentals can be reviewed, which keeps fake reviews out.
"""

from typing import Literal
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import registered_user_id
from app.db import get_db

router = APIRouter(prefix="/reviews", tags=["reviews"])


class NewReview(BaseModel):
    rental_id: UUID
    target: Literal["item", "user"]
    stars: int = Field(ge=1, le=5)
    text: str = Field(default="", max_length=1000)
    return_photo: str | None = Field(default=None, max_length=500)


@router.post("", status_code=201)
def create_review(
    body: NewReview,
    user_id: str = Depends(registered_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    rental = db.execute(
        """
        select r.status, r.renter_id, i.owner_id
        from rentals r join items i on i.id = r.item_id
        where r.id = %s
        """,
        (body.rental_id,),
    ).fetchone()
    if rental is None:
        raise HTTPException(404, "Rental not found")

    is_renter = str(rental["renter_id"]) == user_id
    is_owner = str(rental["owner_id"]) == user_id
    if not (is_renter or is_owner):
        raise HTTPException(403, "Not your rental")
    if rental["status"] != "returned":
        raise HTTPException(400, "You can review once the item has been returned")
    if body.target == "item" and not is_renter:
        raise HTTPException(400, "Only the renter can review the item")

    try:
        return db.execute(
            """
            insert into reviews (rental_id, reviewer_id, target, stars, text, return_photo)
            values (%s, %s, %s, %s, %s, %s)
            returning id, target, stars
            """,
            (body.rental_id, user_id, body.target, body.stars, body.text.strip(), body.return_photo),
        ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "You already left this review")
