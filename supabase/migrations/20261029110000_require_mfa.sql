-- Security audit H-1: changes to hymns, pages, photos and the edit history need a session that passed the
-- authenticator-code step (aal2), not just a password. A stolen password alone can no longer change content.
--
-- Run this ONLY after every editor has signed in to the content website once and set up their authenticator
-- app (the website asks for it). If any editor hasn't, this stops with an error and changes nothing, so it
-- can't lock anyone out. Safe to re-run.
--
-- Lost phone: Supabase dashboard → Authentication → Users → the editor → remove their MFA factor. They set up
-- a new app at their next sign-in.
--
-- Rollback (back to password-only):
--   create or replace function private.is_editor() returns boolean
--   language sql stable security definer set search_path = '' as $$
--     select exists (select 1 from public.editors where user_id = auth.uid());
--   $$;

do $$
declare
  missing int;
begin
  select count(*) into missing from public.editors e
  where not exists (
    select 1 from auth.mfa_factors f where f.user_id = e.user_id and f.status::text = 'verified'
  );
  if missing > 0 then
    raise exception 'Not applied: % editor(s) have not set up an authenticator app yet. Sign in to the content website, set it up, then run this again.', missing;
  end if;
end $$;

-- Every editor-only rule (hymns, pages, history, photos) goes through this function.
create or replace function private.is_editor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.editors where user_id = auth.uid())
     and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;
