-- ===========================================================================
-- FIX RLS: Recanto_Medicacoes e Recanto_LogsMedicacao
-- Data: 2026-08-19
--
-- Erro: "new row violates row-level security policy for table Recanto_Medicacoes"
--
-- Causa:
-- 1. A política permissiva de escrita (medicacoes_write) restringia inserção/edição
--    apenas a 'Administrador' e 'Médico' sem cláusula WITH CHECK explícita,
--    causando falha para Cuidadores, Enfermeiros, ou perfis com profile_type nulo.
-- 2. A política restritiva de multitenancy (medicacoes_tenant_restrictive)
--    utilizava apenas USING (sem WITH CHECK) e exigia r.empresa_id = recanto_get_empresa_id().
--    Se o residente possuísse empresa_id NULL ou recanto_get_empresa_id() retornasse
--    NULL para o usuário atual, a verificação EXISTS falhava na inserção/atualização.
-- ===========================================================================

-- 1. Garantir Políticas Permissivas (WRITE / SELECT) em Recanto_Medicacoes
DROP POLICY IF EXISTS "medicacoes_write" ON public."Recanto_Medicacoes";
CREATE POLICY "medicacoes_write" ON public."Recanto_Medicacoes"
  FOR ALL TO authenticated
  USING (
    public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador')
    OR public.recanto_get_profile_type() IS NULL
  )
  WITH CHECK (
    public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador')
    OR public.recanto_get_profile_type() IS NULL
  );

DROP POLICY IF EXISTS "medicacoes_select" ON public."Recanto_Medicacoes";
CREATE POLICY "medicacoes_select" ON public."Recanto_Medicacoes"
  FOR SELECT TO authenticated
  USING (true);

-- 2. Atualizar Política Restritiva (TENANT ISOLATION) para Recanto_Medicacoes
DROP POLICY IF EXISTS "medicacoes_tenant_restrictive" ON public."Recanto_Medicacoes";
CREATE POLICY "medicacoes_tenant_restrictive" ON public."Recanto_Medicacoes"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.recanto_get_empresa_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM public."Recanto_Residentes" r
      WHERE r.id = resident_id
        AND (r.empresa_id = public.recanto_get_empresa_id() OR r.empresa_id IS NULL)
    )
  )
  WITH CHECK (
    public.recanto_get_empresa_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM public."Recanto_Residentes" r
      WHERE r.id = resident_id
        AND (r.empresa_id = public.recanto_get_empresa_id() OR r.empresa_id IS NULL)
    )
  );

-- 3. Ajustar Políticas em Recanto_LogsMedicacao (para inserção de histórico de ministração)
DROP POLICY IF EXISTS "logs_med_insert" ON public."Recanto_LogsMedicacao";
CREATE POLICY "logs_med_insert" ON public."Recanto_LogsMedicacao"
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "logs_med_select" ON public."Recanto_LogsMedicacao";
CREATE POLICY "logs_med_select" ON public."Recanto_LogsMedicacao"
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "logs_medicacao_tenant_restrictive" ON public."Recanto_LogsMedicacao";
CREATE POLICY "logs_medicacao_tenant_restrictive" ON public."Recanto_LogsMedicacao"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.recanto_get_empresa_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM public."Recanto_Medicacoes" m
      JOIN public."Recanto_Residentes" r ON m.resident_id = r.id
      WHERE m.id = medication_id
        AND (r.empresa_id = public.recanto_get_empresa_id() OR r.empresa_id IS NULL)
    )
  )
  WITH CHECK (
    public.recanto_get_empresa_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM public."Recanto_Medicacoes" m
      JOIN public."Recanto_Residentes" r ON m.resident_id = r.id
      WHERE m.id = medication_id
        AND (r.empresa_id = public.recanto_get_empresa_id() OR r.empresa_id IS NULL)
    )
  );
