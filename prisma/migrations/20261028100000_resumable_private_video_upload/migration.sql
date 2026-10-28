-- Direct TUS uploads remain private. An authenticated Supabase user may only
-- create objects below its own auth.uid() processing prefix. Reads, updates and
-- deletes continue through the service role and controlled application routes.
DROP POLICY IF EXISTS "resumable_video_insert_own_processing_prefix" ON storage.objects;
UPDATE storage.buckets
SET file_size_limit = 524288000,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream'
    ]
WHERE id = 'approved-media';

CREATE OR REPLACE FUNCTION public.can_upload_professional_video(object_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage, auth
STABLE
AS $$
  SELECT
    (storage.foldername(object_name))[1] = '_processing'
    AND (storage.foldername(object_name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public."UploadAsset" AS asset
      WHERE asset."quarantineBucket" = 'approved-media'
        AND asset."quarantinePath" = object_name
        AND asset."uploadCompletedAt" IS NULL
        AND asset."sizeBytes" > 0
        AND asset."sizeBytes" <= 524288000
    );
$$;
REVOKE ALL ON FUNCTION public.can_upload_professional_video(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_professional_video(text) TO authenticated;

CREATE POLICY "resumable_video_insert_own_processing_prefix"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'approved-media'
  AND public.can_upload_professional_video(name)
);
