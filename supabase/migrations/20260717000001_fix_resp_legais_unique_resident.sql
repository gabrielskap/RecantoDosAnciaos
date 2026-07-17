-- ==========================================================================
-- FIX: Recanto_ResponsaveisLegais estava sem constraint UNIQUE em resident_id,
-- mas o front-end (App.tsx) faz upsert com onConflict: 'resident_id'.
-- Sem a constraint, o Postgres rejeita o upsert com o erro:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- (400 Bad Request), o que quebrava qualquer salvamento do residente
-- (ex.: excluir/renomear pasta de documentos) sempre que houvesse responsável
-- legal cadastrado. Mesmo padrão do fix aplicado em Recanto_PlanosDieta
-- (20260709000001_planos_dieta_unique_resident.sql).
-- ==========================================================================

-- Remove eventuais duplicatas por residente, mantendo o registro mais recente
DELETE FROM "Recanto_ResponsaveisLegais" a
USING "Recanto_ResponsaveisLegais" b
WHERE a.resident_id = b.resident_id
  AND a.created_at < b.created_at;

DELETE FROM "Recanto_ResponsaveisLegais" a
USING "Recanto_ResponsaveisLegais" b
WHERE a.resident_id = b.resident_id
  AND a.created_at = b.created_at
  AND a.id < b.id;

ALTER TABLE "Recanto_ResponsaveisLegais"
  ADD CONSTRAINT recanto_resp_legais_resident_id_key UNIQUE (resident_id);
