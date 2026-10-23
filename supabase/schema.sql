-- Rental platform database schema.
-- Paste into Supabase: Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: drops and recreates the app tables (NOT auth.users).

drop table if exists ai_scores, events, reviews, rentals, items, users cascade;

-- One row per person. id matches the Supabase Auth user id.
create table users (
  id          uuid primary key,
  email       text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table items (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references users(id) on delete cascade,
  title            text not null,
  description      text not null default '',
  category         text not null,
  price_per_day    numeric(8,2) not null check (price_per_day >= 0),
  condition_stated text not null default 'good'
                   check (condition_stated in ('like new','good','worn')),
  photos           text[] not null default '{}',
  status           text not null default 'active' check (status in ('active','paused')),
  created_at       timestamptz not null default now()
);

create table rentals (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references items(id) on delete cascade,
  renter_id    uuid not null references users(id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  status       text not null default 'requested'
               check (status in ('requested','accepted','declined','active','returned','cancelled')),
  total_price  numeric(8,2) not null,
  created_at   timestamptz not null default now(),
  check (end_date >= start_date)
);

create table reviews (
  id            uuid primary key default gen_random_uuid(),
  rental_id     uuid not null references rentals(id) on delete cascade,
  reviewer_id   uuid not null references users(id) on delete cascade,
  target        text not null check (target in ('item','user')),
  stars         int  not null check (stars between 1 and 5),
  text          text not null default '',
  return_photo  text,
  -- Filled in by the nightly AI job after reading the review text.
  ai_condition  text check (ai_condition in ('like new','good','worn','damaged')),
  ai_matched_listing boolean,
  created_at    timestamptz not null default now(),
  unique (rental_id, reviewer_id, target)
);

-- Raw signals for the recommender: views, searches, requests.
create table events (
  id          bigint generated always as identity primary key,
  user_id     uuid references users(id) on delete set null,
  item_id     uuid references items(id) on delete cascade,
  type        text not null check (type in ('view','search','request')),
  created_at  timestamptz not null default now()
);

-- Written by the nightly AI job; read by the API.
create table ai_scores (
  item_id           uuid primary key references items(id) on delete cascade,
  popularity_score  double precision not null default 0,
  quality_score     double precision,
  quality_label     text,
  similar_item_ids  uuid[] not null default '{}',
  updated_at        timestamptz not null default now()
);

create index on items (category) where status = 'active';
create index on rentals (item_id, status);
create index on events (item_id, created_at);
