-- HOMOLOGATION ONLY. Apply to the isolated Supabase Preview Branch after
-- confirming its project ref differs from Production. Never run this file in
-- Production. All objects start private and application access remains
-- server-side through the service role and controlled /api/media routes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('upload-quarantine', 'upload-quarantine', false, 52428800, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf','video/mp4','video/webm','video/quicktime']),
  ('approved-media', 'approved-media', false, 52428800, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf','video/mp4','video/webm','video/quicktime']),
  ('documentos', 'documentos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']),
  ('moderation-evidence', 'moderation-evidence', false, 52428800, array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists "homologation deny direct reads" on storage.objects;
drop policy if exists "homologation deny direct inserts" on storage.objects;
drop policy if exists "homologation deny direct updates" on storage.objects;
drop policy if exists "homologation deny direct deletes" on storage.objects;

create policy "homologation deny direct reads" on storage.objects
  for select to anon, authenticated using (false);
create policy "homologation deny direct inserts" on storage.objects
  for insert to anon, authenticated with check (false);
create policy "homologation deny direct updates" on storage.objects
  for update to anon, authenticated using (false) with check (false);
create policy "homologation deny direct deletes" on storage.objects
  for delete to anon, authenticated using (false);
