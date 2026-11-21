-- Read-only preflight. Both columns must be true before accepting documents.
SELECT
    EXISTS (
        SELECT 1 FROM storage.buckets
        WHERE id = 'documentos' AND public IS FALSE
    ) AS bucket_is_private,
    (
        SELECT count(*) FROM pg_class
        WHERE oid IN ('storage.objects'::regclass, 'storage.buckets'::regclass)
          AND relrowsecurity
    ) = 2 AS storage_rls_enabled;
