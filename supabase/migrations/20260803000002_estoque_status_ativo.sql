-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Exclusão (soft-delete) de itens do estoque geral
-- Data: 2026-08-03
-- ==========================================================================

ALTER TABLE public."Recanto_Estoque"
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo';

-- Defensive backfill (a no-op given NOT NULL DEFAULT above; kept only for
-- parity with the Recanto_Eventos precedent, in case this column is ever relaxed).
UPDATE public."Recanto_Estoque"
SET status = 'ativo'
WHERE status IS NULL;

-- fetchStockItems() filters `.eq('status', 'ativo')` on every read of this
-- table, so index the column that carries that filter.
CREATE INDEX IF NOT EXISTS idx_estoque_status ON public."Recanto_Estoque"(status);
