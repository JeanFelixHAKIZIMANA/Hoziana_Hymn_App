-- Row-level security tests: who can read and write what.
-- Acts as anon (phones and signed-out visitors), two signed-in non-editors (A and B) and an editor,
-- and fails on the first rule that doesn't hold. Everything runs in one transaction that is rolled back.
--
-- Run it on a throwaway database that has schema.sql and the migrations applied (supabase/tests/run-local.sh
-- does this on plain Postgres; CI runs it on every push). Never run it against the real project.

\set ON_ERROR_STOP 1
begin;

-- Runs one statement as a role with a fake JWT, and checks the outcome:
-- 'denied' (an error), 'ok' (no error), or 'rows:N' (no error and exactly N rows read or changed).
-- Signed-in users have passed the authenticator-code step (aal2) unless aal says otherwise.
create function pg_temp.check(label text, as_role text, uid uuid, stmt text, expect text, aal text default 'aal2') returns void
language plpgsql as $$
declare
  n bigint;
  err text;
begin
  perform set_config('request.jwt.claims',
    case when uid is null then json_build_object('role', as_role)::text
         else json_build_object('sub', uid, 'role', as_role, 'aal', aal)::text end, true);
  execute format('set local role %I', as_role);
  begin
    execute stmt;
    get diagnostics n = row_count;
  exception when others then
    err := sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  if expect = 'denied' and err is null then
    raise exception 'FAIL [%] %: expected it to be refused, but it worked (% rows)', as_role, label, n;
  elsif expect <> 'denied' and err is not null then
    raise exception 'FAIL [%] %: expected it to work, but got: %', as_role, label, err;
  elsif expect like 'rows:%' and n <> split_part(expect, ':', 2)::bigint then
    raise exception 'FAIL [%] %: expected % rows, got %', as_role, label, split_part(expect, ':', 2), n;
  end if;
  raise notice 'ok   [%] %', as_role, label;
end $$;

-- Fixtures: two ordinary users, one editor, one hymn, one page, one photo.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'editor@example.com');
insert into public.editors (user_id, email) values ('00000000-0000-0000-0000-00000000000e', 'editor@example.com');
insert into public.hymns (number, title, stanzas)
  values (9001, 'Test hymn', '[{"type":"verse","number":1,"lines":[{"text":"Line one"}]}]');
insert into public.pages (slug, title, body) values ('test-page', 'Test', 'Body')
  on conflict (slug) do nothing;
insert into storage.buckets (id, name, public) values ('other', 'other', false) on conflict (id) do nothing;
insert into storage.objects (bucket_id, name) values ('media', 'about/test.jpg');

\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set E '''00000000-0000-0000-0000-00000000000e'''

-- Anyone (the app): read hymns and pages, nothing else.
select pg_temp.check('reads hymns', 'anon', null, 'select * from public.hymns where number = 9001', 'rows:1');
select pg_temp.check('reads pages', 'anon', null, $q$select * from public.pages where slug = 'test-page'$q$, 'rows:1');
select pg_temp.check('reads editors list', 'anon', null, 'select * from public.editors', 'denied');
select pg_temp.check('reads edit history', 'anon', null, 'select * from public.content_revisions', 'denied');
select pg_temp.check('adds a hymn', 'anon', null, $q$insert into public.hymns (number, title) values (9002, 'x')$q$, 'denied');
select pg_temp.check('changes a hymn', 'anon', null, $q$update public.hymns set title = 'x' where number = 9001$q$, 'denied');
select pg_temp.check('deletes a hymn', 'anon', null, 'delete from public.hymns where number = 9001', 'denied');
select pg_temp.check('empties hymns', 'anon', null, 'truncate public.hymns', 'denied');
select pg_temp.check('changes a page', 'anon', null, $q$update public.pages set body = 'x'$q$, 'denied');
select pg_temp.check('adds itself as editor', 'anon', null,
  $q$insert into public.editors (user_id) values ('00000000-0000-0000-0000-00000000000a')$q$, 'denied');
select pg_temp.check('uploads a photo', 'anon', null, $q$insert into storage.objects (bucket_id, name) values ('media', 'x.jpg')$q$, 'denied');
select pg_temp.check('deletes a photo', 'anon', null, $q$delete from storage.objects where bucket_id = 'media'$q$, 'rows:0');

