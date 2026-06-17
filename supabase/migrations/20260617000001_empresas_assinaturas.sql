-- Tabela de empresas/ILPIs cadastradas via checkout pago
CREATE TABLE IF NOT EXISTS public."Recanto_Empresas" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      text UNIQUE NOT NULL, -- ex: emp_001
  nome_instituicao text NOT NULL,
  cnpj            text,
  razao_social    text,
  nome_fantasia   text,
  telefone        text,
  email_comercial text,
  endereco        text,
  cidade          text,
  estado          text,
  cep             text,
  qtd_residentes  integer DEFAULT 0,
  qtd_usuarios    integer DEFAULT 1,
  status          text NOT NULL DEFAULT 'pendente', -- ativa | pendente | bloqueada | cancelada
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Tabela de assinaturas vinculadas a empresas
CREATE TABLE IF NOT EXISTS public."Recanto_Assinaturas" (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                text NOT NULL REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE,
  plano_id                  text NOT NULL, -- essencial | profissional | enterprise
  plano_nome                text NOT NULL,
  valor_mensal              numeric(10,2) NOT NULL DEFAULT 0,
  periodicidade             text NOT NULL DEFAULT 'mensal', -- mensal | anual
  gateway_pagamento         text DEFAULT 'mock',
  gateway_customer_id       text,
  gateway_subscription_id   text,
  status                    text NOT NULL DEFAULT 'pendente', -- ativa | pendente | cancelada | vencida | pagamento_recusado | em_trial
  data_inicio               date,
  data_vencimento           date,
  data_cancelamento         date,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Adiciona coluna empresa_id em Recanto_Usuarios para multi-tenancy
ALTER TABLE public."Recanto_Usuarios"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE SET NULL;

-- Logs de criação de empresa e aprovação de pagamento
CREATE TABLE IF NOT EXISTS public."Recanto_Logs_Empresa" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  text NOT NULL,
  tipo        text NOT NULL, -- empresa_criada | pagamento_aprovado | pagamento_recusado | assinatura_cancelada
  descricao   text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa ON public."Recanto_Assinaturas"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa    ON public."Recanto_Usuarios"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_empresa        ON public."Recanto_Logs_Empresa"(empresa_id);

-- Trigger updated_at para Recanto_Empresas
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public."Recanto_Empresas";
CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON public."Recanto_Empresas"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_assinaturas_updated_at ON public."Recanto_Assinaturas";
CREATE TRIGGER trg_assinaturas_updated_at
  BEFORE UPDATE ON public."Recanto_Assinaturas"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public."Recanto_Empresas"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_Assinaturas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_Logs_Empresa" ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados leiam apenas sua própria empresa
CREATE POLICY "empresa_select_own" ON public."Recanto_Empresas"
  FOR SELECT TO authenticated
  USING (
    empresa_id = (
      SELECT u.empresa_id FROM public."Recanto_Usuarios" u
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Permite service_role escrever livremente (usado pelo backend no checkout)
CREATE POLICY "empresa_insert_service" ON public."Recanto_Empresas"
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "assinatura_select_own" ON public."Recanto_Assinaturas"
  FOR SELECT TO authenticated
  USING (
    empresa_id = (
      SELECT u.empresa_id FROM public."Recanto_Usuarios" u
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "assinatura_insert_service" ON public."Recanto_Assinaturas"
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "logs_insert_service" ON public."Recanto_Logs_Empresa"
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "logs_select_own" ON public."Recanto_Logs_Empresa"
  FOR SELECT TO authenticated
  USING (
    empresa_id = (
      SELECT u.empresa_id FROM public."Recanto_Usuarios" u
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1
    )
  );
