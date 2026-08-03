-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adicionar coluna sarcopenia na tabela Recanto_Residentes
-- Data: 2026-08-03
-- ==========================================================================

ALTER TABLE public."Recanto_Residentes"
  ADD COLUMN IF NOT EXISTS sarcopenia TEXT DEFAULT 'nao';

-- Garantir que registros existentes possuam valor padrão 'nao' caso nulo
UPDATE public."Recanto_Residentes"
SET sarcopenia = 'nao'
WHERE sarcopenia IS NULL;
