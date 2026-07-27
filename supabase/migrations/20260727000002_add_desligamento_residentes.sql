-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adicionar suporte a desligamento e status inativo
-- Data: 2026-07-27
-- ==========================================================================

ALTER TABLE public."Recanto_Residentes"
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS data_desligamento DATE,
  ADD COLUMN IF NOT EXISTS motivo_desligamento TEXT,
  ADD COLUMN IF NOT EXISTS documento_desligamento TEXT;

-- Garantir que registros existentes possuam status 'ativo' por padrão
UPDATE public."Recanto_Residentes"
SET status = 'ativo'
WHERE status IS NULL;
