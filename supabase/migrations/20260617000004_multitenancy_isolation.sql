-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Isolamento Multi-Empresa (Multi-tenancy)
-- Data: 2026-06-17
-- Descrição: Ajusta tabelas operacionais e RLS para isolamento total de dados por empresa.
-- ==========================================================================

-- 1. Garante a existência da função para obter a empresa do usuário logado
CREATE OR REPLACE FUNCTION public.recanto_get_empresa_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public."Recanto_Usuarios"
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Ajuste na tabela de Quartos para remover chave única global e torná-la única por empresa
ALTER TABLE public."Recanto_Quartos" DROP CONSTRAINT IF EXISTS "Recanto_Quartos_number_key";

-- 3. Adição do campo empresa_id nas tabelas operacionais primárias
ALTER TABLE public."Recanto_Residentes"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_Funcionarios"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_Estoque"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_RegistrosFinanceiros"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_Eventos"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_Treinamentos"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_LogsAcesso"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_Quartos"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_Perfis"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id();

-- 4. Criação de índices para empresa_id
CREATE INDEX IF NOT EXISTS idx_residentes_empresa      ON public."Recanto_Residentes"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa    ON public."Recanto_Funcionarios"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_estoque_empresa         ON public."Recanto_Estoque"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa      ON public."Recanto_RegistrosFinanceiros"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_eventos_empresa         ON public."Recanto_Eventos"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_treinamentos_empresa    ON public."Recanto_Treinamentos"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_empresa     ON public."Recanto_LogsAcesso"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_quartos_empresa         ON public."Recanto_Quartos"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfis_empresa          ON public."Recanto_Perfis"(empresa_id);

-- 5. Atualiza a constraint de chave única de Quartos para ser composta por empresa_id e number
ALTER TABLE public."Recanto_Quartos" ADD CONSTRAINT "Recanto_Quartos_empresa_number_key" UNIQUE (empresa_id, number);

-- 6. Script de migração de dados existentes (vincula à primeira empresa se houver dados órfãos)
DO $$
DECLARE
  v_first_empresa_id text;
BEGIN
  SELECT empresa_id INTO v_first_empresa_id FROM public."Recanto_Empresas" LIMIT 1;
  IF v_first_empresa_id IS NOT NULL THEN
    UPDATE public."Recanto_Residentes" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_Funcionarios" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_Estoque" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_RegistrosFinanceiros" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_Eventos" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_Treinamentos" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_LogsAcesso" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_Quartos" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
    UPDATE public."Recanto_Perfis" SET empresa_id = v_first_empresa_id WHERE empresa_id IS NULL;
  END IF;
END $$;

-- 7. Atualização do trigger de novo usuário para associar o perfil escopado e permissões por empresa
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_name TEXT;
  v_profile_type TEXT;
  v_empresa_id TEXT;
