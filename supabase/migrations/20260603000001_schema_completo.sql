-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Schema Completo Supabase
-- Data: 2026-06-03
-- Prefixo de tabelas: Recanto_
-- 27 tabelas · 9 módulos · ENUMs · Triggers de updated_at · RLS completo
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 0. TIPOS CUSTOMIZADOS (ENUMs)
-- --------------------------------------------------------------------------

CREATE TYPE recanto_status_quarto        AS ENUM ('Ocupado','Vago','Em Limpeza','Manutenção','Reservado');
CREATE TYPE recanto_grau_dependencia     AS ENUM ('I','II','III');
CREATE TYPE recanto_status_medicacao     AS ENUM ('administrado','recusado','atrasado');
CREATE TYPE recanto_status_plano         AS ENUM ('ativo','concluido','suspenso');
CREATE TYPE recanto_tipo_documento       AS ENUM ('exame','laudo','receita','documento_pessoal','outro');
CREATE TYPE recanto_consistencia_dieta   AS ENUM ('Geral','Branda','Pastosa','Líquida','Líquida-Pastosa');
CREATE TYPE recanto_tipo_dieta           AS ENUM ('Livre','Hipossódica','Diabética','Hipolipídica','Hiperproteica');
CREATE TYPE recanto_refeicao             AS ENUM ('Café da Manhã','Colação','Almoço','Lanche da Tarde','Jantar','Ceia');
CREATE TYPE recanto_status_contrato      AS ENUM ('Ativo','Suspenso','Finalizado');
CREATE TYPE recanto_status_mensalidade   AS ENUM ('Pendente','Pago','Atrasado');
CREATE TYPE recanto_tipo_financeiro      AS ENUM ('receita','despesa');
CREATE TYPE recanto_status_financeiro    AS ENUM ('pago','pendente');
CREATE TYPE recanto_categoria_estoque    AS ENUM ('medicamento','insumo','alimento');
CREATE TYPE recanto_tipo_movimentacao    AS ENUM ('entrada','saida','ajuste');
CREATE TYPE recanto_cargo_funcionario    AS ENUM ('Admin','Enfermeiro','Cuidador','Médico','Nutricionista','Fisioterapeuta');
CREATE TYPE recanto_turno                AS ENUM ('Matutino','Vespertino','Noturno','12x36');
CREATE TYPE recanto_status_funcionario   AS ENUM ('Ativo','Férias','Afastado');
CREATE TYPE recanto_tipo_evento          AS ENUM ('medico','visita','terapia','atividade','reuniao','outro');
CREATE TYPE recanto_tipo_perfil          AS ENUM ('Administrador','Médico','Cuidador','Responsável');
CREATE TYPE recanto_acao_permissao       AS ENUM ('view','edit','create','delete');
CREATE TYPE recanto_acao_acesso          AS ENUM ('Login','Logout','Visualização Prontuário','Edição Financeira','Exportação Dados');


-- --------------------------------------------------------------------------
-- 0.1 FUNÇÃO AUXILIAR: atualiza updated_at automaticamente
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================================================
-- MÓDULO 1: RESIDENTES
-- ==========================================================================

CREATE TABLE "Recanto_Residentes" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  cpf                  TEXT UNIQUE,
  rg                   TEXT,
  birth_date           DATE,
  age                  INTEGER,
  room                 TEXT NOT NULL,
  room_status          recanto_status_quarto    NOT NULL DEFAULT 'Ocupado',
  care_level           recanto_grau_dependencia NOT NULL DEFAULT 'I',
  photo_url            TEXT,
  admission_date       DATE NOT NULL,
  clinical_condition   TEXT,
  functional_condition TEXT,
  social_history       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_residentes_updated_at
  BEFORE UPDATE ON "Recanto_Residentes"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_Alergias" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_ContatosEmergencia" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  relation    TEXT NOT NULL,
  phone       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_ResponsaveisLegais" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  cpf         TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================================================
-- MÓDULO 2: SAÚDE — MEDICAÇÕES
-- ==========================================================================

CREATE TABLE "Recanto_Medicacoes" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  dosage      TEXT NOT NULL,
  route       TEXT NOT NULL,   -- Via: Oral, EV, IM, SC, Tópica...
  frequency   TEXT NOT NULL,
  next_dose   TEXT,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_medicacoes_updated_at
  BEFORE UPDATE ON "Recanto_Medicacoes"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_LogsMedicacao" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id   UUID NOT NULL REFERENCES "Recanto_Medicacoes"(id) ON DELETE CASCADE,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  administered_by TEXT NOT NULL,
  status          recanto_status_medicacao NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_medicacao_med_ts ON "Recanto_LogsMedicacao"(medication_id, timestamp DESC);


