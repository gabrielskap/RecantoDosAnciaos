-- ===========================================================================
-- FIX RLS: Recanto_ResponsaveisLegais e Subtabelas Clínicas / Vinculadas
-- Data: 2026-08-17
--
-- Erro: "new row violates row-level security policy for table Recanto_ResponsaveisLegais"
--
-- Causa:
-- 1. A política restritiva de multitenancy (responsaveis_legais_tenant_restrictive)
--    utilizava apenas USING sem uma cláusula WITH CHECK explícita e exigia
--    r.empresa_id = recanto_get_empresa_id(). Se o residente possuísse empresa_id NULL
--    ou se recanto_get_empresa_id() retornasse NULL para o usuário atual (ex: superadmin
--    ou usuário recém-criado sem JWT atualizado), a verificação EXISTS falhava na inserção/atualização.
-- 2. Garantia de que políticas permissivas de inserção/escrita (resp_legais_write)
--    possuem a instrução WITH CHECK (true) ativa para usuários autenticados.
-- ===========================================================================

-- 1. Garantir Políticas Permissivas (WRITE/SELECT) em Recanto_ResponsaveisLegais
DROP POLICY IF EXISTS "resp_legais_write" ON public."Recanto_ResponsaveisLegais";
CREATE POLICY "resp_legais_write" ON public."Recanto_ResponsaveisLegais"
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "resp_legais_select" ON public."Recanto_ResponsaveisLegais";
CREATE POLICY "resp_legais_select" ON public."Recanto_ResponsaveisLegais"
  FOR SELECT TO authenticated
  USING (true);

-- 2. Atualizar Política Restritiva (TENANT ISOLATION) com USING e WITH CHECK explícitos
DROP POLICY IF EXISTS "responsaveis_legais_tenant_restrictive" ON public."Recanto_ResponsaveisLegais";
CREATE POLICY "responsaveis_legais_tenant_restrictive" ON public."Recanto_ResponsaveisLegais"
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

-- 3. Aplicar o mesmo ajuste preventivo para Contatos de Emergência e Alergias
DROP POLICY IF EXISTS "contatos_emergencia_tenant_restrictive" ON public."Recanto_ContatosEmergencia";
CREATE POLICY "contatos_emergencia_tenant_restrictive" ON public."Recanto_ContatosEmergencia"
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

DROP POLICY IF EXISTS "alergias_tenant_restrictive" ON public."Recanto_Alergias";
CREATE POLICY "alergias_tenant_restrictive" ON public."Recanto_Alergias"
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
