"""AI-powered endpoints. Scores are precomputed by app/ai/nightly_job.py,
so these are fast lookups, not live model calls."""

import psycopg
from fastapi import APIRouter, Depends

from app.db import get_db
from app.routers.items import ITEM_CARD_SQL

router = APIRouter(prefix="/recommendations", tags=["ai"])


@router.get("/popular")
def popular_items(
    category: str | None = None,
    limit: int = 10,
    db: psycopg.Connection = Depends(get_db),
):
    return db.execute(
        ITEM_CARD_SQL
        + """
        where i.status = 'active'
          and (%(category)s::text is null or i.category = %(category)s)
        order by coalesce(s.popularity_score, 0) desc
        limit %(limit)s
        """,
        {"category": category, "limit": min(limit, 50)},
    ).fetchall()


@router.get("/similar/{item_id}")
def similar_items(item_id: str, db: psycopg.Connection = Depends(get_db)):
    return db.execute(
        ITEM_CARD_SQL
        + """
        join ai_scores src on src.item_id = %s
        where i.id = any(src.similar_item_ids) and i.status = 'active'
        """,
        (item_id,),
    ).fetchall()
