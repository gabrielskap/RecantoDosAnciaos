-- ==========================================================================
-- FIX: Recanto_PlanosDieta estava sem constraint UNIQUE em resident_id,
-- mas o front-end (App.tsx) faz upsert com onConflict: 'resident_id'.
-- Sem a constraint, o Postgres rejeita o upsert com o erro:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- o que fazia toda a tela de Planos Alimentares (criar/editar) falhar.
-- ==========================================================================

-- Remove eventuais duplicatas por residente, mantendo o registro mais recente
DELETE FROM "Recanto_PlanosDieta" a
USING "Recanto_PlanosDieta" b
WHERE a.resident_id = b.resident_id
  AND a.updated_at < b.updated_at;

DELETE FROM "Recanto_PlanosDieta" a
USING "Recanto_PlanosDieta" b
WHERE a.resident_id = b.resident_id
  AND a.updated_at = b.updated_at
  AND a.id < b.id;

ALTER TABLE "Recanto_PlanosDieta"
  ADD CONSTRAINT recanto_planos_dieta_resident_id_key UNIQUE (resident_id);
