-- Adds the technical-files JSONB column the app writes (movement spec,
-- engraving vector) and the public Storage bucket the Attachments tab uploads
-- to. Without the `files` column, every project save fails and data is lost on
-- the next sign-in — this migration is the fix.

-- 1. The missing column. Idempotent: safe to run on any existing database.
alter table projects add column if not exists files jsonb default '{}'::jsonb;

-- 2. The attachments bucket (public; paths are owner-scoped: {ownerId}/{projectId}/{slot}).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- 3. Storage RLS — owners write/update/delete only under their own id prefix;
--    reads are public (the bucket is public, used by the share dossier + PDFs).
drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects
  for select using (bucket_id = 'attachments');

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists attachments_update on storage.objects;
create policy attachments_update on storage.objects
  for update using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
