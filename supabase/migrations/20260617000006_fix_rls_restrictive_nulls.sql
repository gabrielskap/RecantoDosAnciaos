-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Ajuste de Políticas RLS para Administradores Globais e Seed
-- Data: 2026-06-17
-- Descrição: Permite que usuários com empresa_id nulo (como seed users e dev/global admins)
--            leiam/gravem dados sem serem bloqueados, e permite que qualquer usuário 
--            leia seu próprio registro em Recanto_Usuarios.
-- ==========================================================================

-- 1. Recriação das Políticas Restritivas de RLS para Tabelas com empresa_id direto

DROP POLICY IF EXISTS "empresas_tenant_restrictive" ON public."Recanto_Empresas";
CREATE POLICY "empresas_tenant_restrictive" ON public."Recanto_Empresas" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "assinaturas_tenant_restrictive" ON public."Recanto_Assinaturas";
CREATE POLICY "assinaturas_tenant_restrictive" ON public."Recanto_Assinaturas" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "logs_empresa_tenant_restrictive" ON public."Recanto_Logs_Empresa";
CREATE POLICY "logs_empresa_tenant_restrictive" ON public."Recanto_Logs_Empresa" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

-- Recanto_Usuarios: sempre permite ler/gravar o próprio usuário para evitar falha no login
DROP POLICY IF EXISTS "usuarios_tenant_restrictive" ON public."Recanto_Usuarios";
CREATE POLICY "usuarios_tenant_restrictive" ON public."Recanto_Usuarios" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id() OR auth_user_id = auth.uid()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "residentes_tenant_restrictive" ON public."Recanto_Residentes";
CREATE POLICY "residentes_tenant_restrictive" ON public."Recanto_Residentes" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "funcionarios_tenant_restrictive" ON public."Recanto_Funcionarios";
CREATE POLICY "funcionarios_tenant_restrictive" ON public."Recanto_Funcionarios" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "estoque_tenant_restrictive" ON public."Recanto_Estoque";
CREATE POLICY "estoque_tenant_restrictive" ON public."Recanto_Estoque" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "registros_financeiros_tenant_restrictive" ON public."Recanto_RegistrosFinanceiros";
CREATE POLICY "registros_financeiros_tenant_restrictive" ON public."Recanto_RegistrosFinanceiros" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "eventos_tenant_restrictive" ON public."Recanto_Eventos";
CREATE POLICY "eventos_tenant_restrictive" ON public."Recanto_Eventos" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "treinamentos_tenant_restrictive" ON public."Recanto_Treinamentos";
CREATE POLICY "treinamentos_tenant_restrictive" ON public."Recanto_Treinamentos" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "logs_acesso_tenant_restrictive" ON public."Recanto_LogsAcesso";
CREATE POLICY "logs_acesso_tenant_restrictive" ON public."Recanto_LogsAcesso" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "quartos_tenant_restrictive" ON public."Recanto_Quartos";
CREATE POLICY "quartos_tenant_restrictive" ON public."Recanto_Quartos" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id()) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "perfis_tenant_restrictive" ON public."Recanto_Perfis";
CREATE POLICY "perfis_tenant_restrictive" ON public."Recanto_Perfis" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id() OR empresa_id IS NULL) 
  WITH CHECK (public.recanto_get_empresa_id() IS NULL OR empresa_id = public.recanto_get_empresa_id() OR empresa_id IS NULL);


-- 2. Recriação das Políticas Restritivas de RLS para Tabelas secundárias / vinculadas indiretamente

DROP POLICY IF EXISTS "permissoes_tenant_restrictive" ON public."Recanto_Permissoes";
CREATE POLICY "permissoes_tenant_restrictive" ON public."Recanto_Permissoes" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Perfis" p 
    WHERE p.id = profile_id 
      AND (p.empresa_id = public.recanto_get_empresa_id() OR p.empresa_id IS NULL)
  ));

