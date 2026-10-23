"""Business rules for rentals. Pure functions, no database, easy to test."""

from datetime import date
from decimal import Decimal

# Which statuses each status can move to, and who may make the move.
TRANSITIONS: dict[str, dict[str, str]] = {
    "requested": {"accepted": "owner", "declined": "owner", "cancelled": "renter"},
    "accepted": {"active": "owner", "cancelled": "renter"},
    "active": {"returned": "owner"},
    "declined": {},
    "returned": {},
    "cancelled": {},
}

# Rentals in these statuses block the item's calendar.
BLOCKING_STATUSES = ("accepted", "active")

MAX_RENTAL_DAYS = 30


def dates_overlap(start_a: date, end_a: date, start_b: date, end_b: date) -> bool:
    """True if two inclusive date ranges share at least one day."""
    return start_a <= end_b and start_b <= end_a


def validate_dates(start: date, end: date, today: date) -> str | None:
    """Returns an error message, or None if the dates are fine."""
    if start < today:
        return "Start date is in the past"
    if end < start:
        return "End date is before start date"
    if (end - start).days + 1 > MAX_RENTAL_DAYS:
        return f"Rentals can be at most {MAX_RENTAL_DAYS} days"
    return None


def rental_days(start: date, end: date) -> int:
    """Both days count: Fri to Sun is 3 days."""
    return (end - start).days + 1


def total_price(price_per_day: Decimal, start: date, end: date) -> Decimal:
    return (price_per_day * rental_days(start, end)).quantize(Decimal("0.01"))


def can_transition(current: str, new: str, actor: str) -> bool:
    """actor is 'owner' or 'renter'."""
    return TRANSITIONS.get(current, {}).get(new) == actor
