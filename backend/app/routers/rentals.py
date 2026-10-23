from datetime import date
from typing import Literal

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import rental_rules
from app.auth import current_user_id
from app.db import get_db

router = APIRouter(prefix="/rentals", tags=["rentals"])


class RentalRequest(BaseModel):
    item_id: str
    start_date: date
    end_date: date


class StatusChange(BaseModel):
    status: Literal["accepted", "declined", "active", "returned", "cancelled"]


@router.post("", status_code=201)
def request_rental(
    body: RentalRequest,
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    error = rental_rules.validate_dates(body.start_date, body.end_date, date.today())
    if error:
        raise HTTPException(400, error)

    # "for update" locks the item row so two requests can't double-book at once.
    item = db.execute(
        "select id, owner_id, price_per_day, status from items where id = %s for update",
        (body.item_id,),
    ).fetchone()
    if item is None or item["status"] != "active":
        raise HTTPException(404, "Item not available")
    if str(item["owner_id"]) == user_id:
        raise HTTPException(400, "You can't rent your own item")

    booked = db.execute(
        "select start_date, end_date from rentals where item_id = %s and status = any(%s)",
        (body.item_id, list(rental_rules.BLOCKING_STATUSES)),
    ).fetchall()
    for b in booked:
        if rental_rules.dates_overlap(
            body.start_date, body.end_date, b["start_date"], b["end_date"]
        ):
            raise HTTPException(409, "Those dates are already booked")

    price = rental_rules.total_price(item["price_per_day"], body.start_date, body.end_date)
    rental = db.execute(
        """
        insert into rentals (item_id, renter_id, start_date, end_date, total_price)
        values (%s, %s, %s, %s, %s) returning *
        """,
        (body.item_id, user_id, body.start_date, body.end_date, price),
    ).fetchone()
    db.execute(
        "insert into events (user_id, item_id, type) values (%s, %s, 'request')",
        (user_id, body.item_id),
    )
    return rental


@router.patch("/{rental_id}")
def change_status(
    rental_id: str,
    body: StatusChange,
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    rental = db.execute(
        """
        select r.*, i.owner_id from rentals r
        join items i on i.id = r.item_id
        where r.id = %s for update of r
        """,
        (rental_id,),
    ).fetchone()
    if rental is None:
        raise HTTPException(404, "Rental not found")

    if str(rental["owner_id"]) == user_id:
        actor = "owner"
    elif str(rental["renter_id"]) == user_id:
        actor = "renter"
    else:
        raise HTTPException(403, "Not your rental")

    if not rental_rules.can_transition(rental["status"], body.status, actor):
        raise HTTPException(
            400, f"Can't change from {rental['status']} to {body.status} as the {actor}"
        )

    # Accepting must not create an overlap with another accepted rental.
    if body.status == "accepted":
        clash = db.execute(
            """
            select 1 from rentals
            where item_id = %s and id <> %s and status = any(%s)
              and start_date <= %s and %s <= end_date
            """,
            (
                rental["item_id"],
                rental_id,
                list(rental_rules.BLOCKING_STATUSES),
                rental["end_date"],
                rental["start_date"],
            ),
        ).fetchone()
        if clash:
            raise HTTPException(409, "Another rental already holds those dates")

    return db.execute(
        "update rentals set status = %s where id = %s returning *",
        (body.status, rental_id),
    ).fetchone()


@router.get("")
def my_rentals(
    role: Literal["renter", "owner"] = "renter",
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
):
    who = "r.renter_id" if role == "renter" else "i.owner_id"
    return db.execute(
        f"""
        select r.*, i.title as item_title
        from rentals r join items i on i.id = r.item_id
        where {who} = %s
        order by r.start_date desc
        """,
        (user_id,),
    ).fetchall()
