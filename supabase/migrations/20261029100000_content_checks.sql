-- Security audit H-2: reject hymn and page data the app can't display.
-- A malformed `stanzas` value used to be saved, downloaded by every phone and crash the app on launch.
-- The app now skips bad rows too; this stops them at the source.
--
-- Run once in the Supabase SQL editor. Safe to re-run. All 136 current hymns and the About page pass
-- these checks (verified read-only on 2026-10-29).
--
-- Rollback:
--   alter table public.hymns drop constraint if exists hymns_stanzas_valid, drop constraint if exists hymns_number_positive,
--     drop constraint if exists hymns_title_present, drop constraint if exists hymns_years_sane, drop constraint if exists hymns_sizes;
--   alter table public.pages drop constraint if exists pages_slug_format, drop constraint if exists pages_image_path_format,
--     drop constraint if exists pages_sizes;
--   drop function if exists private.valid_stanzas(jsonb);

-- Same shape the app checks in shared/hymn-validate.ts.
create or replace function private.valid_stanzas(s jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  st jsonb;
  l jsonb;
begin
  if pg_catalog.jsonb_typeof(s) is distinct from 'array' then return false; end if;
  for st in select * from pg_catalog.jsonb_array_elements(s) loop
    if pg_catalog.jsonb_typeof(st) <> 'object'
      or coalesce(st->>'type', '') not in ('verse', 'refrain', 'spoken')
      or pg_catalog.jsonb_typeof(st->'number') not in ('number', 'null')
      or pg_catalog.jsonb_typeof(st->'lines') is distinct from 'array' then
      return false;
    end if;
    for l in select * from pg_catalog.jsonb_array_elements(st->'lines') loop
      if pg_catalog.jsonb_typeof(l) <> 'object'
        or pg_catalog.jsonb_typeof(l->'text') is distinct from 'string'
        or pg_catalog.jsonb_typeof(l->'repeat') not in ('number', 'null')
        or pg_catalog.jsonb_typeof(l->'part') not in ('string', 'null')
        or pg_catalog.jsonb_typeof(l->'gap') not in ('boolean', 'null')
        or (l ? 'heading' and l->>'heading' is distinct from 'refrain') then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end $$;
-- Check constraints run as the editor making the change.
revoke execute on function private.valid_stanzas(jsonb) from public, anon;
grant execute on function private.valid_stanzas(jsonb) to authenticated;

alter table public.hymns
  drop constraint if exists hymns_stanzas_valid,
  drop constraint if exists hymns_number_positive,
  drop constraint if exists hymns_title_present,
  drop constraint if exists hymns_years_sane,
  drop constraint if exists hymns_sizes;
alter table public.hymns
  add constraint hymns_stanzas_valid check (private.valid_stanzas(stanzas)),
  add constraint hymns_number_positive check (number > 0),
  add constraint hymns_title_present check (pg_catalog.btrim(title) <> ''),
  add constraint hymns_years_sane check (
    (year is null or year between 1800 and 2200) and (volume_year is null or volume_year between 1800 and 2200)
  ),
  -- Generous limits (the longest hymn today is about 2.4 kB) that stop someone filling the database.
  add constraint hymns_sizes check (
    length(title) <= 200
    and length(coalesce(key, '') || coalesce(scripture, '') || coalesce(volume, '') || coalesce(author, '') || coalesce(credit, '')) <= 2000
    and octet_length(stanzas::text) <= 100000
  );

alter table public.pages
  drop constraint if exists pages_slug_format,
  drop constraint if exists pages_image_path_format,
  drop constraint if exists pages_sizes;
alter table public.pages
  add constraint pages_slug_format check (slug ~ '^[a-z0-9-]{1,64}$'),
  -- A plain path inside the media bucket, as the website writes it (e.g. about/1793116618364-choir.jpg).
  add constraint pages_image_path_format check (
    image_path is null or (image_path ~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9_.-]+)*$' and image_path !~ '\.\.')
  ),
  add constraint pages_sizes check (length(title) <= 200 and length(body) <= 50000);
