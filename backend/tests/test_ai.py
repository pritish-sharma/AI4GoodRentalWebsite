from datetime import datetime, timedelta, timezone

import pandas as pd

from app.ai.popularity import popularity_scores
from app.ai.quality import bayesian_rating, quality_score
from app.ai.review_analyzer import analyze_review
from app.ai.similar import similar_by_behavior, similar_items

NOW = datetime(2026, 11, 1, tzinfo=timezone.utc)
OLD = NOW - timedelta(days=60)


# ---------- popularity ----------

def test_recent_activity_beats_old_activity():
    items = pd.DataFrame({"id": ["a", "b"], "created_at": [OLD, OLD]})
    events = pd.DataFrame({
        "item_id": ["a", "b"],
        "type": ["request", "request"],
        "created_at": [NOW - timedelta(days=1), NOW - timedelta(days=21)],
    })
    scores = popularity_scores(events, items, NOW)
    assert scores["a"] > scores["b"]
    # three half-lives old -> about 1/8 of the weight
    assert abs(scores["b"] - 5 * 0.5 ** 3) < 1e-9


def test_new_items_get_a_boost_and_every_item_gets_a_score():
    items = pd.DataFrame({"id": ["old", "new"], "created_at": [OLD, NOW - timedelta(days=1)]})
    scores = popularity_scores(pd.DataFrame(columns=["item_id", "type", "created_at"]), items, NOW)
    assert scores["new"] > scores["old"] == 0


# ---------- quality ----------

def test_bayesian_rating_pulls_single_review_toward_mean():
    assert bayesian_rating([5], site_mean=4.0) < 4.5
    assert bayesian_rating([5] * 50, site_mean=4.0) > 4.8


def test_too_few_reviews_means_not_rated():
    assert quality_score([5], [], 1, 0, 4.0) == (None, None)


def test_damaged_items_score_lower():
    good, _ = quality_score([5, 5, 4], ["like new", "good"], 3, 0, 4.0)
    bad, label = quality_score([2, 1, 3], ["damaged", "damaged"], 3, 2, 4.0)
    assert good > bad
    assert label in ("Fair", "Needs care")


# ---------- review analyzer (keyword fallback) ----------

def test_review_analyzer_keywords():
    assert analyze_review("Arrived broken")["condition"] == "damaged"
    assert analyze_review("A few scratches but fine")["condition"] == "worn"
    assert analyze_review("Like new, great owner")["condition"] == "like new"
    assert analyze_review("Not as described")["matched_listing"] is False


# ---------- similar items ----------

def test_items_rented_by_same_people_are_similar():
    inter = pd.DataFrame({
        "user_id": ["u1", "u1", "u2", "u2", "u3"],
        "item_id": ["tent", "stove", "tent", "stove", "camera"],
    })
    sims = similar_by_behavior(inter)
    assert sims["tent"][0] == "stove"
    assert "camera" not in sims["tent"]


def test_text_fallback_for_items_without_history():
    items = pd.DataFrame({
        "id": ["t1", "t2", "c1"],
        "title": ["2-person tent", "4-person tent", "Canon DSLR"],
        "description": ["camping tent", "big camping tent", "camera"],
        "category": ["Outdoor", "Outdoor", "Cameras"],
    })
    sims = similar_items(pd.DataFrame(columns=["user_id", "item_id"]), items)
    assert sims["t1"] == ["t2"]
    assert sims["c1"] == []