-- ==========================================================================
-- MÓDULO 3: SAÚDE — SINAIS VITAIS
-- ==========================================================================

CREATE TABLE "Recanto_SinaisVitais" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bp          TEXT,                     -- Pressão Arterial (ex: "120/80")
  hr          INTEGER,                  -- Frequência Cardíaca (bpm)
  temp        NUMERIC(4,1),             -- Temperatura (°C)
  spo2        INTEGER,                  -- Saturação de O₂ (%)
  pain_level  INTEGER CHECK (pain_level IS NULL OR pain_level BETWEEN 0 AND 10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sinais_vitais_resident_ts ON "Recanto_SinaisVitais"(resident_id, timestamp DESC);


-- ==========================================================================
-- MÓDULO 4: SAÚDE — PLANO DE CUIDADOS
-- ==========================================================================

CREATE TABLE "Recanto_PlanosAssistencia" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  frequency   TEXT,
  assigned_to TEXT,
  status      recanto_status_plano NOT NULL DEFAULT 'ativo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_planos_assistencia_updated_at
  BEFORE UPDATE ON "Recanto_PlanosAssistencia"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ==========================================================================
-- MÓDULO 5: SAÚDE — CHECKLIST DIÁRIO
-- ==========================================================================

CREATE TABLE "Recanto_ChecklistDiario" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  date        DATE NOT NULL,

  -- Itens básicos de rotina
  hygiene     BOOLEAN NOT NULL DEFAULT FALSE,
  oral_care   BOOLEAN NOT NULL DEFAULT FALSE,
  feeding     BOOLEAN NOT NULL DEFAULT FALSE,
  hydration   BOOLEAN NOT NULL DEFAULT FALSE,
  mobility    BOOLEAN NOT NULL DEFAULT FALSE,
  dressings   BOOLEAN NOT NULL DEFAULT FALSE,
  leisure     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Avaliação clínica detalhada
  queixa_dor               TEXT CHECK (queixa_dor IN ('nao','sim')),
  queixa_dor_desc          TEXT,
  estado_neurologico       TEXT,
  ar_ambiente              BOOLEAN,
  alimentacao              TEXT CHECK (alimentacao IN ('boa','moderada','ruim')),
  alimentacao_desc         TEXT,
  agitado                  BOOLEAN,
  prostrado                BOOLEAN,
  sonolento                BOOLEAN,
  eliminacao_evacuacao      TEXT CHECK (eliminacao_evacuacao IN ('presente','ausente')),
  eliminacao_evacuacao_dias TEXT,
  aspecto_evacuacoes       TEXT CHECK (aspecto_evacuacoes IN ('endurecidas','pastosa','semi-liquidas','liquida-diarreia')),
  diurese                  TEXT CHECK (diurese IN ('ausente','aumentada','diminuida')),
  diurese_aspecto          TEXT CHECK (diurese_aspecto IN ('clara','concentrada','odor-sangue-ardencia')),
  uso_fraldas              TEXT CHECK (uso_fraldas IN ('sim','nao')),
  mobilidade_set           TEXT CHECK (mobilidade_set IN ('independente','auxilio','acamado')),
  higiene_corporal         TEXT CHECK (higiene_corporal IN ('independente','auxilio')),
  higiene_oral_vestir      TEXT CHECK (higiene_oral_vestir IN ('independente','auxilio')),
  alteracoes_pele          TEXT CHECK (alteracoes_pele IN ('nao','sim')),
  alteracoes_pele_desc     TEXT,
  sono                     TEXT CHECK (sono IN ('preservado','insatisfatorio')),
  sono_desc                TEXT,
  medicacoes_administradas TEXT,
  atividades_consulta      TEXT,
  intercorrencia           TEXT CHECK (intercorrencia IN ('sim','nao')),
  intercorrencia_desc      TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(resident_id, date)
);

CREATE TRIGGER trg_checklist_updated_at
  BEFORE UPDATE ON "Recanto_ChecklistDiario"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_checklist_resident_date ON "Recanto_ChecklistDiario"(resident_id, date DESC);


-- ==========================================================================
-- MÓDULO 6: PRONTUÁRIO — AUDITORIA E DOCUMENTOS
-- ==========================================================================

CREATE TABLE "Recanto_LogsAuditoria" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES "Recanto_Residentes"(id) ON DELETE SET NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  action      TEXT NOT NULL,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_auditoria_resident ON "Recanto_LogsAuditoria"(resident_id, timestamp DESC);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_Documentos" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        recanto_tipo_documento NOT NULL,
  url         TEXT NOT NULL,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================================================
