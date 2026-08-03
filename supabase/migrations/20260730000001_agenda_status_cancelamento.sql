-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Cancelamento (soft-delete) de eventos da agenda
-- Data: 2026-07-30
-- ==========================================================================

ALTER TABLE public."Recanto_Eventos"
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- Defensive backfill (a no-op given NOT NULL DEFAULT above; kept only for
-- parity with the Residentes precedent, in case this column is ever relaxed).
UPDATE public."Recanto_Eventos"
SET status = 'ativo'
WHERE status IS NULL;

-- fetchEvents() filters `.eq('status', 'ativo')` on every read of this
-- table, so index the column that carries that filter.
CREATE INDEX IF NOT EXISTS idx_eventos_status ON public."Recanto_Eventos"(status);
