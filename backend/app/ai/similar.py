"""AI feature 3: "Others also rented".

Two items are similar if the same people rented or requested both
(cosine similarity on the user x item matrix). Items with no history fall back
to text similarity (TF-IDF on title + description) within the same category.
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

TOP_K = 5


def _top_k(sim: np.ndarray, ids: list[str], k: int) -> dict[str, list[str]]:
    np.fill_diagonal(sim, -1.0)  # an item isn't similar to itself
    out = {}
    for row, item_id in enumerate(ids):
        best = np.argsort(-sim[row])[:k]
        out[item_id] = [ids[j] for j in best if sim[row, j] > 0]
    return out


def similar_by_behavior(interactions: pd.DataFrame, k: int = TOP_K) -> dict[str, list[str]]:
    """interactions: columns user_id, item_id (one row per rental or request)."""
    if interactions.empty:
        return {}
    matrix = pd.crosstab(interactions["user_id"], interactions["item_id"]).clip(upper=1)
    ids = [str(i) for i in matrix.columns]
    sim = cosine_similarity(matrix.T.to_numpy())
    return _top_k(sim, ids, k)


def similar_by_text(items: pd.DataFrame, k: int = TOP_K) -> dict[str, list[str]]:
    """items: columns id, title, description, category. Only matches within a category."""
    if items.empty:
        return {}
    text = (items["title"] + " " + items["description"].fillna("")).tolist()
    tfidf = TfidfVectorizer(stop_words="english").fit_transform(text)
    sim = cosine_similarity(tfidf)
    same_cat = items["category"].to_numpy()[:, None] == items["category"].to_numpy()[None, :]
    sim = np.where(same_cat, sim, 0.0)
    return _top_k(sim, [str(i) for i in items["id"]], k)


def similar_items(interactions: pd.DataFrame, items: pd.DataFrame, k: int = TOP_K) -> dict[str, list[str]]:
    """Behavior-based where we have it, text-based to fill the gaps."""
    by_text = similar_by_text(items, k)
    by_behavior = similar_by_behavior(interactions, k)
    result = {}
    for item_id in (str(i) for i in items["id"]):
        picks = list(by_behavior.get(item_id, []))
        for other in by_text.get(item_id, []):
            if len(picks) >= k:
                break
            if other not in picks:
                picks.append(other)
        result[item_id] = picks
    return result
