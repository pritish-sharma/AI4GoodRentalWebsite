"""FastAPI entry point. Run from /backend:  uvicorn app.main:app --reload
Interactive API docs: http://localhost:8000/docs
"""

import os

import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_db
from app.routers import items, recommendations, rentals, reviews, users

load_dotenv()

# Websites allowed to call this API from the browser. Comma-separated, e.g.
# "http://localhost:3000,https://campus-rentals.vercel.app"
ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in (os.environ.get("FRONTEND_ORIGIN") or "http://localhost:3000").split(",")
    if origin.strip()
]

app = FastAPI(title="Campus Rentals API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router)
app.include_router(rentals.router)
app.include_router(recommendations.router)
app.include_router(reviews.router)
app.include_router(users.router)


@app.get("/health")
def health():
    """Render checks this to know the server is up. No database needed."""
    return {"ok": True}


@app.get("/health/db")
def health_db(db: psycopg.Connection = Depends(get_db)):
    """Pinged every 10 minutes by .github/workflows/keep-awake.yml. Keeps the free
    Render server awake and counts as activity so Supabase doesn't pause."""
    db.execute("select 1")
    return {"ok": True, "database": "reachable"}
