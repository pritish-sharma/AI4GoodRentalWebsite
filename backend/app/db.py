"""Database connection helper.

Every request gets its own short-lived connection. Rows come back as dicts,
so `row["title"]` works. Fine for a class project; swap in a pool later if needed.
"""

import os
from collections.abc import Iterator

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()


def connect() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set. Copy .env.example to .env.")
    return psycopg.connect(url, row_factory=dict_row)


def get_db() -> Iterator[psycopg.Connection]:
    """FastAPI dependency: `db = Depends(get_db)`. Commits on success."""
    with connect() as conn:
        yield conn
