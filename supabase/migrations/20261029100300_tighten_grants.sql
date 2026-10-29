-- Security audit L-1: give the API roles only the table rights the app and website use.
-- Supabase grants anon and authenticated every right on new public tables (including TRUNCATE,
-- which row-level security doesn't cover). Row-level security still decides which rows; this
-- removes the rights nobody needs, as a second wall.
--
--   anon (phones, signed-out website): read hymns and pages.
--   authenticated (signed-in website): read; add and change hymns and pages (RLS limits it to
--   editors); read its own editors row; read history (RLS limits it to editors).
--
-- Also indexes the updated_by foreign keys (Performance Advisor).
--
-- Run once in the Supabase SQL editor after 20261029100100_edit_history_and_policies.sql. Safe to re-run.
--
-- Rollback:
--   grant all on public.hymns, public.pages, public.editors to anon, authenticated;
--   grant execute on function public.touch() to anon, authenticated;
--   drop index if exists public.hymns_updated_by_idx, public.pages_updated_by_idx;

revoke all on public.hymns, public.pages, public.editors from anon, authenticated;
grant select on public.hymns, public.pages to anon, authenticated;
grant insert, update on public.hymns, public.pages to authenticated;
grant select on public.editors to authenticated;

-- A trigger function: never called through the API. Triggers keep working without this grant.
revoke execute on function public.touch() from public, anon, authenticated;

create index if not exists hymns_updated_by_idx on public.hymns (updated_by);
create index if not exists pages_updated_by_idx on public.pages (updated_by);
