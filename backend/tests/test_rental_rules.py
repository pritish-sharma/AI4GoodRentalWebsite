from datetime import date
from decimal import Decimal

from app.rental_rules import (
    can_transition,
    dates_overlap,
    rental_days,
    total_price,
    validate_dates,
)

D = date.fromisoformat


def test_overlap_when_ranges_share_a_day():
    assert dates_overlap(D("2026-11-01"), D("2026-11-03"), D("2026-11-03"), D("2026-11-05"))


def test_no_overlap_back_to_back():
    assert not dates_overlap(D("2026-11-01"), D("2026-11-02"), D("2026-11-03"), D("2026-11-04"))


def test_overlap_when_one_range_inside_another():
    assert dates_overlap(D("2026-11-01"), D("2026-11-10"), D("2026-11-04"), D("2026-11-05"))


def test_rental_days_counts_both_ends():
    assert rental_days(D("2026-11-06"), D("2026-11-08")) == 3


def test_total_price():
    assert total_price(Decimal("12.50"), D("2026-11-06"), D("2026-11-08")) == Decimal("37.50")


def test_validate_dates():
    today = D("2026-11-01")
    assert validate_dates(D("2026-10-31"), D("2026-11-02"), today) == "Start date is in the past"
    assert validate_dates(D("2026-11-05"), D("2026-11-04"), today) == "End date is before start date"
    assert validate_dates(D("2026-11-02"), D("2026-12-15"), today) is not None
    assert validate_dates(D("2026-11-02"), D("2026-11-04"), today) is None


def test_only_owner_accepts_and_only_renter_cancels():
    assert can_transition("requested", "accepted", "owner")
    assert not can_transition("requested", "accepted", "renter")
    assert can_transition("requested", "cancelled", "renter")
    assert not can_transition("requested", "cancelled", "owner")


def test_finished_rentals_cannot_change():
    assert not can_transition("returned", "active", "owner")
    assert not can_transition("declined", "accepted", "owner")
