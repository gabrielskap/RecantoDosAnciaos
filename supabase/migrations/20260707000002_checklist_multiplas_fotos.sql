-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Múltiplas Fotos no Boletim Diário/Noturno
-- Data: 2026-07-07
-- Descrição: Adiciona coluna photo_urls (TEXT[]) à tabela
--            Recanto_ChecklistDiario para permitir mais de um registro
--            fotográfico por boletim. A coluna photo_url (legado, single)
--            é mantida para compatibilidade com registros antigos.
-- ==========================================================================

ALTER TABLE public."Recanto_ChecklistDiario"
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Migra fotos já existentes (registro único) para o novo formato em array
UPDATE public."Recanto_ChecklistDiario"
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);
