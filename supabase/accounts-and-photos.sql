-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Does NOT delete any data.
--
-- 1. Blocks direct table access with the public anon key (the backend still works).
-- 2. Creates a public "item-photos" bucket that logged-in users can upload to.

alter table users     enable row level security;
alter table items     enable row level security;
alter table rentals   enable row level security;
alter table reviews   enable row level security;
alter table events    enable row level security;
alter table ai_scores enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Each user may only upload into a folder named after their own user id.
drop policy if exists "Users upload their own item photos" on storage.objects;
create policy "Users upload their own item photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
