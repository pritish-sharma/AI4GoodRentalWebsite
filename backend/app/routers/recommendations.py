"""AI-powered endpoints. Scores are precomputed by app/ai/nightly_job.py,
so these are fast lookups, not live model calls."""

from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, Query

from app.db import get_db
from app.routers.items import ITEM_CARD_SQL

router = APIRouter(prefix="/recommendations", tags=["ai"])


@router.get("/popular")
def popular_items(
    category: str | None = None,
    limit: int = Query(default=10, ge=1, le=50),
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
        {"category": category, "limit": limit},
    ).fetchall()


@router.get("/similar/{item_id}")
def similar_items(item_id: UUID, db: psycopg.Connection = Depends(get_db)):
    """'Others also rented', most similar first."""
    return db.execute(
        ITEM_CARD_SQL
        + """
        join ai_scores src on src.item_id = %s
        where i.id = any(src.similar_item_ids) and i.status = 'active'
        order by array_position(src.similar_item_ids, i.id)
        """,
        (item_id,),
    ).fetchall()
