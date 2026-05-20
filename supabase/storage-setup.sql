-- ============================================================
-- EliteModell — Supabase Storage Setup (produção)
-- Rodar no SQL Editor do Supabase (Database > SQL Editor)
-- ============================================================

-- 1. Criar/atualizar buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'profiles',
    'profiles',
    true,
    10485760,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp']
  ),
  (
    'properties',
    'properties',
    true,
    10485760,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp']
  ),
  (
    'documentos',
    'documentos',
    false,   -- PRIVADO: nunca acessível por URL pública
    10485760,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
  ),
  (
    'stories',
    'stories',
    true,
    52428800,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp','video/mp4','video/webm']
  )
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;


-- ============================================================
-- 2. RLS — bucket "profiles" (fotos públicas de perfil)
--    Qualquer pessoa lê. Usuário só gerencia a PRÓPRIA pasta.
--    Caminho esperado: profiles/{user_id}/...
-- ============================================================

DROP POLICY IF EXISTS "profiles_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_delete"   ON storage.objects;

CREATE POLICY "profiles_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "profiles_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profiles_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profiles_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- 3. RLS — bucket "properties" (fotos de imóveis)
--    Leitura pública. Upload/delete restrito à pasta do dono.
--    Caminho esperado: properties/{user_id}/{property_id}/...
-- ============================================================

DROP POLICY IF EXISTS "properties_public_read" ON storage.objects;
DROP POLICY IF EXISTS "properties_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "properties_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "properties_auth_delete" ON storage.objects;

CREATE POLICY "properties_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'properties');

CREATE POLICY "properties_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'properties'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "properties_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'properties'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "properties_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'properties'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- 4. RLS — bucket "documentos" (identidades — TOTALMENTE PRIVADO)
--    Nenhuma leitura direta por URL. Acesso via signed URL server-side.
--    Upload restrito à própria pasta do usuário.
--    Caminho esperado: documentos/{user_id}/...
-- ============================================================

DROP POLICY IF EXISTS "documentos_no_public_read" ON storage.objects;
DROP POLICY IF EXISTS "documentos_auth_insert"    ON storage.objects;
DROP POLICY IF EXISTS "documentos_auth_select"    ON storage.objects;

-- Bloqueia qualquer leitura direta por URL pública
CREATE POLICY "documentos_no_public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND false
  );

-- Upload restrito à própria pasta — a API usa service_role para gerar signed URLs
CREATE POLICY "documentos_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- 5. RLS — bucket "stories" (feed público)
--    Leitura pública. Upload/delete restrito à pasta do dono.
--    Caminho esperado: stories/{user_id}/...
-- ============================================================

DROP POLICY IF EXISTS "stories_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "stories_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "stories_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "stories_auth_delete"  ON storage.objects;

CREATE POLICY "stories_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "stories_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "stories_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "stories_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- 6. Desativar buckets antigos em PT-BR (não apaga, só torna privado)
-- ============================================================

UPDATE storage.buckets SET public = false
WHERE id IN ('Histórias', 'historias', 'Perfis', 'perfis')
  AND id NOT IN ('stories', 'profiles', 'documentos', 'properties');


-- ============================================================
-- Pronto! Buckets e RLS configurados para produção.
-- Importante: a API deve usar service_role para gerar signed URLs
-- de arquivos privados (documentos). Nunca expor SUPABASE_SERVICE_ROLE_KEY
-- no cliente.
-- ============================================================
