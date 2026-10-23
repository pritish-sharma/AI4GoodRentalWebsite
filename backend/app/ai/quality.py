"""AI feature 2: item quality score (1-5) and label.

score = 0.60 * smoothed star rating
      + 0.25 * condition score from review text (LLM or keyword fallback)
      + 0.15 * reliability (share of rentals finished without problems, on a 1-5 scale)

The weights are a first guess. Tune them on the seed data and explain them in the demo.
"""

C_PRIOR_REVIEWS = 5        # "phantom" reviews at the site-wide average
MIN_REVIEWS_TO_SCORE = 2   # fewer than this -> "New, not yet rated"

W_RATING, W_CONDITION, W_RELIABILITY = 0.60, 0.25, 0.15

CONDITION_POINTS = {"like new": 5.0, "good": 4.0, "worn": 2.5, "damaged": 1.0}


def bayesian_rating(stars: list[int], site_mean: float, c: int = C_PRIOR_REVIEWS) -> float:
    """Pulls items with few reviews toward the site average:  (C*m + sum) / (C + n)."""
    return (c * site_mean + sum(stars)) / (c + len(stars))


def condition_score(conditions: list[str]) -> float | None:
    """Average of the per-review condition labels, on a 1-5 scale."""
    points = [CONDITION_POINTS[c] for c in conditions if c in CONDITION_POINTS]
    return sum(points) / len(points) if points else None


def reliability_score(completed: int, problems: int) -> float:
    """Share of finished rentals with no problem reported, mapped to 1-5."""
    if completed == 0:
        return 4.0  # neutral until we know more
    ok_share = max(completed - problems, 0) / completed
    return 1.0 + 4.0 * ok_share


def label_for(score: float) -> str:
    if score >= 4.5:
        return "Excellent"
    if score >= 3.5:
        return "Good"
    if score >= 2.5:
        return "Fair"
    return "Needs care"


def quality_score(
    stars: list[int],
    conditions: list[str],
    completed: int,
    problems: int,
    site_mean: float,
) -> tuple[float | None, str | None]:
    """Returns (score, label), or (None, None) if there aren't enough reviews yet."""
    if len(stars) < MIN_REVIEWS_TO_SCORE:
        return None, None

    rating = bayesian_rating(stars, site_mean)
    cond = condition_score(conditions)
    if cond is None:
        cond = rating  # no text analysis yet: lean on the stars
    rel = reliability_score(completed, problems)

    score = W_RATING * rating + W_CONDITION * cond + W_RELIABILITY * rel
    score = round(min(max(score, 1.0), 5.0), 2)
    return score, label_for(score)