-- MÓDULO 7: NUTRIÇÃO
-- ==========================================================================

CREATE TABLE "Recanto_PlanosDieta" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id       UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  consistency       recanto_consistencia_dieta NOT NULL DEFAULT 'Geral',
  type              recanto_tipo_dieta         NOT NULL DEFAULT 'Livre',
  fluid_restriction TEXT,
  observations      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_planos_dieta_updated_at
  BEFORE UPDATE ON "Recanto_PlanosDieta"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_RestricoesDieta" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id UUID NOT NULL REFERENCES "Recanto_PlanosDieta"(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_LogsNutricao" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  meal         recanto_refeicao NOT NULL,
  acceptance   INTEGER NOT NULL CHECK (acceptance BETWEEN 0 AND 100),
  fluid_intake INTEGER,        -- em ml
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_nutricao_resident_date ON "Recanto_LogsNutricao"(resident_id, date DESC);


-- ==========================================================================
-- MÓDULO 8: FINANCEIRO
-- ==========================================================================

CREATE TABLE "Recanto_Contratos" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE RESTRICT,
  start_date    DATE NOT NULL,
  end_date      DATE,
  monthly_value NUMERIC(10,2) NOT NULL,
  due_day       INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  status        recanto_status_contrato NOT NULL DEFAULT 'Ativo',
  file_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON "Recanto_Contratos"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_Mensalidades" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES "Recanto_Contratos"(id) ON DELETE RESTRICT,
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE RESTRICT,
  amount      NUMERIC(10,2) NOT NULL,
  due_date    DATE NOT NULL,
  status      recanto_status_mensalidade NOT NULL DEFAULT 'Pendente',
  month_year  TEXT NOT NULL,   -- formato "MM/YYYY"
  paid_date   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_mensalidades_updated_at
  BEFORE UPDATE ON "Recanto_Mensalidades"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_mensalidades_status ON "Recanto_Mensalidades"(status);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_RegistrosFinanceiros" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        recanto_tipo_financeiro NOT NULL,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  date        DATE NOT NULL,
  status      recanto_status_financeiro NOT NULL DEFAULT 'pendente',
  invoice_id  UUID REFERENCES "Recanto_Mensalidades"(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_registros_fin_updated_at
  BEFORE UPDATE ON "Recanto_RegistrosFinanceiros"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_registros_fin_date ON "Recanto_RegistrosFinanceiros"(date DESC);
CREATE INDEX idx_registros_fin_type ON "Recanto_RegistrosFinanceiros"(type);


-- ==========================================================================
-- MÓDULO 9: ESTOQUE
-- ==========================================================================

CREATE TABLE "Recanto_Estoque" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      recanto_categoria_estoque NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit          TEXT NOT NULL DEFAULT 'unid',
  min_threshold INTEGER NOT NULL DEFAULT 10,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_estoque_updated_at
  BEFORE UPDATE ON "Recanto_Estoque"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_MovimentacoesEstoque" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID NOT NULL REFERENCES "Recanto_Estoque"(id) ON DELETE CASCADE,
  type          recanto_tipo_movimentacao NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_name     TEXT NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimentacoes_estoque_item ON "Recanto_MovimentacoesEstoque"(stock_item_id, date DESC);


-- ==========================================================================
-- MÓDULO 10: EQUIPE
-- ==========================================================================

CREATE TABLE "Recanto_Funcionarios" (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  role                recanto_cargo_funcionario NOT NULL,
  cpf                 TEXT UNIQUE NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT,
  registration_number TEXT,   -- CRM, COREN, CRN, CREFITO...
  is_technical_lead   BOOLEAN NOT NULL DEFAULT FALSE,
  shift               recanto_turno NOT NULL,
  status              recanto_status_funcionario NOT NULL DEFAULT 'Ativo',
  admission_date      DATE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_funcionarios_updated_at
  BEFORE UPDATE ON "Recanto_Funcionarios"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_Treinamentos" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  date        DATE NOT NULL,
  instructor  TEXT NOT NULL,
  valid_until DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_TreinamentosParticipantes" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id   UUID NOT NULL REFERENCES "Recanto_Treinamentos"(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(training_id, employee_id)
);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_LogsAcesso" (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    TEXT NOT NULL,
  user_name  TEXT NOT NULL,
  role       recanto_cargo_funcionario,
  action     recanto_acao_acesso NOT NULL,
  resource   TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_acesso_ts ON "Recanto_LogsAcesso"(timestamp DESC);


-- ==========================================================================
-- MÓDULO 11: AGENDA
-- ==========================================================================

CREATE TABLE "Recanto_Eventos" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  type        recanto_tipo_evento NOT NULL,
  resident_id UUID REFERENCES "Recanto_Residentes"(id) ON DELETE SET NULL,
  description TEXT,
  location    TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON "Recanto_Eventos"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_eventos_start_time ON "Recanto_Eventos"(start_time);
CREATE INDEX idx_eventos_resident  ON "Recanto_Eventos"(resident_id);


-- ==========================================================================
-- MÓDULO 12: AUTENTICAÇÃO E RBAC
-- ==========================================================================

CREATE TABLE "Recanto_Perfis" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        recanto_tipo_perfil NOT NULL,
  is_editable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_perfis_updated_at
  BEFORE UPDATE ON "Recanto_Perfis"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_Permissoes" (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES "Recanto_Perfis"(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,   -- valor do ViewState: DASHBOARD, RESIDENTS, FINANCE...
  actions    recanto_acao_permissao[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, module)
);

