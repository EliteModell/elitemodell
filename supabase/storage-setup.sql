-- ============================================================
-- EliteModell — Supabase Storage Setup (produção)
-- Rodar no SQL Editor do Supabase (Database > SQL Editor)
-- ============================================================

-- 1. Criar buckets corretos com limites e tipos MIME
-- (ignora se já existir, atualiza as configurações)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'profiles',
    'profiles',
    true,
    10485760, -- 10 MB por foto
    ARRAY['image/jpeg','image/jpg','image/png','image/webp']
  ),
  (
    'documentos',
    'documentos',
    false,   -- PRIVADO: nunca acessível diretamente por URL pública
    10485760,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
  ),
  (
    'stories',
    'stories',
    true,
    52428800, -- 50 MB (para vídeos de stories)
    ARRAY['image/jpeg','image/jpg','image/png','image/webp','video/mp4','video/webm']
  )
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;


-- 2. RLS — bucket "profiles" (fotos públicas de perfil)
-- Qualquer pessoa lê. Só o dono faz upload/delete.

DROP POLICY IF EXISTS "profiles_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_delete"   ON storage.objects;

CREATE POLICY "profiles_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

-- upload: qualquer usuário autenticado pode enviar para sua própria pasta
CREATE POLICY "profiles_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "profiles_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
  );


-- 3. RLS — bucket "documentos" (identidades — TOTALMENTE PRIVADO)
-- Nenhuma leitura direta por URL. Acesso via signed URL server-side.
-- Upload só por usuário autenticado. Leitura só pelo service_role (server).

DROP POLICY IF EXISTS "documentos_no_public_read" ON storage.objects;
DROP POLICY IF EXISTS "documentos_auth_insert"    ON storage.objects;
DROP POLICY IF EXISTS "documentos_auth_select"    ON storage.objects;

-- Bloqueia qualquer leitura direta (segurança máxima)
CREATE POLICY "documentos_no_public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND false  -- ninguém acessa via URL pública; só via signed URL server-side
  );

-- Upload: apenas usuários autenticados (a API usa service_role, mas boa prática)
CREATE POLICY "documentos_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
  );


-- 4. RLS — bucket "stories" (feed público)

DROP POLICY IF EXISTS "stories_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "stories_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "stories_auth_delete"  ON storage.objects;

CREATE POLICY "stories_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "stories_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "stories_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories'
    AND auth.role() = 'authenticated'
  );


-- 5. Opcional: desativar os buckets antigos em PT-BR
-- (não apaga, só marca como não público para não vazar nada)
UPDATE storage.buckets SET public = false
WHERE id IN ('Histórias', 'historias', 'Perfis', 'perfis')
  AND id NOT IN ('stories', 'profiles', 'documentos');


-- ============================================================
-- Pronto! Buckets configurados para produção.
-- ============================================================
