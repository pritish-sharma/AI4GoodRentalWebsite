from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"ok": True}


def test_protected_routes_need_login():
    # No token -> 401 before any database work happens.
    res = client.post("/rentals", json={
        "item_id": "x", "start_date": "2030-01-01", "end_date": "2030-01-02",
    })
    assert res.status_code == 401
