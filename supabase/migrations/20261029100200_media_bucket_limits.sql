-- Security audit M-4 and L-4: enforce the photo rules on the server, not only in the browser.
-- The media bucket accepts JPEG, PNG and WebP images up to 5 MB, and a moved or renamed file
-- must stay in the bucket. The current About photo (PNG, about 0.5 MB) is within the limits.
--
-- Editors can now also see the bucket's file list. Storage needs that to delete or move a file;
-- without it, the website's "remove the old photo" step after a replacement does nothing.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Rollback:
--   update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'media';
--   drop policy if exists "editors see media" on storage.objects;
--   drop policy if exists "editors change media" on storage.objects;
--   create policy "editors change media" on storage.objects for update to authenticated
--     using (bucket_id = 'media' and private.is_editor());

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'media';

drop policy if exists "editors change media" on storage.objects;
create policy "editors change media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select private.is_editor()))
  with check (bucket_id = 'media' and (select private.is_editor()));

drop policy if exists "editors see media" on storage.objects;
create policy "editors see media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select private.is_editor()));
