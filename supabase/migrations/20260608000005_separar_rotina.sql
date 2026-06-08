-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Módulo de Residentes: Plano de Rotina
-- Data: 2026-06-08
-- Descrição: Adição de colunas estruturais de plano de rotina e cuidados 
--            usuais à tabela Recanto_Residentes, separando-as do preenchimento
--            diário de evolução.
-- ==========================================================================

ALTER TABLE "Recanto_Residentes"
  ADD COLUMN uso_fraldas TEXT DEFAULT 'nao',
  ADD COLUMN mobilidade_usual TEXT DEFAULT 'independente',
  ADD COLUMN higiene_corporal_usual TEXT DEFAULT 'independente',
  ADD COLUMN higiene_oral_vestir_usual TEXT DEFAULT 'independente',
  ADD COLUMN req_hygiene BOOLEAN DEFAULT FALSE,
  ADD COLUMN req_oral_care BOOLEAN DEFAULT FALSE,
  ADD COLUMN req_feeding BOOLEAN DEFAULT FALSE,
  ADD COLUMN req_hydration BOOLEAN DEFAULT FALSE,
  ADD COLUMN req_mobility BOOLEAN DEFAULT FALSE,
  ADD COLUMN req_dressings BOOLEAN DEFAULT FALSE,
  ADD COLUMN req_leisure BOOLEAN DEFAULT FALSE;
