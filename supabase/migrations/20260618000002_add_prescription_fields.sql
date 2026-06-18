-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adicionar campos de Observação e Upload de Documento para Medicações
-- Data: 2026-06-18
-- ==========================================================================

-- 1. Adicionar colunas observations e document_url à tabela Recanto_Medicacoes
ALTER TABLE public."Recanto_Medicacoes"
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- 2. Garantir que o bucket prescription-documents exista no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescription-documents', 'prescription-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Criar políticas de acesso RLS para o bucket prescription-documents
DROP POLICY IF EXISTS "Documentos Prescrição - Acesso Público" ON storage.objects;
CREATE POLICY "Documentos Prescrição - Acesso Público" ON storage.objects
  FOR SELECT USING (bucket_id = 'prescription-documents');

DROP POLICY IF EXISTS "Documentos Prescrição - Inserção Autenticada" ON storage.objects;
CREATE POLICY "Documentos Prescrição - Inserção Autenticada" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'prescription-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Documentos Prescrição - Atualização Autenticada" ON storage.objects;
CREATE POLICY "Documentos Prescrição - Atualização Autenticada" ON storage.objects
  FOR UPDATE WITH CHECK (bucket_id = 'prescription-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Documentos Prescrição - Exclusão Autenticada" ON storage.objects;
CREATE POLICY "Documentos Prescrição - Exclusão Autenticada" ON storage.objects
  FOR DELETE USING (bucket_id = 'prescription-documents' AND auth.role() = 'authenticated');
