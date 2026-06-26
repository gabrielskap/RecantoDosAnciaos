-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Módulo de Notificações WhatsApp (UAZAPI) — Schema
-- Data: 2026-06-25
-- Descrição:
--   Tabelas do padrão Outbox para notificações WhatsApp via UAZAPI:
--     - Recanto_Notificacao_Templates       (modelos de mensagem)
--     - Recanto_Notificacao_Preferencias     (consentimento/LGPD por responsável)
--     - Recanto_Notificacao_Fila             (fila/outbox — a trigger só registra)
--     - Recanto_Whatsapp_Instancias          (token UAZAPI por empresa — SEGREDO)
--   + coluna is_primary em Recanto_ResponsaveisLegais (responsável principal).
--
--   Multi-tenant: empresa_id text (FK Recanto_Empresas) com default
--   recanto_get_empresa_id(); RLS no mesmo padrão de 20260617000004.
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 0. ENUMs
-- --------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE recanto_notif_status AS ENUM ('pending','processing','sent','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recanto_notif_msgtype AS ENUM ('text','button','menu');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recanto_notif_recipient AS ENUM ('responsible','resident','group','manual_phone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- --------------------------------------------------------------------------
-- 1. Recanto_ResponsaveisLegais — responsável principal
-- --------------------------------------------------------------------------

ALTER TABLE public."Recanto_ResponsaveisLegais"
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Backfill: o 1º responsável (por data de criação) de cada residente vira principal.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY resident_id ORDER BY created_at, id) AS rn
  FROM public."Recanto_ResponsaveisLegais"
)
UPDATE public."Recanto_ResponsaveisLegais" r
SET is_primary = true
FROM ranked
WHERE r.id = ranked.id
  AND ranked.rn = 1
  AND NOT EXISTS (
    SELECT 1 FROM public."Recanto_ResponsaveisLegais" x
    WHERE x.resident_id = r.resident_id AND x.is_primary
  );


-- --------------------------------------------------------------------------
-- 2. Recanto_Notificacao_Templates — modelos de mensagem
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."Recanto_Notificacao_Templates" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE
                  DEFAULT public.recanto_get_empresa_id(),
  name          text NOT NULL,
  trigger_event text NOT NULL DEFAULT 'manual',
  message_type  recanto_notif_msgtype NOT NULL DEFAULT 'text',
  message_text  text NOT NULL,
  footer_text   text,
  choices       jsonb,
  active        boolean NOT NULL DEFAULT true,
  created_by    uuid,
  updated_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_notif_templates_updated_at ON public."Recanto_Notificacao_Templates";
CREATE TRIGGER trg_notif_templates_updated_at
  BEFORE UPDATE ON public."Recanto_Notificacao_Templates"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ix_notif_templates_company_event
  ON public."Recanto_Notificacao_Templates" (empresa_id, trigger_event, active);
CREATE INDEX IF NOT EXISTS ix_notif_templates_active
  ON public."Recanto_Notificacao_Templates" (active);


-- --------------------------------------------------------------------------
-- 3. Recanto_Notificacao_Preferencias — consentimento (LGPD)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."Recanto_Notificacao_Preferencias" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE
                  DEFAULT public.recanto_get_empresa_id(),
  responsible_id uuid NOT NULL REFERENCES public."Recanto_ResponsaveisLegais"(id) ON DELETE CASCADE,
  resident_id    uuid REFERENCES public."Recanto_Residentes"(id) ON DELETE CASCADE,

  whatsapp_enabled                  boolean NOT NULL DEFAULT false,
  health_notifications_enabled      boolean NOT NULL DEFAULT false,
  administrative_notifications_enabled boolean NOT NULL DEFAULT true,
  financial_notifications_enabled   boolean NOT NULL DEFAULT true,

  consent_source text,
  consented_at   timestamptz,
  revoked_at     timestamptz,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_notif_pref_updated_at ON public."Recanto_Notificacao_Preferencias";
CREATE TRIGGER trg_notif_pref_updated_at
  BEFORE UPDATE ON public."Recanto_Notificacao_Preferencias"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ix_notif_pref_resp_resident
  ON public."Recanto_Notificacao_Preferencias" (responsible_id, resident_id);

-- Uma preferência por (responsável, residente). COALESCE no resident_id NULL para
-- permitir uma preferência "geral" do responsável sem residente específico.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_pref_resp_resident
  ON public."Recanto_Notificacao_Preferencias"
     (responsible_id, COALESCE(resident_id, '00000000-0000-0000-0000-000000000000'::uuid));


