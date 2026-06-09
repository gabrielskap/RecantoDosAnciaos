-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Foto do Residente no Boletim Diário
-- Data: 2026-06-08
-- Descrição: Adiciona coluna photo_url (nullable TEXT) à tabela
--            Recanto_ChecklistDiario para registro fotográfico diário.
-- ==========================================================================

ALTER TABLE public."Recanto_ChecklistDiario"
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