-- Signed in but not an editor (A and B): read like anyone; can't write, can't see the editors list
-- or each other's rows in it, can't make themselves an editor.
select pg_temp.check('reads hymns', 'authenticated', :A, 'select * from public.hymns where number = 9001', 'rows:1');
select pg_temp.check('adds a hymn', 'authenticated', :A, $q$insert into public.hymns (number, title) values (9002, 'x')$q$, 'denied');
select pg_temp.check('changes a hymn (no rows match)', 'authenticated', :A, $q$update public.hymns set title = 'x' where number = 9001$q$, 'rows:0');
select pg_temp.check('deletes a hymn', 'authenticated', :A, 'delete from public.hymns where number = 9001', 'denied');
select pg_temp.check('empties hymns', 'authenticated', :A, 'truncate public.hymns', 'denied');
select pg_temp.check('adds a page', 'authenticated', :A, $q$insert into public.pages (slug, title) values ('evil', 'x')$q$, 'denied');
select pg_temp.check('changes a page (no rows match)', 'authenticated', :B, $q$update public.pages set body = 'x'$q$, 'rows:0');
select pg_temp.check('sees the editors list (none visible)', 'authenticated', :A, 'select * from public.editors', 'rows:0');
select pg_temp.check('adds itself as editor', 'authenticated', :A,
  $q$insert into public.editors (user_id) values ('00000000-0000-0000-0000-00000000000a')$q$, 'denied');
select pg_temp.check('promotes B to editor', 'authenticated', :A,
  $q$update public.editors set user_id = '00000000-0000-0000-0000-00000000000b'$q$, 'denied');
select pg_temp.check('reads edit history (none visible)', 'authenticated', :B, 'select * from public.content_revisions', 'rows:0');
select pg_temp.check('writes edit history', 'authenticated', :A,
  $q$insert into public.content_revisions (table_name, row_key, action) values ('hymns', '1', 'UPDATE')$q$, 'denied');
select pg_temp.check('uploads a photo', 'authenticated', :A, $q$insert into storage.objects (bucket_id, name) values ('media', 'x.jpg')$q$, 'denied');
select pg_temp.check('replaces a photo (no rows match)', 'authenticated', :B, $q$update storage.objects set name = 'y.jpg' where bucket_id = 'media'$q$, 'rows:0');
select pg_temp.check('deletes a photo (no rows match)', 'authenticated', :B, $q$delete from storage.objects where bucket_id = 'media'$q$, 'rows:0');

-- An editor who signed in with only the password (no authenticator code yet, aal1): can see they're an editor,
-- so the website can ask for the code, but can't change or read anything editor-only (audit H-1).
select pg_temp.check('sees own editors row (password only)', 'authenticated', :E, 'select * from public.editors', 'rows:1', 'aal1');
select pg_temp.check('adds a hymn (password only)', 'authenticated', :E,
  $q$insert into public.hymns (number, title) values (9003, 'x')$q$, 'denied', 'aal1');
select pg_temp.check('changes a hymn (password only)', 'authenticated', :E,
  $q$update public.hymns set title = 'x' where number = 9001$q$, 'rows:0', 'aal1');
select pg_temp.check('saves the About page (password only)', 'authenticated', :E,
  $q$update public.pages set body = 'x' where slug = 'test-page'$q$, 'rows:0', 'aal1');
select pg_temp.check('reads edit history (password only)', 'authenticated', :E, 'select * from public.content_revisions', 'rows:0', 'aal1');
select pg_temp.check('uploads a photo (password only)', 'authenticated', :E,
  $q$insert into storage.objects (bucket_id, name) values ('media', 'about/aal1.jpg')$q$, 'denied', 'aal1');
select pg_temp.check('deletes a photo (password only)', 'authenticated', :E,
  $q$delete from storage.objects where bucket_id = 'media'$q$, 'rows:0', 'aal1');