-- --------------------------------------------------------------------------
-- 4. Recanto_Notificacao_Fila — outbox
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."Recanto_Notificacao_Fila" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE,

  template_id   uuid REFERENCES public."Recanto_Notificacao_Templates"(id) ON DELETE SET NULL,
  trigger_event text NOT NULL,
  message_type  recanto_notif_msgtype NOT NULL DEFAULT 'text',

  recipient_type  recanto_notif_recipient NOT NULL DEFAULT 'responsible',
  recipient_id    uuid,
  recipient_name  text,
  recipient_phone text NOT NULL,

  message_text  text NOT NULL,
  footer_text   text,
  choices       jsonb,
  payload       jsonb,

  status        recanto_notif_status NOT NULL DEFAULT 'pending',
  dedup_key     text,

  attempts      int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 5,

  last_error        text,
  provider_response jsonb,

  scheduled_for timestamptz NOT NULL DEFAULT now(),
  claimed_at    timestamptz,
  sent_at       timestamptz,

  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notif_fila_pending
  ON public."Recanto_Notificacao_Fila" (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_notif_fila_company_status
  ON public."Recanto_Notificacao_Fila" (empresa_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_notif_fila_trigger_event
  ON public."Recanto_Notificacao_Fila" (trigger_event);

-- Deduplicação: enquanto pending/processing, não pode haver outra com a mesma chave.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_dedup_active
  ON public."Recanto_Notificacao_Fila" (dedup_key)
  WHERE status IN ('pending','processing');


-- --------------------------------------------------------------------------
-- 5. Recanto_Whatsapp_Instancias — token UAZAPI por empresa (SEGREDO)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."Recanto_Whatsapp_Instancias" (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         text NOT NULL UNIQUE REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE,
  instance_name      text,
  uazapi_token       text,            -- SEGREDO: nunca exposto ao frontend
  uazapi_instance_id text,
  status             text NOT NULL DEFAULT 'disconnected',
  phone_number       text,
  last_qr            text,
  connected_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_whatsapp_instancias_updated_at ON public."Recanto_Whatsapp_Instancias";
CREATE TRIGGER trg_whatsapp_instancias_updated_at
  BEFORE UPDATE ON public."Recanto_Whatsapp_Instancias"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ==========================================================================
-- 6. ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE public."Recanto_Notificacao_Templates"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_Notificacao_Preferencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_Notificacao_Fila"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_Whatsapp_Instancias"      ENABLE ROW LEVEL SECURITY;

-- ── Templates ────────────────────────────────────────────────────────────
-- Leitura: qualquer usuário autenticado (isolado por empresa via política restritiva).
-- Escrita: apenas Administrador.
DROP POLICY IF EXISTS "notif_templates_select" ON public."Recanto_Notificacao_Templates";
CREATE POLICY "notif_templates_select" ON public."Recanto_Notificacao_Templates"
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notif_templates_admin_write" ON public."Recanto_Notificacao_Templates";
CREATE POLICY "notif_templates_admin_write" ON public."Recanto_Notificacao_Templates"
  FOR ALL USING (public.recanto_get_profile_type() = 'Administrador')
          WITH CHECK (public.recanto_get_profile_type() = 'Administrador');

-- Isolamento por empresa, MAS templates globais (empresa_id IS NULL) são
-- visíveis a todos (somente leitura). Escrita/edição/exclusão ficam restritas
-- à própria empresa (global é apenas semente do sistema).
DROP POLICY IF EXISTS "notif_templates_tenant_restrictive" ON public."Recanto_Notificacao_Templates";
DROP POLICY IF EXISTS "notif_templates_tenant_select" ON public."Recanto_Notificacao_Templates";
CREATE POLICY "notif_templates_tenant_select" ON public."Recanto_Notificacao_Templates"
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id() OR empresa_id IS NULL);

DROP POLICY IF EXISTS "notif_templates_tenant_insert" ON public."Recanto_Notificacao_Templates";
CREATE POLICY "notif_templates_tenant_insert" ON public."Recanto_Notificacao_Templates"
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "notif_templates_tenant_update" ON public."Recanto_Notificacao_Templates";
CREATE POLICY "notif_templates_tenant_update" ON public."Recanto_Notificacao_Templates"
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "notif_templates_tenant_delete" ON public."Recanto_Notificacao_Templates";
CREATE POLICY "notif_templates_tenant_delete" ON public."Recanto_Notificacao_Templates"
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id());

-- ── Preferências (consentimento) ─────────────────────────────────────────
DROP POLICY IF EXISTS "notif_pref_select" ON public."Recanto_Notificacao_Preferencias";
CREATE POLICY "notif_pref_select" ON public."Recanto_Notificacao_Preferencias"
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notif_pref_admin_write" ON public."Recanto_Notificacao_Preferencias";
CREATE POLICY "notif_pref_admin_write" ON public."Recanto_Notificacao_Preferencias"
  FOR ALL USING (public.recanto_get_profile_type() = 'Administrador')
          WITH CHECK (public.recanto_get_profile_type() = 'Administrador');

DROP POLICY IF EXISTS "notif_pref_tenant_restrictive" ON public."Recanto_Notificacao_Preferencias";
CREATE POLICY "notif_pref_tenant_restrictive" ON public."Recanto_Notificacao_Preferencias"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- ── Fila (outbox) ────────────────────────────────────────────────────────
-- Leitura: usuário autenticado (UI/permissão refina). Escrita: SOMENTE via
-- funções SECURITY DEFINER (recanto_enqueue_*, recanto_resend/cancel_*) e
-- service_role (Edge Function). Não há política de INSERT/UPDATE para o frontend.
DROP POLICY IF EXISTS "notif_fila_select" ON public."Recanto_Notificacao_Fila";
CREATE POLICY "notif_fila_select" ON public."Recanto_Notificacao_Fila"
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notif_fila_tenant_restrictive" ON public."Recanto_Notificacao_Fila";
CREATE POLICY "notif_fila_tenant_restrictive" ON public."Recanto_Notificacao_Fila"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- ── Instâncias WhatsApp (SEGREDO) ────────────────────────────────────────
-- RLS habilitado, SEM policies: acesso somente via service_role (Edge Function)
-- e funções SECURITY DEFINER (recanto_get_whatsapp_instance). O token nunca
-- é selecionável pelo frontend.


-- ==========================================================================
-- 7. Permissão de módulo NOTIFICATIONS para administradores existentes
-- (hasPermission já libera tudo p/ 'Administrador'; isto só popula a tela de Perfis)
-- ==========================================================================

INSERT INTO public."Recanto_Permissoes" (profile_id, module, actions)
SELECT p.id, 'NOTIFICATIONS',
       ARRAY['view','edit','create','delete']::public.recanto_acao_permissao[]
FROM public."Recanto_Perfis" p
WHERE p.type = 'Administrador'
ON CONFLICT (profile_id, module) DO NOTHING;
