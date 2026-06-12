-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Restrição de Unicidade em Sinais Vitais
-- Data: 2026-06-11
-- Descrição: Adiciona restrição UNIQUE em (resident_id, timestamp) para permitir 
--            a operação de upsert realizada pelo sistema.
-- ==========================================================================

-- 1. Remover registros duplicados mantendo apenas o mais recente por data/residente (se houver)
DELETE FROM public."Recanto_SinaisVitais" a
USING public."Recanto_SinaisVitais" b
WHERE a.id < b.id 
  AND a.resident_id = b.resident_id 
  AND a.timestamp = b.timestamp;

-- 2. Adicionar a restrição de unicidade
ALTER TABLE public."Recanto_SinaisVitais"
  ADD CONSTRAINT "Recanto_SinaisVitais_resident_id_timestamp_key" UNIQUE (resident_id, timestamp);
