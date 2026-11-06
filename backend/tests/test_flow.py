"""End-to-end API test of the full rental loop against a real Postgres database.

Skipped unless TEST_DATABASE_URL points at a THROWAWAY database (it wipes tables):
    TEST_DATABASE_URL=postgresql://... pytest tests/test_flow.py
Login is faked by overriding the auth dependency, so no Supabase account is needed.
"""

import os
import uuid
from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_DB, reason="set TEST_DATABASE_URL to run")


@pytest.fixture()
def api(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DB)
    from app.auth import current_user_id
    from app.db import connect
    from app.main import app

    schema = (Path(__file__).parents[2] / "supabase" / "schema.sql").read_text()
    with connect() as conn:
        conn.execute(schema)

    who = {"id": None}
    app.dependency_overrides[current_user_id] = lambda: who["id"]
    client = TestClient(app)

    def as_user(user_id):
        who["id"] = user_id
        return client

    yield as_user
    app.dependency_overrides.clear()


def signup(as_user, name):
    user_id = str(uuid.uuid4())
    res = as_user(user_id).post("/me", json={"email": f"{name.lower()}@rutgers.edu", "name": name})
    assert res.status_code == 200, res.text
    return user_id


def test_full_rental_loop(api):
    owner = signup(api, "Olivia")
    renter = signup(api, "Raj")
    other = signup(api, "Sam")

    # Profiles need a .edu email.
    assert api(str(uuid.uuid4())).post("/me", json={"email": "a@gmail.com", "name": "A"}).status_code == 400
    # No profile yet -> clear 403, not a database error.
    assert api(str(uuid.uuid4())).post("/items", json={
        "title": "Tent", "category": "Outdoor", "price_per_day": "5"}).status_code == 403

    # Owner lists an item; blocked words and bad categories are rejected.
    item = api(owner).post("/items", json={
        "title": "2-person tent", "description": "Light and dry",
        "category": "Outdoor", "price_per_day": "8.50", "photos": []}).json()
    assert api(owner).post("/items", json={
        "title": "Hunting knife", "category": "Other", "price_per_day": "5"}).status_code == 400
    assert api(owner).post("/items", json={
        "title": "Tent", "category": "Boats", "price_per_day": "5"}).status_code == 422

    start = date.today() + timedelta(days=3)
    end = start + timedelta(days=2)
    dates = {"item_id": item["id"], "start_date": str(start), "end_date": str(end)}

    # Two people ask for overlapping dates.
    r1 = api(renter).post("/rentals", json=dates).json()
    assert r1["status"] == "requested" and r1["total_price"] == 25.5
    assert api(renter).post("/rentals", json=dates).status_code == 409  # no duplicate request
    r2 = api(other).post("/rentals", json=dates).json()

    # Owner sees both; only the owner can accept.
    incoming = api(owner).get("/rentals?role=owner").json()
    assert {r["id"] for r in incoming} == {r1["id"], r2["id"]}
    assert incoming[0]["renter_name"] in ("Raj", "Sam")
    assert api(renter).patch(f"/rentals/{r1['id']}", json={"status": "accepted"}).status_code == 400
    assert api(owner).patch(f"/rentals/{r1['id']}", json={"status": "accepted"}).json()["status"] == "accepted"

    # Accepting auto-declines the clashing request and blocks those dates.
    assert api(other).get("/rentals").json()[0]["status"] == "declined"
    assert api(other).post("/rentals", json=dates).status_code == 409
    booked = api(owner).get(f"/items/{item['id']}").json()["booked"]
    assert booked == [{"start_date": str(start), "end_date": str(end)}]

    # Can't review before it's returned.
    review = {"rental_id": r1["id"], "target": "item", "stars": 5, "text": "Like new"}
    assert api(renter).post("/reviews", json=review).status_code == 400

    api(owner).patch(f"/rentals/{r1['id']}", json={"status": "active"})
    api(owner).patch(f"/rentals/{r1['id']}", json={"status": "returned"})

    # Reviews: renter -> item and owner; owner -> renter. Each only once.
    assert api(renter).post("/reviews", json=review).status_code == 201
    assert api(renter).post("/reviews", json=review).status_code == 409
    assert api(owner).post("/reviews", json=review).status_code == 400  # owner can't review own item
    assert api(other).post("/reviews", json=review).status_code == 403
    assert api(renter).post("/reviews", json={**review, "target": "user", "stars": 4}).status_code == 201
    assert api(owner).post("/reviews", json={**review, "target": "user", "stars": 5}).status_code == 201

    mine = api(renter).get("/rentals").json()[0]
    assert sorted(mine["my_reviews"]) == ["item", "user"]

    detail = api(None).get(f"/items/{item['id']}").json()
    assert detail["reviews"][0]["reviewer_name"] == "Raj"

    owner_profile = api(None).get(f"/users/{owner}").json()
    assert owner_profile["avg_rating"] == 4.0 and owner_profile["review_count"] == 1
    assert owner_profile["reviews"][0]["as_role"] == "owner"
    assert owner_profile["rentals_completed"] == 1
    assert "email" not in owner_profile
    renter_profile = api(None).get(f"/users/{renter}").json()
    assert renter_profile["avg_rating"] == 5.0 and renter_profile["reviews"][0]["as_role"] == "renter"

    # Owner dashboard, editing and pausing.
    listing = api(owner).get("/me/items").json()[0]
    assert listing["times_rented"] == 1 and listing["pending_requests"] == 0
    assert api(renter).patch(f"/items/{item['id']}", json={"status": "paused"}).status_code == 403
    assert api(owner).patch(f"/items/{item['id']}", json={"status": "paused", "price_per_day": "9"}).status_code == 200
    assert api(None).get("/items").json() == []  # paused items leave search
    assert api(renter).post("/rentals", json={**dates, "start_date": str(end + timedelta(days=5)),
                                              "end_date": str(end + timedelta(days=6))}).status_code == 404
