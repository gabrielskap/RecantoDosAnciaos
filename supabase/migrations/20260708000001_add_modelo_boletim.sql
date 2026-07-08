-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Modelo de Boletim configurável por instituição
-- Data: 2026-07-08
-- Descrição: Permite que cada ILPI escolha o modelo de boletim diário
--            utilizado para registrar a rotina dos residentes.
--
--            Valores permitidos (Recanto_Empresas.modelo_boletim):
--              'diurno_noturno' — Dois boletins por dia (turno diurno e
--                                 turno noturno), preenchidos separadamente.
--              'diario'         — Um único boletim por dia, unificando os
--                                 campos de diurno e noturno.
--
--            Padrão: 'diurno_noturno' (preserva o comportamento atual).
--
--            Também adiciona 'diario' aos valores permitidos da coluna
--            Recanto_ChecklistDiario.shift, para que boletins criados sob
--            o modelo unificado sejam persistidos com um valor de turno
--            distinto de 'diurno'/'noturno' — evitando colisão com a
--            restrição única (resident_id, date, shift) caso a instituição
--            troque de modelo e tenha dados legados na mesma data.
-- ==========================================================================

-- 1. Preferência de modelo de boletim por instituição
ALTER TABLE public."Recanto_Empresas"
  ADD COLUMN IF NOT EXISTS modelo_boletim text
    NOT NULL DEFAULT 'diurno_noturno'
    CONSTRAINT chk_modelo_boletim
      CHECK (modelo_boletim IN ('diurno_noturno', 'diario'));

-- 2. Permitir o novo valor 'diario' na coluna shift do checklist diário
--    (constraint criada inline em 20260611000001_boletim_diurno_noturno.sql,
--    nomeada por convenção do Postgres como Recanto_ChecklistDiario_shift_check)
ALTER TABLE public."Recanto_ChecklistDiario"
  DROP CONSTRAINT IF EXISTS "Recanto_ChecklistDiario_shift_check";
ALTER TABLE public."Recanto_ChecklistDiario"
  ADD CONSTRAINT "Recanto_ChecklistDiario_shift_check"
    CHECK ("shift" IN ('diurno', 'noturno', 'diario'));

-- NOTA: a policy de UPDATE "empresa_update_admin_only" (criada em
-- 20260622000001_add_tipo_assinatura_documentos.sql) já é table-level e
-- cobre a nova coluna modelo_boletim automaticamente — nenhuma alteração
-- de RLS é necessária.
