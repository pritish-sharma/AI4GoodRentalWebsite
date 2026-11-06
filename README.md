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
3. SQL Editor → paste `supabase/accounts-and-photos.sql` → Run. This locks the tables
   against direct access and creates the `item-photos` bucket for listing photos.
4. Authentication → Sign In / Providers → Email: turn **Confirm email** off while
   developing. (Supabase's built-in email only sends a few messages an hour.)
5. Copy the **Session pooler** connection string (Connect → Direct), plus the Project URL
   and anon key (Project Settings → API Keys). Share them in a private group chat, never
   in the repo.

> Free Supabase projects pause after about a week without activity. If the backend can't
> connect, open the project in the dashboard and click **Resume project**.

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
cp .env.example .env.local         # then fill in the Supabase URL and anon key
npm run dev                        # http://localhost:3000
```

The home page should show "Trending this week" with seeded items and quality badges.
Click **Log in → Create an account** with a `.edu` email to try renting and listing.

## What works so far

| Area | Pages |
| --- | --- |
| Browse | Home with trending items, `/items` search + filters, `/items/[id]` detail |
| Accounts | `/login` sign up / log in (.edu only), `/users/[id]` public profiles |
| Renting | Request dates on an item, `/rentals` to track and cancel, reviews after return |
| Lending | `/items/new` with photo upload, `/items/[id]/edit`, `/dashboard` to accept, hand off and pause |
| AI | Trending, quality score with explanation, "Others also rented" |

The full rental loop is covered by `backend/tests/test_flow.py`. It needs a throwaway
Postgres database: `TEST_DATABASE_URL=postgresql://... pytest tests/test_flow.py`.

## How we work

- `main` always works. Never push straight to it.
- Make a branch per task: `git checkout -b feat/item-detail-page`
- Open a pull request; one teammate reviews; CI must pass before merging.
- Keep PRs small (one page, one endpoint, one feature).

## Where to start (by role)

| Role | Next task |
| --- | --- |
| Frontend | Personalized "For you" row on the home page (stretch goal in the plan) |
| Backend | Deploy: backend to Render, frontend to Vercel |
| AI / data | Pick an LLM provider and implement `_analyze_with_llm` in `review_analyzer.py` |
| Design / demo | Pick a real name and colors; run a 5-person user test |

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
