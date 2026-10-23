# Campus Rentals (AI4GOOD)

Rent items for a few days from students who aren't using them. AI surfaces trending
items, scores item quality from reviews, and suggests similar items.

> "Campus Rentals" is a placeholder name. Rename it everywhere once the group picks one.

## What's in here

```
frontend/   Next.js + Tailwind web app (home page with "Trending this week" works)
backend/    FastAPI API, rental rules, and the AI code
  app/routers/        API endpoints: items, rentals, recommendations, users
  app/rental_rules.py double-booking check and status rules
  app/ai/             popularity.py, quality.py, similar.py, review_analyzer.py, nightly_job.py
  scripts/seed.py     fake demo data (50 users, 150 items, 400 rentals)
  tests/              pytest tests
supabase/schema.sql   database tables
.github/workflows/    CI on every PR + nightly AI scoring job
```

## First-time setup (each teammate)

You need Node.js 20+, Python 3.11+, and Git.

**1. Database (one person does this once, then shares the keys privately)**

1. Create a free project at supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Copy the connection string (Project Settings → Database) and the URL + anon key
   (Project Settings → API). Share them in a private group chat, never in the repo.

**2. Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then fill in the values
python -m scripts.seed             # load demo data (wipes app tables!)
python -m app.ai.nightly_job       # compute AI scores
uvicorn app.main:app --reload      # http://localhost:8000/docs
pytest                             # run the tests
```

**3. Frontend**

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                        # http://localhost:3000
```

The home page should show "Trending this week" with seeded items and quality badges.

## How we work

- `main` always works. Never push straight to it.
- Make a branch per task: `git checkout -b feat/item-detail-page`
- Open a pull request; one teammate reviews; CI must pass before merging.
- Keep PRs small (one page, one endpoint, one feature).

## Where to start (by role)

| Role | First task |
| --- | --- |
| Frontend | Build `/items/[id]` (item detail) using `ItemCard` and `QualityBadge` as patterns |
| Backend | Add `POST /reviews` (only after a rental is `returned`), with a test |
| AI / data | Pick an LLM provider and implement `_analyze_with_llm` in `review_analyzer.py` |
| Design / demo | Wireframes for item detail and new listing; agree colors and fonts |

## The AI, in one paragraph each

- **Trending:** each view (1), request (5), and completed rental (10) adds points that halve
  every 7 days. New listings get a small boost so new owners aren't invisible.
- **Quality score:** 60% smoothed star rating (Bayesian average), 25% item condition read from
  review text, 15% reliability (rentals finished without problems). Items with under 2 reviews
  show "New, not yet rated".
- **Others also rented:** items rented by the same people (cosine similarity), falling back to
  text similarity of titles and descriptions for brand-new items.

## Nightly job on GitHub

Add `DATABASE_URL` (and optionally `LLM_API_KEY`) under Settings → Secrets and variables →
Actions. The job then runs every night, and you can run it by hand from the Actions tab.
