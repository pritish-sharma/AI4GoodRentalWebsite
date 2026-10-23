"""Recomputes all AI scores and writes them to the ai_scores table.

Run from /backend:  python -m app.ai.nightly_job
Runs every night on GitHub Actions (.github/workflows/nightly-ai.yml).
"""

from datetime import datetime, timezone

import pandas as pd

from app.ai.popularity import popularity_scores
from app.ai.quality import quality_score
from app.ai.review_analyzer import analyze_review
from app.ai.similar import similar_items
from app.db import connect


def _frame(conn, sql: str, columns: list[str]) -> pd.DataFrame:
    rows = conn.execute(sql).fetchall()
    return pd.DataFrame(rows, columns=columns)


def analyze_new_reviews(conn) -> int:
    """Run the review analyzer on item reviews it hasn't seen yet."""
    pending = conn.execute(
        "select id, text from reviews where target = 'item' and ai_condition is null"
    ).fetchall()
    for r in pending:
        result = analyze_review(r["text"])
        conn.execute(
            "update reviews set ai_condition = %s, ai_matched_listing = %s where id = %s",
            (result["condition"], result["matched_listing"], r["id"]),
        )
    return len(pending)


def run() -> None:
    now = datetime.now(timezone.utc)
    with connect() as conn:
        n_reviews = analyze_new_reviews(conn)

        items = _frame(
            conn,
            "select id::text as id, title, description, category, created_at from items",
            ["id", "title", "description", "category", "created_at"],
        )
        if items.empty:
            print("No items yet; nothing to score.")
            return

        events = _frame(
            conn,
            """
            select item_id::text as item_id, type, created_at from events
            union all
            select item_id::text, 'rental', created_at from rentals where status = 'returned'
            """,
            ["item_id", "type", "created_at"],
        )
        interactions = _frame(
            conn,
            "select renter_id::text as user_id, item_id::text as item_id from rentals",
            ["user_id", "item_id"],
        )
        reviews = _frame(
            conn,
            """
            select rt.item_id::text as item_id, r.stars, r.ai_condition
            from reviews r join rentals rt on rt.id = r.rental_id
            where r.target = 'item'
            """,
            ["item_id", "stars", "ai_condition"],
        )
        outcomes = _frame(
            conn,
            """
            select rt.item_id::text as item_id,
                   count(*) filter (where rt.status = 'returned') as completed,
                   count(*) filter (where r.ai_condition = 'damaged'
                                     or r.ai_matched_listing = false) as problems
            from rentals rt
            left join reviews r on r.rental_id = rt.id and r.target = 'item'
            group by rt.item_id
            """,
            ["item_id", "completed", "problems"],
        ).set_index("item_id")

        popularity = popularity_scores(events, items, now)
        similar = similar_items(interactions, items)
        site_mean = float(reviews["stars"].mean()) if not reviews.empty else 4.0
        by_item = reviews.groupby("item_id")

        for item_id in items["id"]:
            if item_id in by_item.groups:
                group = by_item.get_group(item_id)
                stars = group["stars"].astype(int).tolist()
                conditions = group["ai_condition"].dropna().tolist()
            else:
                stars, conditions = [], []
            completed = int(outcomes["completed"].get(item_id, 0))
            problems = int(outcomes["problems"].get(item_id, 0))
            score, label = quality_score(stars, conditions, completed, problems, site_mean)

            conn.execute(
                """
                insert into ai_scores (item_id, popularity_score, quality_score,
                                       quality_label, similar_item_ids, updated_at)
                values (%s, %s, %s, %s, %s::uuid[], now())
                on conflict (item_id) do update set
                    popularity_score = excluded.popularity_score,
                    quality_score    = excluded.quality_score,
                    quality_label    = excluded.quality_label,
                    similar_item_ids = excluded.similar_item_ids,
                    updated_at       = now()
                """,
                (item_id, float(popularity[item_id]), score, label, similar.get(item_id, [])),
            )

    print(f"Scored {len(items)} items, analyzed {n_reviews} new reviews.")


if __name__ == "__main__":
    run()
