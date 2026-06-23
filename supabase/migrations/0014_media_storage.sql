-- Euphoric — media storage bucket.
-- Images/videos are uploaded here and referenced by URL, instead of being
-- stored as multi-MB base64 blobs in the database. Keeps the DB small and
-- egress low. Run in the SQL editor.

-- Public bucket so getPublicUrl() serves via the CDN.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Anyone can read media (URLs are public, like avatars/attachments).
drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select
  using (bucket_id = 'media');

-- Signed-in users can upload, but only into their own uid/ folder.
drop policy if exists "media insert" on storage.objects;
create policy "media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own files.
drop policy if exists "media delete" on storage.objects;
create policy "media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