-- The editor: adds and changes hymns and pages, sees the history, can't delete or bypass the content checks.
select pg_temp.check('sees own editors row', 'authenticated', :E, 'select * from public.editors', 'rows:1');
select pg_temp.check('adds a hymn', 'authenticated', :E,
  $q$insert into public.hymns (number, title, stanzas) values (9002, 'New', '[{"type":"refrain","lines":[{"text":"R","part":"Bose","repeat":2}]}]')$q$, 'rows:1');
select pg_temp.check('changes a hymn', 'authenticated', :E, $q$update public.hymns set title = 'Renamed' where number = 9001$q$, 'rows:1');
select pg_temp.check('hides a hymn', 'authenticated', :E, 'update public.hymns set hidden = true where number = 9002', 'rows:1');
select pg_temp.check('deletes a hymn', 'authenticated', :E, 'delete from public.hymns where number = 9001', 'denied');
select pg_temp.check('empties hymns', 'authenticated', :E, 'truncate public.hymns', 'denied');
select pg_temp.check('saves stanzas that are not a list', 'authenticated', :E,
  $q$update public.hymns set stanzas = '{}' where number = 9001$q$, 'denied');
select pg_temp.check('saves a line without text', 'authenticated', :E,
  $q$update public.hymns set stanzas = '[{"type":"verse","lines":[{"text":5}]}]' where number = 9001$q$, 'denied');
select pg_temp.check('saves an unknown stanza type', 'authenticated', :E,
  $q$update public.hymns set stanzas = '[{"type":"chorus","lines":[]}]' where number = 9001$q$, 'denied');
select pg_temp.check('saves a blank title', 'authenticated', :E, $q$update public.hymns set title = '  ' where number = 9001$q$, 'denied');
select pg_temp.check('saves hymn number 0', 'authenticated', :E, $q$insert into public.hymns (number, title) values (0, 'x')$q$, 'denied');
select pg_temp.check('saves the About page (upsert)', 'authenticated', :E,
  $q$insert into public.pages (slug, title, body) values ('test-page', 'T', 'B') on conflict (slug) do update set body = excluded.body$q$, 'rows:1');
select pg_temp.check('points a photo outside the bucket', 'authenticated', :E,
  $q$update public.pages set image_path = '../../auth/x' where slug = 'test-page'$q$, 'denied');
select pg_temp.check('deletes a page', 'authenticated', :E, $q$delete from public.pages where slug = 'test-page'$q$, 'denied');
select pg_temp.check('reads edit history', 'authenticated', :E,
  $q$select * from public.content_revisions where row_key in ('9001', '9002', 'test-page') and changed_by = '00000000-0000-0000-0000-00000000000e'$q$, 'rows:4');
select pg_temp.check('rewrites edit history', 'authenticated', :E, $q$update public.content_revisions set new_row = null$q$, 'denied');
select pg_temp.check('erases edit history', 'authenticated', :E, 'delete from public.content_revisions', 'denied');
select pg_temp.check('makes B an editor', 'authenticated', :E,
  $q$insert into public.editors (user_id) values ('00000000-0000-0000-0000-00000000000b')$q$, 'denied');
select pg_temp.check('uploads a photo', 'authenticated', :E, $q$insert into storage.objects (bucket_id, name) values ('media', 'about/new.jpg')$q$, 'rows:1');
select pg_temp.check('moves a photo to another bucket', 'authenticated', :E,
  $q$update storage.objects set bucket_id = 'other' where name = 'about/new.jpg'$q$, 'denied');
select pg_temp.check('deletes a photo', 'authenticated', :E, $q$delete from storage.objects where name = 'about/new.jpg'$q$, 'rows:1');

-- The database, not the browser, records who made each change.
do $$ begin
  if (select updated_by from public.hymns where number = 9001) is distinct from '00000000-0000-0000-0000-00000000000e' then
    raise exception 'FAIL updated_by was not set to the editor';
  end if;
  if (select old_row->>'title' from public.content_revisions where row_key = '9001' and action = 'UPDATE' order by id limit 1) <> 'Test hymn' then
    raise exception 'FAIL history did not keep the old title';
  end if;
  if (select file_size_limit from storage.buckets where id = 'media') <> 5242880 then
    raise exception 'FAIL media bucket has no 5 MB limit';
  end if;
  raise notice 'ok   [db] updated_by, history and bucket limits';
end $$;

rollback;
\echo 'All RLS checks passed.'
