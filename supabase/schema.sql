-- Hoziana content: run once in the Supabase SQL editor (Project → SQL → New query).
-- Everyone can read published content; only people listed in `editors` can change it.

create table if not exists public.hymns (
  number      int primary key,
  title       text not null,
  key         text,
  scripture   text,
  volume      text,
  volume_year int,
  author      text,
  year        int,
  credit      text,
  stanzas     jsonb not null default '[]'::jsonb,
  -- Hidden hymns disappear from the app; nothing is ever hard-deleted.
  hidden      boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users on delete set null
);

-- Pages such as "about": a title, body text (blank lines separate paragraphs) and an optional photo.
create table if not exists public.pages (
  slug        text primary key,
  title       text not null,
  body        text not null default '',
  image_path  text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users on delete set null
);

create table if not exists public.editors (
  user_id uuid primary key references auth.users on delete cascade,
  email   text
);

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors where user_id = auth.uid());
$$;

-- The app only downloads what changed since its last sync, so every edit bumps updated_at.
create or replace function public.touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists hymns_touch on public.hymns;
create trigger hymns_touch before insert or update on public.hymns for each row execute function public.touch();
drop trigger if exists pages_touch on public.pages;
create trigger pages_touch before insert or update on public.pages for each row execute function public.touch();

alter table public.hymns enable row level security;
alter table public.pages enable row level security;
alter table public.editors enable row level security;

drop policy if exists "anyone reads hymns" on public.hymns;
create policy "anyone reads hymns" on public.hymns for select using (true);
drop policy if exists "editors write hymns" on public.hymns;
create policy "editors write hymns" on public.hymns for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "anyone reads pages" on public.pages;
create policy "anyone reads pages" on public.pages for select using (true);
drop policy if exists "editors write pages" on public.pages;
create policy "editors write pages" on public.pages for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists "editors see themselves" on public.editors;
create policy "editors see themselves" on public.editors for select to authenticated using (user_id = auth.uid());

-- Photos for pages. Public to read, editors to upload.
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;

drop policy if exists "editors upload media" on storage.objects;
create policy "editors upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_editor());
drop policy if exists "editors change media" on storage.objects;
create policy "editors change media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_editor());
drop policy if exists "editors delete media" on storage.objects;
create policy "editors delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_editor());