DROP POLICY IF EXISTS "alergias_tenant_restrictive" ON public."Recanto_Alergias";
CREATE POLICY "alergias_tenant_restrictive" ON public."Recanto_Alergias" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "contatos_emergencia_tenant_restrictive" ON public."Recanto_ContatosEmergencia";
CREATE POLICY "contatos_emergencia_tenant_restrictive" ON public."Recanto_ContatosEmergencia" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "responsaveis_legais_tenant_restrictive" ON public."Recanto_ResponsaveisLegais";
CREATE POLICY "responsaveis_legais_tenant_restrictive" ON public."Recanto_ResponsaveisLegais" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "medicacoes_tenant_restrictive" ON public."Recanto_Medicacoes";
CREATE POLICY "medicacoes_tenant_restrictive" ON public."Recanto_Medicacoes" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "logs_medicacao_tenant_restrictive" ON public."Recanto_LogsMedicacao";
CREATE POLICY "logs_medicacao_tenant_restrictive" ON public."Recanto_LogsMedicacao" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Medicacoes" m 
    JOIN public."Recanto_Residentes" r ON m.resident_id = r.id 
    WHERE m.id = medication_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "sinais_vitais_tenant_restrictive" ON public."Recanto_SinaisVitais";
CREATE POLICY "sinais_vitais_tenant_restrictive" ON public."Recanto_SinaisVitais" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "planos_assistencia_tenant_restrictive" ON public."Recanto_PlanosAssistencia";
CREATE POLICY "planos_assistencia_tenant_restrictive" ON public."Recanto_PlanosAssistencia" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "checklist_diario_tenant_restrictive" ON public."Recanto_ChecklistDiario";
CREATE POLICY "checklist_diario_tenant_restrictive" ON public."Recanto_ChecklistDiario" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "logs_auditoria_tenant_restrictive" ON public."Recanto_LogsAuditoria";
CREATE POLICY "logs_auditoria_tenant_restrictive" ON public."Recanto_LogsAuditoria" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR resident_id IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "documentos_tenant_restrictive" ON public."Recanto_Documentos";
CREATE POLICY "documentos_tenant_restrictive" ON public."Recanto_Documentos" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "planos_dieta_tenant_restrictive" ON public."Recanto_PlanosDieta";
CREATE POLICY "planos_dieta_tenant_restrictive" ON public."Recanto_PlanosDieta" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "restricoes_dieta_tenant_restrictive" ON public."Recanto_RestricoesDieta";
CREATE POLICY "restricoes_dieta_tenant_restrictive" ON public."Recanto_RestricoesDieta" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_PlanosDieta" pd 
    JOIN public."Recanto_Residentes" r ON pd.resident_id = r.id 
    WHERE pd.id = diet_plan_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "logs_nutricao_tenant_restrictive" ON public."Recanto_LogsNutricao";
CREATE POLICY "logs_nutricao_tenant_restrictive" ON public."Recanto_LogsNutricao" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "contratos_tenant_restrictive" ON public."Recanto_Contratos";
CREATE POLICY "contratos_tenant_restrictive" ON public."Recanto_Contratos" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "mensalidades_tenant_restrictive" ON public."Recanto_Mensalidades";
CREATE POLICY "mensalidades_tenant_restrictive" ON public."Recanto_Mensalidades" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "movimentacoes_estoque_tenant_restrictive" ON public."Recanto_MovimentacoesEstoque";
CREATE POLICY "movimentacoes_estoque_tenant_restrictive" ON public."Recanto_MovimentacoesEstoque" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Estoque" e 
    WHERE e.id = stock_item_id 
      AND e.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "treinamentos_participantes_tenant_restrictive" ON public."Recanto_TreinamentosParticipantes";
CREATE POLICY "treinamentos_participantes_tenant_restrictive" ON public."Recanto_TreinamentosParticipantes" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Treinamentos" t 
    WHERE t.id = training_id 
      AND t.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "visitas_tenant_restrictive" ON public."Recanto_Visitas";
CREATE POLICY "visitas_tenant_restrictive" ON public."Recanto_Visitas" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r 
    WHERE r.id = resident_id 
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));

DROP POLICY IF EXISTS "certificados_tenant_restrictive" ON public."Recanto_Certificados";
CREATE POLICY "certificados_tenant_restrictive" ON public."Recanto_Certificados" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Usuarios" u 
    WHERE u.auth_user_id = auth_user_id 
      AND u.empresa_id = public.recanto_get_empresa_id()
  ));
