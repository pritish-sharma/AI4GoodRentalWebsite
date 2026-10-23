"""Checks the Supabase login token sent by the frontend.

The frontend sends `Authorization: Bearer <access_token>` from Supabase Auth.
We ask Supabase who that token belongs to, so we never handle passwords.
"""

import os
from functools import lru_cache

from fastapi import Header, HTTPException
from supabase import Client, create_client


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
