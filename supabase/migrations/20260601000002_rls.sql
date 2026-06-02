-- =============================================================================
-- Recanto dos Anciãos — Row Level Security (RLS)
-- Migração: 20260601000002_rls.sql
--
-- Modelo de permissões:
--   Admin         → acesso total a todos os módulos
--   Médico        → leitura de todos os módulos clínicos; edição de prontuário
--   Enfermeiro    → checklists, sinais vitais, logs de medicamentos, documentos
--   Cuidador      → checklists diários; leitura de medicamentos e plano alimentar
--   Nutricionista → módulo de nutrição; leitura de residentes
--   Fisioterapeuta→ planos de cuidado; leitura de residentes
-- =============================================================================

-- Função auxiliar: retorna o role do funcionário logado
CREATE OR REPLACE FUNCTION recanto_current_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM "Recanto_Funcionarios"
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Função auxiliar: verifica se o usuário tem um dos roles informados
CREATE OR REPLACE FUNCTION recanto_has_role(VARIADIC roles text[])
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Recanto_Funcionarios"
    WHERE auth_user_id = auth.uid()
      AND role = ANY(roles)
  );
$$;

-- =============================================================================
-- Habilitar RLS em todas as tabelas
-- =============================================================================

ALTER TABLE "Recanto_Funcionarios"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Residentes"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_ContatosEmergencia"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_ResponsaveisLegais"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Medicamentos"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsMedicamentos"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_SinaisVitais"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_PlanosCuidado"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_ChecklistsDiarios"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Documentos"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_PlanosAlimentares"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsNutricionais"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Contratos"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Faturas"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LancamentosFinanceiros"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Estoque"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_MovimentacoesEstoque"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Treinamentos"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_ParticipantesTreinamento"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsAcesso"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsAuditoria"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Eventos"                   ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- FUNCIONÁRIOS
-- Admin vê tudo; cada funcionário vê seu próprio registro
-- =============================================================================

CREATE POLICY "funcionarios_select" ON "Recanto_Funcionarios"
  FOR SELECT USING (
    recanto_has_role('Admin')
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "funcionarios_insert" ON "Recanto_Funcionarios"
  FOR INSERT WITH CHECK (recanto_has_role('Admin'));

CREATE POLICY "funcionarios_update" ON "Recanto_Funcionarios"
  FOR UPDATE USING (
    recanto_has_role('Admin')
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "funcionarios_delete" ON "Recanto_Funcionarios"
  FOR DELETE USING (recanto_has_role('Admin'));

-- =============================================================================
-- RESIDENTES — leitura para todos os profissionais; escrita para Admin/Médico/Enfermeiro
-- =============================================================================

CREATE POLICY "residentes_select" ON "Recanto_Residentes"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );

CREATE POLICY "residentes_insert" ON "Recanto_Residentes"
  FOR INSERT WITH CHECK (recanto_has_role('Admin','Médico','Enfermeiro'));

CREATE POLICY "residentes_update" ON "Recanto_Residentes"
  FOR UPDATE USING (recanto_has_role('Admin','Médico','Enfermeiro'));

CREATE POLICY "residentes_delete" ON "Recanto_Residentes"
  FOR DELETE USING (recanto_has_role('Admin'));

-- Políticas derivadas (mesma lógica para dados vinculados ao residente)
-- Helper: todos os profissionais lêem, Admin/Médico/Enfermeiro escrevem

CREATE POLICY "contatos_select" ON "Recanto_ContatosEmergencia"
  FOR SELECT USING (recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta'));
CREATE POLICY "contatos_write" ON "Recanto_ContatosEmergencia"
  FOR ALL USING (recanto_has_role('Admin','Médico','Enfermeiro'));

CREATE POLICY "responsaveis_select" ON "Recanto_ResponsaveisLegais"
  FOR SELECT USING (recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta'));
CREATE POLICY "responsaveis_write" ON "Recanto_ResponsaveisLegais"
  FOR ALL USING (recanto_has_role('Admin','Médico','Enfermeiro'));

-- =============================================================================
-- SAÚDE CLÍNICA
-- =============================================================================

-- Medicamentos: leitura para clínicos e cuidadores; escrita para Admin/Médico/Enfermeiro
CREATE POLICY "medicamentos_select" ON "Recanto_Medicamentos"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );
CREATE POLICY "medicamentos_write" ON "Recanto_Medicamentos"
  FOR ALL USING (recanto_has_role('Admin','Médico','Enfermeiro'));

-- Logs de medicamentos: leitura para clínicos; registro para Enfermeiro/Cuidador
CREATE POLICY "logs_med_select" ON "Recanto_LogsMedicamentos"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador')
  );
CREATE POLICY "logs_med_insert" ON "Recanto_LogsMedicamentos"
  FOR INSERT WITH CHECK (recanto_has_role('Admin','Médico','Enfermeiro','Cuidador'));
CREATE POLICY "logs_med_update" ON "Recanto_LogsMedicamentos"
  FOR UPDATE USING (recanto_has_role('Admin','Médico','Enfermeiro'));
CREATE POLICY "logs_med_delete" ON "Recanto_LogsMedicamentos"
  FOR DELETE USING (recanto_has_role('Admin'));

-- Sinais vitais: leitura para todos; registro para Enfermeiro/Médico
CREATE POLICY "sinais_select" ON "Recanto_SinaisVitais"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );
CREATE POLICY "sinais_write" ON "Recanto_SinaisVitais"
  FOR ALL USING (recanto_has_role('Admin','Médico','Enfermeiro'));

