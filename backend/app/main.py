"""FastAPI entry point. Run from /backend:  uvicorn app.main:app --reload
Interactive API docs: http://localhost:8000/docs
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import items, recommendations, rentals, reviews, users

load_dotenv()

app = FastAPI(title="Campus Rentals API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")],
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
    return {"ok": True}
