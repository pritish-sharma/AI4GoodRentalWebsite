"""AI feature 1: "Trending this week".

popularity(item) = sum over events of  weight(type) * 0.5 ** (age_days / HALF_LIFE_DAYS)

Each view/request/rental adds weight; older activity fades by half every week.
New listings get a small boost so new owners aren't invisible (our fairness angle).
"""

from datetime import datetime

import pandas as pd

WEIGHTS = {"view": 1.0, "search": 0.5, "request": 5.0, "rental": 10.0}
HALF_LIFE_DAYS = 7.0
NEW_ITEM_DAYS = 7
NEW_ITEM_BOOST = 3.0


def popularity_scores(
    events: pd.DataFrame, items: pd.DataFrame, now: datetime
) -> pd.Series:
    """
    events: columns item_id, type, created_at
    items:  columns id, created_at
    Returns a Series indexed by item id (every item gets a score, even 0).
    """
    scores = pd.Series(0.0, index=items["id"], dtype=float)

    if not events.empty:
        age_days = (now - pd.to_datetime(events["created_at"], utc=True)).dt.total_seconds() / 86400
        weight = events["type"].map(WEIGHTS).fillna(0.0)
        decayed = weight * 0.5 ** (age_days.clip(lower=0) / HALF_LIFE_DAYS)
        per_item = decayed.groupby(events["item_id"]).sum()
        scores = scores.add(per_item, fill_value=0.0).reindex(items["id"], fill_value=0.0)

    item_age = (now - pd.to_datetime(items["created_at"], utc=True)).dt.total_seconds() / 86400
    is_new = pd.Series((item_age < NEW_ITEM_DAYS).to_numpy(), index=items["id"])
    scores[is_new] += NEW_ITEM_BOOST
    return scores
