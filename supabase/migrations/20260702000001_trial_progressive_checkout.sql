-- Trial de 7 dias + salvamento progressivo do checkout
-- Adiciona: coluna trial_expira_em, tabela Recanto_Checkout_Rascunhos, cron de expiração

-- 1. Coluna trial_expira_em em Recanto_Assinaturas
ALTER TABLE public."Recanto_Assinaturas"
  ADD COLUMN IF NOT EXISTS trial_expira_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_assinaturas_trial_expira
  ON public."Recanto_Assinaturas"(trial_expira_em)
  WHERE trial_expira_em IS NOT NULL;

-- 2. Tabela de rascunhos de checkout (dados parciais antes do usuário existir)
CREATE TABLE IF NOT EXISTS public."Recanto_Checkout_Rascunhos" (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  rascunho_token text        NOT NULL,
  dados_empresa  jsonb       NOT NULL DEFAULT '{}',
  dados_admin    jsonb,
  dados_plano    jsonb,
  ip             text,
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_checkout_rascunhos PRIMARY KEY (id),
  CONSTRAINT uq_rascunho_token UNIQUE (rascunho_token)
);

CREATE INDEX IF NOT EXISTS idx_rascunhos_expires
  ON public."Recanto_Checkout_Rascunhos"(expires_at);

ALTER TABLE public."Recanto_Checkout_Rascunhos" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON public."Recanto_Checkout_Rascunhos" TO anon, authenticated;

-- SELECT é necessário para o PostgreSQL avaliar ON CONFLICT DO UPDATE internamente
CREATE POLICY "rascunho_select" ON public."Recanto_Checkout_Rascunhos"
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "rascunho_insert" ON public."Recanto_Checkout_Rascunhos"
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "rascunho_update" ON public."Recanto_Checkout_Rascunhos"
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Cron job para expirar trials a cada hora
SELECT cron.schedule(
  'expire-trials',
  '0 * * * *',
  $$
    -- Marcar assinaturas expiradas
    UPDATE public."Recanto_Assinaturas"
    SET
      status         = 'vencida',
      checkout_etapa = 'trial_expirado',
      updated_at     = now()
    WHERE status = 'em_trial'
      AND trial_expira_em IS NOT NULL
      AND trial_expira_em < now();

    -- Bloquear empresas cujo trial expirou
    UPDATE public."Recanto_Empresas" e
    SET
      status     = 'bloqueada',
      updated_at = now()
    FROM public."Recanto_Assinaturas" a
    WHERE a.empresa_id  = e.empresa_id
      AND a.status      = 'vencida'
      AND a.checkout_etapa = 'trial_expirado'
      AND a.trial_expira_em IS NOT NULL
      AND a.trial_expira_em < now()
      AND e.status = 'pendente';

    -- Limpar rascunhos expirados
    DELETE FROM public."Recanto_Checkout_Rascunhos"
    WHERE expires_at < now();
  $$
);
