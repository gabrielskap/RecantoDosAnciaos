-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adicionar campos de configurações a Recanto_Empresas e políticas RLS de update
-- Data: 2026-06-17
-- Descrição: Adiciona colunas para armazenar dados institucionais, configurações de notificações
--            e configurações de segurança direto na tabela Recanto_Empresas, além de permitir
--            update de inquilinos autenticados.
-- ==========================================================================

-- 1. Adicionar colunas de configurações e novos campos institucionais à tabela Recanto_Empresas
ALTER TABLE public."Recanto_Empresas"
  ADD COLUMN IF NOT EXISTS capacidade_maxima integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS diretor_geral text,
  ADD COLUMN IF NOT EXISTS responsavel_tecnico text,
  ADD COLUMN IF NOT EXISTS registro_anvisa text,
  ADD COLUMN IF NOT EXISTS papel_timbrado text;

ALTER TABLE public."Recanto_Empresas"
  ADD COLUMN IF NOT EXISTS config_notificacoes jsonb DEFAULT '{
    "stockAlertThreshold": 5,
    "medicationReminderEnabled": true,
    "medicationReminderMinutes": 30,
    "birthdayRemindersEnabled": true,
    "contractDueDaysWarning": 30,
    "checklistMissedAlerts": true,
    "lowOccupancyThreshold": 20
  }'::jsonb;

ALTER TABLE public."Recanto_Empresas"
  ADD COLUMN IF NOT EXISTS config_seguranca jsonb DEFAULT '{
    "sessionTimeoutMinutes": 60,
    "requirePasswordChange": false,
    "passwordChangeDays": 90,
    "twoFactorEnabled": false,
    "auditLogRetentionDays": 365,
    "maxLoginAttempts": 5
  }'::jsonb;

-- 2. Permitir que usuários autenticados atualizem suas próprias configurações de empresa
DROP POLICY IF EXISTS "empresa_update_own" ON public."Recanto_Empresas";
CREATE POLICY "empresa_update_own" ON public."Recanto_Empresas"
  FOR UPDATE TO authenticated
  USING (
    public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()
  )
  WITH CHECK (
    public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()
  );