-- Planos de cuidado: leitura ampla; escrita para profissionais terapêuticos
CREATE POLICY "planos_select" ON "Recanto_PlanosCuidado"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Fisioterapeuta')
  );
CREATE POLICY "planos_write" ON "Recanto_PlanosCuidado"
  FOR ALL USING (recanto_has_role('Admin','Médico','Enfermeiro','Fisioterapeuta'));

-- Checklists: leitura para clínicos; registro para Enfermeiro/Cuidador
CREATE POLICY "checklists_select" ON "Recanto_ChecklistsDiarios"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador')
  );
CREATE POLICY "checklists_insert" ON "Recanto_ChecklistsDiarios"
  FOR INSERT WITH CHECK (recanto_has_role('Admin','Médico','Enfermeiro','Cuidador'));
CREATE POLICY "checklists_update" ON "Recanto_ChecklistsDiarios"
  FOR UPDATE USING (recanto_has_role('Admin','Médico','Enfermeiro'));
CREATE POLICY "checklists_delete" ON "Recanto_ChecklistsDiarios"
  FOR DELETE USING (recanto_has_role('Admin'));

-- Documentos: leitura para todos os profissionais; upload para Enfermeiro/Médico/Admin
CREATE POLICY "docs_select" ON "Recanto_Documentos"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );
CREATE POLICY "docs_write" ON "Recanto_Documentos"
  FOR ALL USING (recanto_has_role('Admin','Médico','Enfermeiro'));

-- =============================================================================
-- NUTRIÇÃO
-- =============================================================================

CREATE POLICY "plano_alim_select" ON "Recanto_PlanosAlimentares"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista')
  );
CREATE POLICY "plano_alim_write" ON "Recanto_PlanosAlimentares"
  FOR ALL USING (recanto_has_role('Admin','Médico','Nutricionista'));

CREATE POLICY "logs_nut_select" ON "Recanto_LogsNutricionais"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista')
  );
