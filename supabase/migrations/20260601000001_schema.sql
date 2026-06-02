-- =============================================================================
-- Recanto dos Anciãos — Schema Principal
-- Migração: 20260601000001_schema.sql
-- Prefixo de tabelas: Recanto_
-- =============================================================================

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- MÓDULO 1: EQUIPE & RH
-- (criado antes de Residentes pois é referenciado como ator em logs)
-- =============================================================================

CREATE TABLE "Recanto_Funcionarios" (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text        NOT NULL,
  role            text        NOT NULL CHECK (role IN ('Admin','Enfermeiro','Cuidador','Médico','Nutricionista','Fisioterapeuta')),
  cpf             text        UNIQUE NOT NULL,
  email           text        UNIQUE NOT NULL,
  phone           text,
  registration_number text,   -- COREN, CRM, CRN, CREFITO etc.
  is_technical_lead boolean   NOT NULL DEFAULT false,
  shift           text        CHECK (shift IN ('Matutino','Vespertino','Noturno','12x36')),
  status          text        NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Férias','Afastado')),
  admission_date  date        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_funcionarios_role   ON "Recanto_Funcionarios" (role);
CREATE INDEX idx_funcionarios_status ON "Recanto_Funcionarios" (status);

-- =============================================================================
-- MÓDULO 2: RESIDENTES & PRONTUÁRIO
-- =============================================================================

CREATE TABLE "Recanto_Residentes" (
  id                   uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text  NOT NULL,
  cpf                  text  UNIQUE,
  rg                   text,
  birth_date           date,
  room                 text  NOT NULL,
  room_status          text  NOT NULL DEFAULT 'Ocupado' CHECK (room_status IN ('Ocupado','Vago','Em Limpeza','Manutenção','Reservado')),
  care_level           text  NOT NULL CHECK (care_level IN ('I','II','III')),
  photo_url            text,
  admission_date       date  NOT NULL,
  clinical_condition   text, -- Diagnósticos
  functional_condition text, -- Mobilidade, cognição
  social_history       text, -- Histórico familiar/social
  allergies            text[] NOT NULL DEFAULT '{}',
  active               boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_residentes_room       ON "Recanto_Residentes" (room);
CREATE INDEX idx_residentes_care_level ON "Recanto_Residentes" (care_level);
CREATE INDEX idx_residentes_active     ON "Recanto_Residentes" (active);

-- Contatos de emergência (1 residente → N contatos)
CREATE TABLE "Recanto_ContatosEmergencia" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        text NOT NULL,
  relation    text,
  phone       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contatos_resident ON "Recanto_ContatosEmergencia" (resident_id);

-- Responsável legal / curador (1 residente → máx. 1)
CREATE TABLE "Recanto_ResponsaveisLegais" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL UNIQUE REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        text NOT NULL,
  cpf         text,
  phone       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- MÓDULO 3: SAÚDE — SUBDEPENDENTES DE RESIDENTES
-- =============================================================================

-- Medicamentos prescritos
CREATE TABLE "Recanto_Medicamentos" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        text NOT NULL,
  dosage      text,
  route       text, -- Oral, EV, IM, SC, Tópico etc.
  frequency   text,
  next_dose   timestamptz,
  start_date  date,
  end_date    date,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicamentos_resident ON "Recanto_Medicamentos" (resident_id);
CREATE INDEX idx_medicamentos_active   ON "Recanto_Medicamentos" (active);
CREATE INDEX idx_medicamentos_next_dose ON "Recanto_Medicamentos" (next_dose) WHERE active = true;

-- Logs de administração de medicamentos
CREATE TABLE "Recanto_LogsMedicamentos" (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id    uuid NOT NULL REFERENCES "Recanto_Medicamentos"(id) ON DELETE CASCADE,
  resident_id      uuid NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  timestamp        timestamptz NOT NULL DEFAULT now(),
  administered_by  text NOT NULL,  -- Nome do profissional
  employee_id      uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  status           text NOT NULL CHECK (status IN ('administrado','recusado','atrasado')),
  note             text
);

CREATE INDEX idx_logs_med_medication ON "Recanto_LogsMedicamentos" (medication_id);
CREATE INDEX idx_logs_med_resident   ON "Recanto_LogsMedicamentos" (resident_id);
CREATE INDEX idx_logs_med_timestamp  ON "Recanto_LogsMedicamentos" (timestamp DESC);

-- Sinais vitais (série temporal)
CREATE TABLE "Recanto_SinaisVitais" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  timestamp   timestamptz NOT NULL DEFAULT now(),
  bp          text,       -- Pressão arterial ex: "130/85"
  hr          smallint,   -- Frequência cardíaca (bpm)
  temp        numeric(4,1), -- Temperatura (°C)
  spo2        smallint,   -- Saturação O₂ (%)
  pain_level  smallint CHECK (pain_level BETWEEN 0 AND 10),
  registered_by text,
  employee_id uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL
);

CREATE INDEX idx_sinais_resident  ON "Recanto_SinaisVitais" (resident_id);
CREATE INDEX idx_sinais_timestamp ON "Recanto_SinaisVitais" (timestamp DESC);

-- Planos de cuidado
CREATE TABLE "Recanto_PlanosCuidado" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  frequency   text,
  assigned_to text,
  employee_id uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','suspenso')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_planos_resident ON "Recanto_PlanosCuidado" (resident_id);
CREATE INDEX idx_planos_status   ON "Recanto_PlanosCuidado" (status);

-- Checklist diário de enfermagem
CREATE TABLE "Recanto_ChecklistsDiarios" (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid  NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  date        date  NOT NULL,
  registered_by text,
  employee_id uuid  REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,

  -- Campos básicos de rotina
  hygiene     boolean NOT NULL DEFAULT false,
  oral_care   boolean NOT NULL DEFAULT false,
  feeding     boolean NOT NULL DEFAULT false,
  hydration   boolean NOT NULL DEFAULT false,
  mobility    boolean NOT NULL DEFAULT false,
  dressings   boolean NOT NULL DEFAULT false,
  leisure     boolean NOT NULL DEFAULT false,

  -- Campos clínicos detalhados
  queixa_dor              text CHECK (queixa_dor IN ('nao','sim')),
  queixa_dor_desc         text,
  estado_neurologico      text,
  ar_ambiente             boolean,
  alimentacao             text CHECK (alimentacao IN ('boa','moderada','ruim')),
  alimentacao_desc        text,
  agitado                 boolean,
  prostrado               boolean,
  sonolento               boolean,
  eliminacao_evacuacao    text CHECK (eliminacao_evacuacao IN ('presente','ausente')),
  eliminacao_evacuacao_dias text,
  aspecto_evacuacoes      text CHECK (aspecto_evacuacoes IN ('endurecidas','pastosa','semi-liquidas','liquida-diarreia')),
  diurese                 text CHECK (diurese IN ('ausente','aumentada','diminuida')),
  diurese_aspecto         text CHECK (diurese_aspecto IN ('clara','concentrada','odor-sangue-ardencia')),
  uso_fraldas             text CHECK (uso_fraldas IN ('sim','nao')),
  mobilidade_set          text CHECK (mobilidade_set IN ('independente','auxilio','acamado')),
  higiene_corporal        text CHECK (higiene_corporal IN ('independente','auxilio')),
  higiene_oral_vestir     text CHECK (higiene_oral_vestir IN ('independente','auxilio')),
  alteracoes_pele         text CHECK (alteracoes_pele IN ('nao','sim')),
  alteracoes_pele_desc    text,
  sono                    text CHECK (sono IN ('preservado','insatisfatorio')),
  sono_desc               text,
  medicacoes_administradas text,
  atividades_consulta     text,
  intercorrencia          text CHECK (intercorrencia IN ('sim','nao')),
  intercorrencia_desc     text,

  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (resident_id, date) -- Um checklist por residente por dia
);

CREATE INDEX idx_checklists_resident ON "Recanto_ChecklistsDiarios" (resident_id);
CREATE INDEX idx_checklists_date     ON "Recanto_ChecklistsDiarios" (date DESC);

-- Documentos e exames
CREATE TABLE "Recanto_Documentos" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('exame','laudo','receita','documento_pessoal','outro')),
  url         text NOT NULL, -- URL no Supabase Storage
  upload_date date NOT NULL DEFAULT CURRENT_DATE,
  uploaded_by text,
  employee_id uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_resident ON "Recanto_Documentos" (resident_id);
