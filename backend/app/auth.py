"""Checks the Supabase login token sent by the frontend.

The frontend sends `Authorization: Bearer <access_token>` from Supabase Auth.
We ask Supabase who that token belongs to, so we never handle passwords.
"""

import os
from functools import lru_cache

import psycopg
from fastapi import Depends, Header, HTTPException
from supabase import Client, create_client

from app.db import get_db


@lru_cache
def _supabase() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


def current_user_id(authorization: str = Header(default="")) -> str:
    """FastAPI dependency: `user_id: str = Depends(current_user_id)`."""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Log in first")
    try:
        user = _supabase().auth.get_user(token).user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user.id


def registered_user_id(
    user_id: str = Depends(current_user_id),
    db: psycopg.Connection = Depends(get_db),
) -> str:
    """Like current_user_id, but also requires a row in `users`.

    The frontend creates that row with POST /me right after login. Endpoints that
    store the user's id (listings, rentals, reviews) use this so they fail with a
    clear message instead of a foreign-key error.
    """
    if db.execute("select 1 from users where id = %s", (user_id,)).fetchone() is None:
        raise HTTPException(status_code=403, detail="Finish setting up your profile first")
    return user_id
