-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Bucket de Fotos de Residentes
-- Data: 2026-06-08
-- ==========================================================================

-- Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('resident-photos', 'resident-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Garantir RLS em storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se existirem para evitar conflitos
DROP POLICY IF EXISTS "Fotos Residentes - Acesso Público" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Residentes - Inserção Autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Residentes - Atualização Autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Residentes - Exclusão Autenticada" ON storage.objects;

-- Criar novas políticas de acesso ao bucket resident-photos
CREATE POLICY "Fotos Residentes - Acesso Público" ON storage.objects
  FOR SELECT USING (bucket_id = 'resident-photos');

CREATE POLICY "Fotos Residentes - Inserção Autenticada" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resident-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Fotos Residentes - Atualização Autenticada" ON storage.objects
  FOR UPDATE WITH CHECK (bucket_id = 'resident-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Fotos Residentes - Exclusão Autenticada" ON storage.objects
  FOR DELETE USING (bucket_id = 'resident-photos' AND auth.role() = 'authenticated');
