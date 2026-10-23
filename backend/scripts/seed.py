"""Loads realistic fake data so the app and the AI have something to work with.

Run from /backend:  python -m scripts.seed
WARNING: deletes everything in the app tables first. Never run against real data.
"""

import random
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.db import connect

random.seed(42)  # same data every run, so demo numbers are reproducible

N_USERS, N_ITEMS, N_RENTALS = 50, 150, 400

CATALOG = {
    "Cameras": [("Canon DSLR with 18-55mm lens", 18), ("GoPro Hero", 12), ("Ring light", 4), ("Camera tripod", 3)],
    "Outdoor": [("2-person tent", 10), ("Hiking backpack 50L", 7), ("Sleeping bag", 5), ("Camping stove", 4)],
    "Gardening": [("Cordless hedge trimmer", 8), ("Garden tool set", 4), ("Hose and sprayer", 2)],
    "Beauty": [("Hair straightener", 4), ("Curling iron", 4), ("Hair dryer", 3)],
    "Tech": [("Nintendo Switch", 12), ("Portable projector", 10), ("Bluetooth speaker", 5), ("Graphing calculator", 3)],
    "Other": [("Formal blazer", 6), ("Bike", 9), ("Air mattress", 5), ("Folding table", 3)],
}

FIRST = ["Aarav", "Maya", "Jordan", "Priya", "Ethan", "Sofia", "Liam", "Zara", "Noah", "Ava", "Ravi", "Chloe"]
LAST = ["Patel", "Kim", "Lopez", "Shah", "Nguyen", "Smith", "Garcia", "Chen", "Brown", "Singh"]

GOOD_REVIEWS = ["Worked perfectly, owner was super helpful.", "Like new, would rent again.",
                "Exactly as described.", "Great condition and easy pickup.", "Spotless, thanks!"]
OK_REVIEWS = ["Did the job. A few scratches but fine.", "Good overall, a bit old.",
              "Battery dies fast but it worked.", "Fine for a weekend."]
BAD_REVIEWS = ["Arrived broken, couldn't use it.", "Not as described, missing parts.",
               "The zipper was torn and it leaked in the rain."]


def main() -> None:
    now = datetime.now(timezone.utc)
    today = date.today()

    users = [(str(uuid.uuid4()), f"student{i}@scarletmail.rutgers.edu",
              f"{random.choice(FIRST)} {random.choice(LAST)}") for i in range(N_USERS)]
    user_ids = [u[0] for u in users]

    items = []
    item_quality = {}  # hidden "true" quality so reviews are consistent per item
    for _ in range(N_ITEMS):
        category = random.choice(list(CATALOG))
        title, base_price = random.choice(CATALOG[category])
        item_id = str(uuid.uuid4())
        price = Decimal(base_price + random.choice([0, 1, 2])).quantize(Decimal("0.01"))
        created = now - timedelta(days=random.randint(0, 90))
        items.append((item_id, random.choice(user_ids), title, f"{title} available for short rentals.",
                      category, price, random.choice(["like new", "good", "good", "worn"]), created))
        item_quality[item_id] = random.choices(["great", "ok", "bad"], weights=[6, 3, 1])[0]

    # Some items are much more popular than others, like real life.
    popularity_weight = [random.paretovariate(1.5) for _ in items]

    rentals, reviews, events = [], [], []
    booked: dict[str, list[tuple[date, date]]] = {}
    while len(rentals) < N_RENTALS:
        item = random.choices(items, weights=popularity_weight)[0]
        renter = random.choice([u for u in user_ids if u != item[1]])
        start = today - timedelta(days=random.randint(3, 80))
        end = start + timedelta(days=random.randint(0, 6))
        # One item can't be rented twice on the same day; pick again if it would.
        if any(start <= e and s <= end for s, e in booked.get(item[0], [])):
            continue
        booked.setdefault(item[0], []).append((start, end))
        rental_id = str(uuid.uuid4())
        created = datetime.combine(start, datetime.min.time(), timezone.utc) - timedelta(days=2)
        rentals.append((rental_id, item[0], renter, start, end, "returned",
                        item[5] * ((end - start).days + 1), created))

        if random.random() < 0.7:  # most people leave a review
            q = item_quality[item[0]]
            if q == "great":
                stars, text = random.choice([5, 5, 4]), random.choice(GOOD_REVIEWS)
            elif q == "ok":
                stars, text = random.choice([4, 3, 3]), random.choice(OK_REVIEWS)
            else:
                stars, text = random.choice([2, 1, 3]), random.choice(BAD_REVIEWS)
            reviews.append((str(uuid.uuid4()), rental_id, renter, "item", stars, text,
                            created + timedelta(days=(end - start).days + 3)))

    for _ in range(N_RENTALS * 4):  # page views, weighted toward popular items
        item = random.choices(items, weights=popularity_weight)[0]
        events.append((random.choice(user_ids), item[0], "view", now - timedelta(days=random.uniform(0, 30))))

    with connect() as conn:
        conn.execute("truncate ai_scores, events, reviews, rentals, items, users cascade")
        with conn.cursor() as cur:
            cur.executemany("insert into users (id, email, name) values (%s, %s, %s)", users)
            cur.executemany(
                """insert into items (id, owner_id, title, description, category,
                   price_per_day, condition_stated, created_at)
                   values (%s, %s, %s, %s, %s, %s, %s, %s)""", items)
            cur.executemany(
                """insert into rentals (id, item_id, renter_id, start_date, end_date,
                   status, total_price, created_at)
                   values (%s, %s, %s, %s, %s, %s, %s, %s)""", rentals)
            cur.executemany(
                """insert into reviews (id, rental_id, reviewer_id, target, stars, text, created_at)
                   values (%s, %s, %s, %s, %s, %s, %s)""", reviews)
            cur.executemany(
                "insert into events (user_id, item_id, type, created_at) values (%s, %s, %s, %s)",
                events)

    print(f"Seeded {len(users)} users, {len(items)} items, {len(rentals)} rentals, "
          f"{len(reviews)} reviews, {len(events)} events.")
    print("Next: python -m app.ai.nightly_job")


if __name__ == "__main__":
    main()
