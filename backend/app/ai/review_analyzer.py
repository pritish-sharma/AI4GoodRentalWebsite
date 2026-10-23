"""Reads a review and returns the item's condition and whether it matched the listing.

`analyze_review` uses a simple keyword fallback so the project runs with no API key.
TODO (AI lead): once the group picks an LLM provider, implement `_analyze_with_llm`
with the prompt below and set LLM_API_KEY in .env. Send review text only, never names
or emails.
"""

import os
import re

CONDITIONS = ("like new", "good", "worn", "damaged")

# Fill in with LLM_PROMPT.replace("<<REVIEW>>", text). (Not .format: the JSON braces would break it.)
LLM_PROMPT = """You read reviews of items rented between students.
Return only JSON: {"condition": one of ["like new","good","worn","damaged"],
"matched_listing": true or false, "issues": [short phrases]}.

Review: \"\"\"<<REVIEW>>\"\"\""""

_DAMAGED = re.compile(r"\b(broken|broke|crack(ed)?|damaged?|doesn'?t work|didn'?t work|missing|torn|leak(s|ed|ing)?)\b", re.I)
_WORN = re.compile(r"\b(worn|scratch(es|ed)?|old|dirty|stain(s|ed)?|dies fast|loose|sticky)\b", re.I)
_LIKE_NEW = re.compile(r"\b(like new|brand new|perfect|spotless|mint|flawless)\b", re.I)
_MISMATCH = re.compile(r"\b(not as (described|pictured)|different from|misleading|wrong (item|model))\b", re.I)


def _analyze_with_keywords(text: str) -> dict:
    if _DAMAGED.search(text):
        condition = "damaged"
    elif _WORN.search(text):
        condition = "worn"
    elif _LIKE_NEW.search(text):
        condition = "like new"
    else:
        condition = "good"
    return {"condition": condition, "matched_listing": not _MISMATCH.search(text)}


def _analyze_with_llm(text: str) -> dict:
    raise NotImplementedError("Pick an LLM provider, then call it with LLM_PROMPT here.")


def analyze_review(text: str) -> dict:
    """Returns {"condition": str, "matched_listing": bool}."""
    if os.environ.get("LLM_API_KEY"):
        try:
            result = _analyze_with_llm(text)
            if result.get("condition") in CONDITIONS:
                return result
        except NotImplementedError:
            pass
    return _analyze_with_keywords(text)