-- --------------------------------------------------------------------------

CREATE TABLE "Recanto_Usuarios" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  profile_id   UUID NOT NULL REFERENCES "Recanto_Perfis"(id) ON DELETE RESTRICT,
  resident_id  UUID REFERENCES "Recanto_Residentes"(id) ON DELETE SET NULL,  -- exclusivo para perfil Responsável
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON "Recanto_Usuarios"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ==========================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE "Recanto_Residentes"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Alergias"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_ContatosEmergencia"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_ResponsaveisLegais"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Medicacoes"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsMedicacao"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_SinaisVitais"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_PlanosAssistencia"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_ChecklistDiario"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsAuditoria"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Documentos"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_PlanosDieta"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_RestricoesDieta"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsNutricao"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Contratos"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Mensalidades"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_RegistrosFinanceiros"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Estoque"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_MovimentacoesEstoque"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Funcionarios"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Treinamentos"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_TreinamentosParticipantes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_LogsAcesso"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Eventos"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Perfis"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Permissoes"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recanto_Usuarios"                 ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------------
-- Funções helper (SECURITY DEFINER para evitar recursão)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recanto_get_profile_type()
RETURNS TEXT AS $$
  SELECT p.type::TEXT
  FROM "Recanto_Usuarios" u
  JOIN "Recanto_Perfis" p ON u.profile_id = p.id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recanto_get_resident_id()
RETURNS UUID AS $$
  SELECT resident_id
  FROM "Recanto_Usuarios"
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- --------------------------------------------------------------------------
-- Políticas: Residentes
-- --------------------------------------------------------------------------

CREATE POLICY "residentes_select" ON "Recanto_Residentes" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND id = recanto_get_resident_id())
  );

CREATE POLICY "residentes_insert" ON "Recanto_Residentes" FOR INSERT
  WITH CHECK (recanto_get_profile_type() IN ('Administrador','Médico'));

CREATE POLICY "residentes_update" ON "Recanto_Residentes" FOR UPDATE
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

CREATE POLICY "residentes_delete" ON "Recanto_Residentes" FOR DELETE
  USING (recanto_get_profile_type() = 'Administrador');


-- --------------------------------------------------------------------------
-- Políticas: Dados de saúde do residente
-- Equipe clínica (Admin, Médico, Cuidador) lê tudo; Responsável lê só o seu
-- Escrita: Admin e Médico
-- --------------------------------------------------------------------------

-- Macro para aplicar padrão clínico (evita repetição)
-- Alergias
CREATE POLICY "alergias_select" ON "Recanto_Alergias" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "alergias_write" ON "Recanto_Alergias" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

-- Contatos de Emergência
CREATE POLICY "contatos_select" ON "Recanto_ContatosEmergencia" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "contatos_write" ON "Recanto_ContatosEmergencia" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

-- Responsável Legal
CREATE POLICY "resp_legais_select" ON "Recanto_ResponsaveisLegais" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "resp_legais_write" ON "Recanto_ResponsaveisLegais" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

-- Medicações
CREATE POLICY "medicacoes_select" ON "Recanto_Medicacoes" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "medicacoes_write" ON "Recanto_Medicacoes" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

-- Logs de Medicação
CREATE POLICY "logs_med_select" ON "Recanto_LogsMedicacao" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (
      recanto_get_profile_type() = 'Responsável'
      AND EXISTS (
        SELECT 1 FROM "Recanto_Medicacoes" m
        WHERE m.id = medication_id
          AND m.resident_id = recanto_get_resident_id()
      )
    )
  );
