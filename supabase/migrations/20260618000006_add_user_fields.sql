-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adicionar campos extras ao perfil do usuário
-- Data: 2026-06-18
-- Descrição: Adiciona colunas para CPF, Sexo, Celular e Endereço à tabela
--            Recanto_Usuarios para suporte a novos campos cadastrados.
-- ==========================================================================

-- Adiciona novos campos à tabela de negócio Recanto_Usuarios
ALTER TABLE public."Recanto_Usuarios" 
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS celular TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Garantir que o bucket 'user-photos' para avatares exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso ao bucket user-photos
DROP POLICY IF EXISTS "Fotos Usuarios - Acesso Publico" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Usuarios - Insercao Autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Usuarios - Atualizacao Autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Usuarios - Exclusao Autenticada" ON storage.objects;

CREATE POLICY "Fotos Usuarios - Acesso Publico" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-photos');

CREATE POLICY "Fotos Usuarios - Insercao Autenticada" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Fotos Usuarios - Atualizacao Autenticada" ON storage.objects
  FOR UPDATE WITH CHECK (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Fotos Usuarios - Exclusao Autenticada" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

