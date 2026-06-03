-- ==========================================================================
-- RECANTO DOS ANCIÃOS — DROP completo do schema public
-- Executa o inverso exato de 20260603000001_schema_completo.sql
--
-- ATENÇÃO: destrói todos os dados. Execute apenas em ambiente de dev/reset.
-- Ordem: tabelas filhas → tabelas pai → funções → ENUMs
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 1. TABELAS (ordem inversa de dependência de FK)
--    DROP TABLE ... CASCADE remove automaticamente:
--      • triggers associados
--      • índices
--      • policies RLS
--      • constraints (FK, CHECK, UNIQUE)
-- --------------------------------------------------------------------------

-- RBAC
DROP TABLE IF EXISTS "Recanto_Usuarios"                  CASCADE;
DROP TABLE IF EXISTS "Recanto_Permissoes"                CASCADE;
DROP TABLE IF EXISTS "Recanto_Perfis"                    CASCADE;

-- Agenda
DROP TABLE IF EXISTS "Recanto_Eventos"                   CASCADE;

-- Equipe
DROP TABLE IF EXISTS "Recanto_LogsAcesso"                CASCADE;
DROP TABLE IF EXISTS "Recanto_TreinamentosParticipantes" CASCADE;
DROP TABLE IF EXISTS "Recanto_Treinamentos"              CASCADE;
DROP TABLE IF EXISTS "Recanto_Funcionarios"              CASCADE;

-- Estoque
DROP TABLE IF EXISTS "Recanto_MovimentacoesEstoque"      CASCADE;
DROP TABLE IF EXISTS "Recanto_Estoque"                   CASCADE;

-- Financeiro
DROP TABLE IF EXISTS "Recanto_RegistrosFinanceiros"      CASCADE;
DROP TABLE IF EXISTS "Recanto_Mensalidades"              CASCADE;
DROP TABLE IF EXISTS "Recanto_Contratos"                 CASCADE;

-- Nutrição
DROP TABLE IF EXISTS "Recanto_LogsNutricao"              CASCADE;
DROP TABLE IF EXISTS "Recanto_RestricoesDieta"           CASCADE;
DROP TABLE IF EXISTS "Recanto_PlanosDieta"               CASCADE;

-- Prontuário
DROP TABLE IF EXISTS "Recanto_Documentos"                CASCADE;
DROP TABLE IF EXISTS "Recanto_LogsAuditoria"             CASCADE;

-- Saúde
DROP TABLE IF EXISTS "Recanto_ChecklistDiario"           CASCADE;
DROP TABLE IF EXISTS "Recanto_PlanosAssistencia"         CASCADE;
DROP TABLE IF EXISTS "Recanto_SinaisVitais"              CASCADE;
DROP TABLE IF EXISTS "Recanto_LogsMedicacao"             CASCADE;
DROP TABLE IF EXISTS "Recanto_Medicacoes"                CASCADE;

-- Residentes (base de tudo)
DROP TABLE IF EXISTS "Recanto_ResponsaveisLegais"        CASCADE;
DROP TABLE IF EXISTS "Recanto_ContatosEmergencia"        CASCADE;
DROP TABLE IF EXISTS "Recanto_Alergias"                  CASCADE;
DROP TABLE IF EXISTS "Recanto_Residentes"                CASCADE;


-- --------------------------------------------------------------------------
-- 2. FUNÇÕES
-- --------------------------------------------------------------------------

DROP FUNCTION IF EXISTS recanto_get_resident_id()  CASCADE;
DROP FUNCTION IF EXISTS recanto_get_profile_type() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()           CASCADE;


-- --------------------------------------------------------------------------
-- 3. ENUMs (só podem ser dropados após as tabelas que os usam)
-- --------------------------------------------------------------------------

DROP TYPE IF EXISTS recanto_acao_acesso         CASCADE;
DROP TYPE IF EXISTS recanto_acao_permissao      CASCADE;
DROP TYPE IF EXISTS recanto_tipo_perfil         CASCADE;
DROP TYPE IF EXISTS recanto_tipo_evento         CASCADE;
DROP TYPE IF EXISTS recanto_status_funcionario  CASCADE;
DROP TYPE IF EXISTS recanto_turno               CASCADE;
DROP TYPE IF EXISTS recanto_cargo_funcionario   CASCADE;
DROP TYPE IF EXISTS recanto_tipo_movimentacao   CASCADE;
DROP TYPE IF EXISTS recanto_categoria_estoque   CASCADE;
DROP TYPE IF EXISTS recanto_status_financeiro   CASCADE;
DROP TYPE IF EXISTS recanto_tipo_financeiro     CASCADE;
DROP TYPE IF EXISTS recanto_status_mensalidade  CASCADE;
DROP TYPE IF EXISTS recanto_status_contrato     CASCADE;
DROP TYPE IF EXISTS recanto_refeicao            CASCADE;
DROP TYPE IF EXISTS recanto_tipo_dieta          CASCADE;
DROP TYPE IF EXISTS recanto_consistencia_dieta  CASCADE;
DROP TYPE IF EXISTS recanto_tipo_documento      CASCADE;
DROP TYPE IF EXISTS recanto_status_plano        CASCADE;
DROP TYPE IF EXISTS recanto_status_medicacao    CASCADE;
DROP TYPE IF EXISTS recanto_grau_dependencia    CASCADE;
DROP TYPE IF EXISTS recanto_status_quarto       CASCADE;