CREATE POLICY "logs_med_insert" ON "Recanto_LogsMedicacao" FOR INSERT
  WITH CHECK (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

-- Sinais Vitais
CREATE POLICY "sinais_vitais_select" ON "Recanto_SinaisVitais" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "sinais_vitais_write" ON "Recanto_SinaisVitais" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

-- Planos de Assistência
CREATE POLICY "planos_assist_select" ON "Recanto_PlanosAssistencia" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "planos_assist_write" ON "Recanto_PlanosAssistencia" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

-- Checklist Diário
CREATE POLICY "checklist_select" ON "Recanto_ChecklistDiario" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "checklist_write" ON "Recanto_ChecklistDiario" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

-- Logs de Auditoria do Prontuário
CREATE POLICY "logs_audit_select" ON "Recanto_LogsAuditoria" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "logs_audit_insert" ON "Recanto_LogsAuditoria" FOR INSERT
  WITH CHECK (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

-- Documentos
CREATE POLICY "documentos_select" ON "Recanto_Documentos" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "documentos_write" ON "Recanto_Documentos" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));


-- --------------------------------------------------------------------------
-- Políticas: Nutrição
-- --------------------------------------------------------------------------

CREATE POLICY "planos_dieta_select" ON "Recanto_PlanosDieta" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "planos_dieta_write" ON "Recanto_PlanosDieta" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

CREATE POLICY "restricoes_dieta_select" ON "Recanto_RestricoesDieta" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (
      recanto_get_profile_type() = 'Responsável'
      AND EXISTS (
        SELECT 1 FROM "Recanto_PlanosDieta" dp
        WHERE dp.id = diet_plan_id
          AND dp.resident_id = recanto_get_resident_id()
      )
    )
  );
CREATE POLICY "restricoes_dieta_write" ON "Recanto_RestricoesDieta" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

CREATE POLICY "logs_nutricao_select" ON "Recanto_LogsNutricao" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "logs_nutricao_write" ON "Recanto_LogsNutricao" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));


-- --------------------------------------------------------------------------
-- Políticas: Financeiro (exclusivo Administrador)
-- --------------------------------------------------------------------------

CREATE POLICY "contratos_admin" ON "Recanto_Contratos" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "mensalidades_admin" ON "Recanto_Mensalidades" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "registros_fin_admin" ON "Recanto_RegistrosFinanceiros" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');


-- --------------------------------------------------------------------------
-- Políticas: Estoque
-- --------------------------------------------------------------------------

CREATE POLICY "estoque_select" ON "Recanto_Estoque" FOR SELECT
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

CREATE POLICY "estoque_write" ON "Recanto_Estoque" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "movimentacoes_select" ON "Recanto_MovimentacoesEstoque" FOR SELECT
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

CREATE POLICY "movimentacoes_write" ON "Recanto_MovimentacoesEstoque" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Cuidador'));


-- --------------------------------------------------------------------------
-- Políticas: Equipe
-- --------------------------------------------------------------------------

CREATE POLICY "funcionarios_select" ON "Recanto_Funcionarios" FOR SELECT
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

CREATE POLICY "funcionarios_write" ON "Recanto_Funcionarios" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "treinamentos_select" ON "Recanto_Treinamentos" FOR SELECT
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

CREATE POLICY "treinamentos_write" ON "Recanto_Treinamentos" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "trein_part_select" ON "Recanto_TreinamentosParticipantes" FOR SELECT
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

CREATE POLICY "trein_part_write" ON "Recanto_TreinamentosParticipantes" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "logs_acesso_select" ON "Recanto_LogsAcesso" FOR SELECT
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "logs_acesso_insert" ON "Recanto_LogsAcesso" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- --------------------------------------------------------------------------
-- Políticas: Agenda
-- --------------------------------------------------------------------------

CREATE POLICY "eventos_select" ON "Recanto_Eventos" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (
      recanto_get_profile_type() = 'Responsável'
      AND (resident_id IS NULL OR resident_id = recanto_get_resident_id())
    )
  );

CREATE POLICY "eventos_write" ON "Recanto_Eventos" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));


-- --------------------------------------------------------------------------
-- Políticas: RBAC (Administrador exclusivo, usuário lê o próprio registro)
-- --------------------------------------------------------------------------

CREATE POLICY "perfis_admin" ON "Recanto_Perfis" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "permissoes_admin" ON "Recanto_Permissoes" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "usuarios_admin" ON "Recanto_Usuarios" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

CREATE POLICY "usuarios_self_select" ON "Recanto_Usuarios" FOR SELECT
  USING (auth_user_id = auth.uid());
