-- ==========================================================================
-- Adiciona data de validade aos itens de estoque (obrigatória para medicamentos
-- na camada de aplicação).
-- ==========================================================================

ALTER TABLE "Recanto_Estoque"
  ADD COLUMN IF NOT EXISTS expiration_date DATE;
