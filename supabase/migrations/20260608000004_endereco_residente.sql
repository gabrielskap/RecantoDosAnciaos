-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Endereço do Residente
-- Data: 2026-06-08
-- Descrição: Colunas de endereço adicionadas à tabela Recanto_Residentes
--            para guardar dados de logradouro, número, bairro, cidade, uf,
--            cep e complemento.
-- ==========================================================================

ALTER TABLE "Recanto_Residentes"
  ADD COLUMN address_cep TEXT,
  ADD COLUMN address_state TEXT,
  ADD COLUMN address_city TEXT,
  ADD COLUMN address_neighborhood TEXT,
  ADD COLUMN address_street TEXT,
  ADD COLUMN address_number TEXT,
  ADD COLUMN address_complement TEXT;
