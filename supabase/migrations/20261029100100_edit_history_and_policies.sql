-- Security audit M-1 and L-2: keep a history of every change, and stop hymns being deleted.
--
-- * content_revisions records who changed which hymn or page, when, and the row before and after.
--   Only editors can read it; nobody can change it through the API.
--   To undo an edit, find the revision in Table Editor and copy old_row back.
-- * The old "for all" write policies are replaced by separate insert and update policies.
--   There is no delete policy, so hymns and pages can only be hidden, never deleted, through the API
--   (the Supabase dashboard can still delete).
-- * Policies call auth functions once per query instead of once per row (Performance Advisor).
--
-- Run once in the Supabase SQL editor after 20261029100000_content_checks.sql. Safe to re-run.
--
-- Rollback (restores the previous policies; drops the history):
--   drop trigger if exists hymns_history on public.hymns;
--   drop trigger if exists pages_history on public.pages;
--   drop function if exists private.record_revision();
--   drop table if exists public.content_revisions;
--   drop policy if exists "editors add hymns" on public.hymns;
--   drop policy if exists "editors change hymns" on public.hymns;
--   drop policy if exists "editors add pages" on public.pages;
--   drop policy if exists "editors change pages" on public.pages;
--   create policy "editors write hymns" on public.hymns for all to authenticated using (private.is_editor()) with check (private.is_editor());
--   create policy "editors write pages" on public.pages for all to authenticated using (private.is_editor()) with check (private.is_editor());
--   (and the read and editors policies as in the previous supabase/schema.sql)

create table if not exists public.content_revisions (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_key     text not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_row     jsonb,
  new_row     jsonb,
  changed_by  uuid references auth.users on delete set null default auth.uid(),
  changed_at  timestamptz not null default now()
);
create index if not exists content_revisions_row_idx on public.content_revisions (table_name, row_key, changed_at desc);
create index if not exists content_revisions_changed_by_idx on public.content_revisions (changed_by);

alter table public.content_revisions enable row level security;
drop policy if exists "editors read history" on public.content_revisions;
create policy "editors read history" on public.content_revisions for select to authenticated using ((select private.is_editor()));
revoke all on public.content_revisions from anon, authenticated;
grant select on public.content_revisions to authenticated;

-- Runs as the table owner so it can write the history, which editors themselves can't.
create or replace function private.record_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := pg_catalog.to_jsonb(coalesce(new, old));
begin
  insert into public.content_revisions (table_name, row_key, action, old_row, new_row, changed_by)
  values (
    tg_table_name,
    coalesce(rec->>'number', rec->>'slug'),
    tg_op,
    case when tg_op = 'INSERT' then null else pg_catalog.to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else pg_catalog.to_jsonb(new) end,
    auth.uid()
  );
  return null;
end $$;
revoke execute on function private.record_revision() from public, anon, authenticated;

drop trigger if exists hymns_history on public.hymns;
create trigger hymns_history after insert or update or delete on public.hymns for each row execute function private.record_revision();
drop trigger if exists pages_history on public.pages;
create trigger pages_history after insert or update or delete on public.pages for each row execute function private.record_revision();

-- Hymns: everyone reads; editors add and change; nobody deletes through the API.
drop policy if exists "editors write hymns" on public.hymns;
drop policy if exists "anyone reads hymns" on public.hymns;
create policy "anyone reads hymns" on public.hymns for select to anon, authenticated using (true);
drop policy if exists "editors add hymns" on public.hymns;
create policy "editors add hymns" on public.hymns for insert to authenticated with check ((select private.is_editor()));
drop policy if exists "editors change hymns" on public.hymns;
create policy "editors change hymns" on public.hymns for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));

-- Pages: the same.
drop policy if exists "editors write pages" on public.pages;
drop policy if exists "anyone reads pages" on public.pages;
create policy "anyone reads pages" on public.pages for select to anon, authenticated using (true);
drop policy if exists "editors add pages" on public.pages;
create policy "editors add pages" on public.pages for insert to authenticated with check ((select private.is_editor()));
drop policy if exists "editors change pages" on public.pages;
create policy "editors change pages" on public.pages for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));

drop policy if exists "editors see themselves" on public.editors;
create policy "editors see themselves" on public.editors for select to authenticated using (user_id = (select auth.uid()));