CREATE INDEX idx_documentos_type     ON "Recanto_Documentos" (type);

-- =============================================================================
-- MÓDULO 4: NUTRIÇÃO
-- =============================================================================

-- Plano alimentar por residente (1:1)
CREATE TABLE "Recanto_PlanosAlimentares" (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id        uuid NOT NULL UNIQUE REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  consistency        text NOT NULL CHECK (consistency IN ('Geral','Branda','Pastosa','Líquida','Líquida-Pastosa')),
  diet_type          text NOT NULL CHECK (diet_type IN ('Livre','Hipossódica','Diabética','Hipolipídica','Hiperproteica')),
  restrictions       text[] NOT NULL DEFAULT '{}',
  fluid_restriction  text,  -- ex: "1500ml/dia"
  observations       text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Registros nutricionais diários por refeição
CREATE TABLE "Recanto_LogsNutricionais" (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  uuid NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  date         date NOT NULL,
  meal         text NOT NULL CHECK (meal IN ('Café da Manhã','Colação','Almoço','Lanche da Tarde','Jantar','Ceia')),
  acceptance   smallint NOT NULL CHECK (acceptance BETWEEN 0 AND 100), -- percentual
  fluid_intake smallint, -- ml
  notes        text,
  registered_by text,
  employee_id  uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (resident_id, date, meal)
);

CREATE INDEX idx_logs_nut_resident ON "Recanto_LogsNutricionais" (resident_id);
CREATE INDEX idx_logs_nut_date     ON "Recanto_LogsNutricionais" (date DESC);

-- =============================================================================
-- MÓDULO 5: FINANCEIRO & CONTRATOS
-- =============================================================================

CREATE TABLE "Recanto_Contratos" (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   uuid    NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE RESTRICT,
  start_date    date    NOT NULL,
  end_date      date,
  monthly_value numeric(10,2) NOT NULL,
  due_day       smallint NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  status        text    NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Suspenso','Finalizado')),
  file_url      text,   -- PDF do contrato no Supabase Storage
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contratos_resident ON "Recanto_Contratos" (resident_id);
CREATE INDEX idx_contratos_status   ON "Recanto_Contratos" (status);

-- Faturas / cobranças mensais
CREATE TABLE "Recanto_Faturas" (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid    NOT NULL REFERENCES "Recanto_Contratos"(id) ON DELETE RESTRICT,
  resident_id  uuid    NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE RESTRICT,
  amount       numeric(10,2) NOT NULL,
  due_date     date    NOT NULL,
  status       text    NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Pago','Atrasado')),
  month_year   text    NOT NULL, -- "05/2025"
  paid_date    date,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (contract_id, month_year)
);

CREATE INDEX idx_faturas_contract  ON "Recanto_Faturas" (contract_id);
CREATE INDEX idx_faturas_resident  ON "Recanto_Faturas" (resident_id);
CREATE INDEX idx_faturas_status    ON "Recanto_Faturas" (status);
CREATE INDEX idx_faturas_due_date  ON "Recanto_Faturas" (due_date);

-- Lançamentos financeiros gerais (receitas e despesas)
CREATE TABLE "Recanto_LancamentosFinanceiros" (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text    NOT NULL CHECK (type IN ('receita','despesa')),
  category    text    NOT NULL,
  description text    NOT NULL,
  amount      numeric(10,2) NOT NULL,
  date        date    NOT NULL,
  status      text    NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago','pendente')),
  invoice_id  uuid    REFERENCES "Recanto_Faturas"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lancamentos_type   ON "Recanto_LancamentosFinanceiros" (type);
CREATE INDEX idx_lancamentos_date   ON "Recanto_LancamentosFinanceiros" (date DESC);
CREATE INDEX idx_lancamentos_status ON "Recanto_LancamentosFinanceiros" (status);

-- =============================================================================
-- MÓDULO 6: ESTOQUE & INSUMOS
-- =============================================================================

CREATE TABLE "Recanto_Estoque" (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text    NOT NULL,
  category      text    NOT NULL CHECK (category IN ('medicamento','insumo','alimento')),
  quantity      numeric(10,3) NOT NULL DEFAULT 0,
  unit          text    NOT NULL, -- comprimidos, frascos, kg, unidades, etc.
  min_threshold numeric(10,3) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_estoque_category ON "Recanto_Estoque" (category);

-- Movimentações de estoque
CREATE TABLE "Recanto_MovimentacoesEstoque" (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid    NOT NULL REFERENCES "Recanto_Estoque"(id) ON DELETE CASCADE,
  type          text    NOT NULL CHECK (type IN ('entrada','saida','ajuste')),
  quantity      numeric(10,3) NOT NULL,
  date          date    NOT NULL DEFAULT CURRENT_DATE,
  user_name     text,
  employee_id   uuid    REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimentacoes_item ON "Recanto_MovimentacoesEstoque" (stock_item_id);
CREATE INDEX idx_movimentacoes_date ON "Recanto_MovimentacoesEstoque" (date DESC);

-- =============================================================================
-- MÓDULO 7: EQUIPE — TREINAMENTOS
-- =============================================================================

CREATE TABLE "Recanto_Treinamentos" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  date        date NOT NULL,
  instructor  text,
  valid_until date,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Participantes do treinamento (N:M funcionários ↔ treinamentos)
CREATE TABLE "Recanto_ParticipantesTreinamento" (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id  uuid NOT NULL REFERENCES "Recanto_Treinamentos"(id) ON DELETE CASCADE,
  employee_id  uuid NOT NULL REFERENCES "Recanto_Funcionarios"(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (training_id, employee_id)
);

CREATE INDEX idx_participantes_training  ON "Recanto_ParticipantesTreinamento" (training_id);
CREATE INDEX idx_participantes_employee  ON "Recanto_ParticipantesTreinamento" (employee_id);

-- =============================================================================
-- MÓDULO 8: LOGS DE AUDITORIA & ACESSO (LGPD)
-- =============================================================================

-- Logs de acesso ao sistema
CREATE TABLE "Recanto_LogsAcesso" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp   timestamptz NOT NULL DEFAULT now(),
  employee_id uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  user_name   text NOT NULL,
  role        text NOT NULL,
  action      text NOT NULL CHECK (action IN ('Login','Logout','Visualização Prontuário','Edição Financeira','Exportação Dados')),
  resource    text,   -- ex: ID do residente visualizado
  ip_address  text
);

CREATE INDEX idx_logs_acesso_employee  ON "Recanto_LogsAcesso" (employee_id);
CREATE INDEX idx_logs_acesso_timestamp ON "Recanto_LogsAcesso" (timestamp DESC);
CREATE INDEX idx_logs_acesso_action    ON "Recanto_LogsAcesso" (action);

-- Logs de auditoria por prontuário
CREATE TABLE "Recanto_LogsAuditoria" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES "Recanto_Residentes"(id) ON DELETE SET NULL,
  timestamp   timestamptz NOT NULL DEFAULT now(),
  employee_id uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  user_name   text NOT NULL,
  action      text NOT NULL,
  details     text
);

CREATE INDEX idx_logs_audit_resident  ON "Recanto_LogsAuditoria" (resident_id);
CREATE INDEX idx_logs_audit_employee  ON "Recanto_LogsAuditoria" (employee_id);
CREATE INDEX idx_logs_audit_timestamp ON "Recanto_LogsAuditoria" (timestamp DESC);

-- =============================================================================
-- MÓDULO 9: AGENDA & CALENDÁRIO
-- =============================================================================

CREATE TABLE "Recanto_Eventos" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  type        text NOT NULL CHECK (type IN ('medico','visita','terapia','atividade','reuniao','outro')),
  resident_id uuid REFERENCES "Recanto_Residentes"(id) ON DELETE SET NULL,
  description text,
  location    text,
  created_by  text NOT NULL,
  employee_id uuid REFERENCES "Recanto_Funcionarios"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_start_at   ON "Recanto_Eventos" (start_at);
CREATE INDEX idx_eventos_resident   ON "Recanto_Eventos" (resident_id);
CREATE INDEX idx_eventos_type       ON "Recanto_Eventos" (type);

-- =============================================================================
-- TRIGGERS: updated_at automático
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_funcionarios_updated_at
  BEFORE UPDATE ON "Recanto_Funcionarios"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_residentes_updated_at
  BEFORE UPDATE ON "Recanto_Residentes"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_responsaveis_updated_at
  BEFORE UPDATE ON "Recanto_ResponsaveisLegais"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_medicamentos_updated_at
  BEFORE UPDATE ON "Recanto_Medicamentos"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_planos_cuidado_updated_at
  BEFORE UPDATE ON "Recanto_PlanosCuidado"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_planos_alimentares_updated_at
  BEFORE UPDATE ON "Recanto_PlanosAlimentares"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON "Recanto_Contratos"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_faturas_updated_at
  BEFORE UPDATE ON "Recanto_Faturas"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lancamentos_updated_at
  BEFORE UPDATE ON "Recanto_LancamentosFinanceiros"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_estoque_updated_at
  BEFORE UPDATE ON "Recanto_Estoque"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON "Recanto_Eventos"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