BEGIN
  -- 1. Obter empresa_id dos metadados
  v_empresa_id := NULL;
  IF NEW.raw_user_meta_data ? 'empresa_id' THEN
    v_empresa_id := NEW.raw_user_meta_data->>'empresa_id';
  END IF;

  -- 2. Determinar o profile_id correto escopado por empresa (ou perfil global se for nulo)
  IF NEW.raw_user_meta_data ? 'profile_id' THEN
    v_profile_id := (NEW.raw_user_meta_data->>'profile_id')::UUID;
  ELSE
    v_profile_type := COALESCE(NEW.raw_user_meta_data->>'profile_type', 'Cuidador');
    
    SELECT id INTO v_profile_id
    FROM public."Recanto_Perfis"
    WHERE type::text = v_profile_type
      AND (empresa_id = v_empresa_id OR (empresa_id IS NULL AND v_empresa_id IS NULL))
    LIMIT 1;

    -- Se for Administrador e o perfil não existir para esta empresa, cria-se automaticamente o perfil e permissões padrão
    IF v_profile_id IS NULL AND v_profile_type = 'Administrador' THEN
      INSERT INTO public."Recanto_Perfis" (name, type, is_editable, empresa_id)
      VALUES ('Administrador', 'Administrador', false, v_empresa_id)
      RETURNING id INTO v_profile_id;

      INSERT INTO public."Recanto_Permissoes" (profile_id, module, actions)
      VALUES
        (v_profile_id, 'DASHBOARD', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'RESIDENTS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'RESIDENT_DETAIL', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'AGENDA', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'NUTRITION', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'TEAM', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'FINANCE', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'STOCK', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'REPORTS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'USERS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'ROOMS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'SETTINGS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]);
    END IF;

    -- Se ainda não encontrar nenhum perfil, pega o primeiro perfil disponível
    IF v_profile_id IS NULL THEN
      SELECT id INTO v_profile_id FROM public."Recanto_Perfis" LIMIT 1;
    END IF;
  END IF;

  -- 3. Determinar o nome do usuário
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- 4. Inserir ou atualizar na tabela pública de usuários
  INSERT INTO public."Recanto_Usuarios" (auth_user_id, name, email, profile_id, resident_id, empresa_id)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_profile_id,
    CASE 
      WHEN NEW.raw_user_meta_data ? 'resident_id' THEN (NEW.raw_user_meta_data->>'resident_id')::UUID
      ELSE NULL
    END,
    v_empresa_id
  )
  ON CONFLICT (auth_user_id) DO UPDATE 
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      profile_id = EXCLUDED.profile_id,
      resident_id = EXCLUDED.resident_id,
      empresa_id = COALESCE(EXCLUDED.empresa_id, public."Recanto_Usuarios".empresa_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criação das Políticas Restritivas de RLS para todas as tabelas operacionais

-- Tabelas com empresa_id direto
DROP POLICY IF EXISTS "empresas_tenant_restrictive" ON public."Recanto_Empresas";
CREATE POLICY "empresas_tenant_restrictive" ON public."Recanto_Empresas" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "assinaturas_tenant_restrictive" ON public."Recanto_Assinaturas";
CREATE POLICY "assinaturas_tenant_restrictive" ON public."Recanto_Assinaturas" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "logs_empresa_tenant_restrictive" ON public."Recanto_Logs_Empresa";
CREATE POLICY "logs_empresa_tenant_restrictive" ON public."Recanto_Logs_Empresa" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "usuarios_tenant_restrictive" ON public."Recanto_Usuarios";
CREATE POLICY "usuarios_tenant_restrictive" ON public."Recanto_Usuarios" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "residentes_tenant_restrictive" ON public."Recanto_Residentes";
CREATE POLICY "residentes_tenant_restrictive" ON public."Recanto_Residentes" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "funcionarios_tenant_restrictive" ON public."Recanto_Funcionarios";
CREATE POLICY "funcionarios_tenant_restrictive" ON public."Recanto_Funcionarios" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "estoque_tenant_restrictive" ON public."Recanto_Estoque";
CREATE POLICY "estoque_tenant_restrictive" ON public."Recanto_Estoque" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "registros_financeiros_tenant_restrictive" ON public."Recanto_RegistrosFinanceiros";
CREATE POLICY "registros_financeiros_tenant_restrictive" ON public."Recanto_RegistrosFinanceiros" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "eventos_tenant_restrictive" ON public."Recanto_Eventos";
CREATE POLICY "eventos_tenant_restrictive" ON public."Recanto_Eventos" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "treinamentos_tenant_restrictive" ON public."Recanto_Treinamentos";
CREATE POLICY "treinamentos_tenant_restrictive" ON public."Recanto_Treinamentos" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "logs_acesso_tenant_restrictive" ON public."Recanto_LogsAcesso";
CREATE POLICY "logs_acesso_tenant_restrictive" ON public."Recanto_LogsAcesso" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "quartos_tenant_restrictive" ON public."Recanto_Quartos";
CREATE POLICY "quartos_tenant_restrictive" ON public."Recanto_Quartos" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "perfis_tenant_restrictive" ON public."Recanto_Perfis";
CREATE POLICY "perfis_tenant_restrictive" ON public."Recanto_Perfis" AS RESTRICTIVE FOR ALL TO authenticated USING (empresa_id = public.recanto_get_empresa_id()) WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Tabelas secundárias / vinculadas indiretamente
DROP POLICY IF EXISTS "permissoes_tenant_restrictive" ON public."Recanto_Permissoes";
CREATE POLICY "permissoes_tenant_restrictive" ON public."Recanto_Permissoes" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Perfis" p WHERE p.id = profile_id AND p.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "alergias_tenant_restrictive" ON public."Recanto_Alergias";
CREATE POLICY "alergias_tenant_restrictive" ON public."Recanto_Alergias" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "contatos_emergencia_tenant_restrictive" ON public."Recanto_ContatosEmergencia";
CREATE POLICY "contatos_emergencia_tenant_restrictive" ON public."Recanto_ContatosEmergencia" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "responsaveis_legais_tenant_restrictive" ON public."Recanto_ResponsaveisLegais";
CREATE POLICY "responsaveis_legais_tenant_restrictive" ON public."Recanto_ResponsaveisLegais" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "medicacoes_tenant_restrictive" ON public."Recanto_Medicacoes";
CREATE POLICY "medicacoes_tenant_restrictive" ON public."Recanto_Medicacoes" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "logs_medicacao_tenant_restrictive" ON public."Recanto_LogsMedicacao";
CREATE POLICY "logs_medicacao_tenant_restrictive" ON public."Recanto_LogsMedicacao" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Medicacoes" m JOIN public."Recanto_Residentes" r ON m.resident_id = r.id WHERE m.id = medication_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "sinais_vitais_tenant_restrictive" ON public."Recanto_SinaisVitais";
CREATE POLICY "sinais_vitais_tenant_restrictive" ON public."Recanto_SinaisVitais" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "planos_assistencia_tenant_restrictive" ON public."Recanto_PlanosAssistencia";
CREATE POLICY "planos_assistencia_tenant_restrictive" ON public."Recanto_PlanosAssistencia" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "checklist_diario_tenant_restrictive" ON public."Recanto_ChecklistDiario";
CREATE POLICY "checklist_diario_tenant_restrictive" ON public."Recanto_ChecklistDiario" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "logs_auditoria_tenant_restrictive" ON public."Recanto_LogsAuditoria";
CREATE POLICY "logs_auditoria_tenant_restrictive" ON public."Recanto_LogsAuditoria" AS RESTRICTIVE FOR ALL TO authenticated USING (resident_id IS NULL OR EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "documentos_tenant_restrictive" ON public."Recanto_Documentos";
CREATE POLICY "documentos_tenant_restrictive" ON public."Recanto_Documentos" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "planos_dieta_tenant_restrictive" ON public."Recanto_PlanosDieta";
CREATE POLICY "planos_dieta_tenant_restrictive" ON public."Recanto_PlanosDieta" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "restricoes_dieta_tenant_restrictive" ON public."Recanto_RestricoesDieta";
CREATE POLICY "restricoes_dieta_tenant_restrictive" ON public."Recanto_RestricoesDieta" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_PlanosDieta" pd JOIN public."Recanto_Residentes" r ON pd.resident_id = r.id WHERE pd.id = diet_plan_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "logs_nutricao_tenant_restrictive" ON public."Recanto_LogsNutricao";
CREATE POLICY "logs_nutricao_tenant_restrictive" ON public."Recanto_LogsNutricao" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "contratos_tenant_restrictive" ON public."Recanto_Contratos";
CREATE POLICY "contratos_tenant_restrictive" ON public."Recanto_Contratos" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "mensalidades_tenant_restrictive" ON public."Recanto_Mensalidades";
CREATE POLICY "mensalidades_tenant_restrictive" ON public."Recanto_Mensalidades" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "movimentacoes_estoque_tenant_restrictive" ON public."Recanto_MovimentacoesEstoque";
CREATE POLICY "movimentacoes_estoque_tenant_restrictive" ON public."Recanto_MovimentacoesEstoque" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Estoque" e WHERE e.id = stock_item_id AND e.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "treinamentos_participantes_tenant_restrictive" ON public."Recanto_TreinamentosParticipantes";
CREATE POLICY "treinamentos_participantes_tenant_restrictive" ON public."Recanto_TreinamentosParticipantes" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Treinamentos" t WHERE t.id = training_id AND t.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "visitas_tenant_restrictive" ON public."Recanto_Visitas";
CREATE POLICY "visitas_tenant_restrictive" ON public."Recanto_Visitas" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Residentes" r WHERE r.id = resident_id AND r.empresa_id = public.recanto_get_empresa_id()));

DROP POLICY IF EXISTS "certificados_tenant_restrictive" ON public."Recanto_Certificados";
CREATE POLICY "certificados_tenant_restrictive" ON public."Recanto_Certificados" AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public."Recanto_Usuarios" u WHERE u.auth_user_id = auth_user_id AND u.empresa_id = public.recanto_get_empresa_id()));