CREATE POLICY "logs_nut_insert" ON "Recanto_LogsNutricionais"
  FOR INSERT WITH CHECK (recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista'));
CREATE POLICY "logs_nut_update" ON "Recanto_LogsNutricionais"
  FOR UPDATE USING (recanto_has_role('Admin','Nutricionista'));
CREATE POLICY "logs_nut_delete" ON "Recanto_LogsNutricionais"
  FOR DELETE USING (recanto_has_role('Admin'));

-- =============================================================================
-- FINANCEIRO — restrito a Admin
-- =============================================================================

CREATE POLICY "contratos_select" ON "Recanto_Contratos"
  FOR SELECT USING (recanto_has_role('Admin'));
CREATE POLICY "contratos_write" ON "Recanto_Contratos"
  FOR ALL USING (recanto_has_role('Admin'));

CREATE POLICY "faturas_select" ON "Recanto_Faturas"
  FOR SELECT USING (recanto_has_role('Admin'));
CREATE POLICY "faturas_write" ON "Recanto_Faturas"
  FOR ALL USING (recanto_has_role('Admin'));

CREATE POLICY "lancamentos_select" ON "Recanto_LancamentosFinanceiros"
  FOR SELECT USING (recanto_has_role('Admin'));
CREATE POLICY "lancamentos_write" ON "Recanto_LancamentosFinanceiros"
  FOR ALL USING (recanto_has_role('Admin'));

-- =============================================================================
-- ESTOQUE — Admin e Enfermeiro
-- =============================================================================

CREATE POLICY "estoque_select" ON "Recanto_Estoque"
  FOR SELECT USING (recanto_has_role('Admin','Enfermeiro','Médico'));
CREATE POLICY "estoque_write" ON "Recanto_Estoque"
  FOR ALL USING (recanto_has_role('Admin','Enfermeiro'));

CREATE POLICY "movimentacoes_select" ON "Recanto_MovimentacoesEstoque"
  FOR SELECT USING (recanto_has_role('Admin','Enfermeiro','Médico'));
CREATE POLICY "movimentacoes_insert" ON "Recanto_MovimentacoesEstoque"
  FOR INSERT WITH CHECK (recanto_has_role('Admin','Enfermeiro'));
CREATE POLICY "movimentacoes_delete" ON "Recanto_MovimentacoesEstoque"
  FOR DELETE USING (recanto_has_role('Admin'));

-- =============================================================================
-- TREINAMENTOS — Admin gerencia; todos vêem os próprios
-- =============================================================================

CREATE POLICY "treinamentos_select" ON "Recanto_Treinamentos"
  FOR SELECT USING (recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta'));
CREATE POLICY "treinamentos_write" ON "Recanto_Treinamentos"
  FOR ALL USING (recanto_has_role('Admin'));

CREATE POLICY "participantes_select" ON "Recanto_ParticipantesTreinamento"
  FOR SELECT USING (recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta'));
CREATE POLICY "participantes_write" ON "Recanto_ParticipantesTreinamento"
  FOR ALL USING (recanto_has_role('Admin'));

-- =============================================================================
-- LOGS DE ACESSO E AUDITORIA — somente leitura para Admin
-- =============================================================================

CREATE POLICY "logs_acesso_select" ON "Recanto_LogsAcesso"
  FOR SELECT USING (recanto_has_role('Admin'));
CREATE POLICY "logs_acesso_insert" ON "Recanto_LogsAcesso"
  FOR INSERT WITH CHECK (
    -- Qualquer funcionário autenticado pode registrar seu próprio acesso
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );

CREATE POLICY "logs_audit_select" ON "Recanto_LogsAuditoria"
  FOR SELECT USING (recanto_has_role('Admin','Médico'));
CREATE POLICY "logs_audit_insert" ON "Recanto_LogsAuditoria"
  FOR INSERT WITH CHECK (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );

-- =============================================================================
-- AGENDA — todos vêem; qualquer profissional pode criar; dono ou Admin pode editar
-- =============================================================================

CREATE POLICY "eventos_select" ON "Recanto_Eventos"
  FOR SELECT USING (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );

CREATE POLICY "eventos_insert" ON "Recanto_Eventos"
  FOR INSERT WITH CHECK (
    recanto_has_role('Admin','Médico','Enfermeiro','Cuidador','Nutricionista','Fisioterapeuta')
  );

CREATE POLICY "eventos_update" ON "Recanto_Eventos"
  FOR UPDATE USING (
    recanto_has_role('Admin')
    OR employee_id = (
      SELECT id FROM "Recanto_Funcionarios" WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "eventos_delete" ON "Recanto_Eventos"
  FOR DELETE USING (
    recanto_has_role('Admin')
    OR employee_id = (
      SELECT id FROM "Recanto_Funcionarios" WHERE auth_user_id = auth.uid()
    )
  );
