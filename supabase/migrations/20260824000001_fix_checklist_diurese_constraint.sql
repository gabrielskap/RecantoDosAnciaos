-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Permitir valor 'normal' no campo diurese do checklist
-- Data: 2026-08-24
-- Descrição: Atualiza a constraint Recanto_ChecklistDiario_diurese_check
--            para permitir 'normal' e 'adequada' além de 'ausente', 'aumentada'
--            e 'diminuida', compatibilizando com a interface do boletim.
-- ==========================================================================

ALTER TABLE public."Recanto_ChecklistDiario"
  DROP CONSTRAINT IF EXISTS "Recanto_ChecklistDiario_diurese_check";

ALTER TABLE public."Recanto_ChecklistDiario"
  ADD CONSTRAINT "Recanto_ChecklistDiario_diurese_check"
    CHECK (diurese IS NULL OR diurese IN ('normal', 'adequada', 'ausente', 'aumentada', 'diminuida'));
