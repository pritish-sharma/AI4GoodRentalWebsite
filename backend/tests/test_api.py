from fastapi.testclient import TestClient

from app.db import get_db
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


def test_blocked_words_in_listings():
    from app.routers.items import blocked_word

    assert blocked_word("Hunting knife", "") == "knife"
    assert blocked_word("Camping stove", "Uses butane, comes with case") is None
    assert blocked_word("Beer pong table", None) == "beer"
    assert blocked_word("Pocket knives set") == "knife"
    assert blocked_word("Speaker", "no drugs, please!") == "drug"
    assert blocked_word("Druggist scale") is None  # whole words only


def test_malformed_item_id_is_a_clean_422():
    # No database needed: the bad id is rejected before any query runs.
    app.dependency_overrides[get_db] = lambda: None
    try:
        assert client.get("/items/not-a-real-id").status_code == 422
        assert client.get("/recommendations/similar/not-a-real-id").status_code == 422
        assert client.get("/recommendations/popular?limit=0").status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_cors_allows_only_listed_sites():
    def preflight(origin):
        return client.options("/items", headers={
            "Origin": origin, "Access-Control-Request-Method": "GET"})

    assert preflight("http://localhost:3000").headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-origin" not in preflight("https://evil.example.com").headers


def test_frontend_origin_accepts_a_comma_separated_list(monkeypatch):
    import importlib

    import app.main

    monkeypatch.setenv("FRONTEND_ORIGIN", "http://localhost:3000, https://campus.vercel.app/")
    try:
        assert importlib.reload(app.main).ALLOWED_ORIGINS == [
            "http://localhost:3000", "https://campus.vercel.app"]
    finally:
        monkeypatch.delenv("FRONTEND_ORIGIN")
        importlib.reload(app.main)
