-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Integração Asaas (cobrança real da assinatura SaaS)
-- Data: 2026-06-23
-- Descrição:
--   1. Recanto_Planos          — catálogo oficial de planos/preços (fonte do servidor)
--   2. Recanto_Assinaturas     — colunas e índices do gateway Asaas
--   3. Recanto_Asaas_Eventos   — auditoria + idempotência do webhook
--   4. recanto_claim_asaas_event — captura atômica de evento (anti-duplicação)
--   5. Recanto_Assinatura_Pagamentos — histórico de cobranças
--   6. Recanto_Checkout_Tentativas   — rate limit / antiabuso do checkout público
--   7. Hardening: remoção das policies de INSERT direto usadas pelo checkout antigo
--   8. superadmin_get_empresas() — inclui dados do gateway da última assinatura
--
--   Observações de schema:
--   - empresa_id é TEXT em todo o projeto (Recanto_Empresas.empresa_id). As novas
--     tabelas seguem esse padrão para que recanto_get_empresa_id() (retorna text)
--     funcione nas policies de RLS.
--   - assinatura_id é UUID (Recanto_Assinaturas.id).
-- ==========================================================================

-- ─── 1. Recanto_Planos — catálogo oficial de planos/preços ───────────────────
create table if not exists public."Recanto_Planos" (
  plano_id                        text primary key,
  plano_nome                      text not null,

  preco_mensal                    numeric(12,2) not null,

  -- Valor total cobrado no ciclo anual (NÃO é o mensal equivalente).
  preco_anual_total               numeric(12,2) not null,
  -- Apenas informativo p/ exibição no frontend (ex.: "R$ 299/mês no anual").
  preco_mensal_equivalente_anual  numeric(12,2),

  ativo                           boolean not null default true,
  self_service                    boolean not null default true,

  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

drop trigger if exists trg_planos_updated_at on public."Recanto_Planos";
create trigger trg_planos_updated_at
  before update on public."Recanto_Planos"
  for each row execute function public.set_updated_at();

-- RLS: leitura pública dos planos ATIVOS (vitrine/checkout); escrita só service_role.
alter table public."Recanto_Planos" enable row level security;

drop policy if exists "planos_select_publico" on public."Recanto_Planos";
create policy "planos_select_publico" on public."Recanto_Planos"
  for select to anon, authenticated
  using (ativo = true);

-- Seed dos planos. preco_anual_total é o que será cobrado de fato no ciclo anual.
insert into public."Recanto_Planos" (
  plano_id, plano_nome, preco_mensal, preco_anual_total,
  preco_mensal_equivalente_anual, ativo, self_service
)
values
  ('essencial',    'Essencial',    399.00, 3588.00, 299.00, true, true),
  ('profissional', 'Profissional', 799.00, 7188.00, 599.00, true, true),
  ('enterprise',   'Enterprise',     0.00,    0.00, null,   true, false)
on conflict (plano_id) do update set
  plano_nome                     = excluded.plano_nome,
  preco_mensal                   = excluded.preco_mensal,
  preco_anual_total              = excluded.preco_anual_total,
  preco_mensal_equivalente_anual = excluded.preco_mensal_equivalente_anual,
  ativo                          = excluded.ativo,
  self_service                   = excluded.self_service,
  updated_at                     = now();

-- ─── 2. Recanto_Assinaturas — colunas do gateway Asaas ───────────────────────
alter table public."Recanto_Assinaturas"
  add column if not exists forma_pagamento      text,
  add column if not exists gateway_payment_id   text,
  add column if not exists asaas_invoice_url    text,
  add column if not exists asaas_payload        jsonb,
  add column if not exists ativada_em           timestamptz,
  add column if not exists cancelada_em         timestamptz,
  add column if not exists checkout_expira_em   timestamptz,
  add column if not exists motivo_cancelamento  text,
  -- Rastreio de etapa do checkout (rollback / limpeza). Ver Edge Function.
  add column if not exists checkout_etapa       text;

create index if not exists idx_recanto_assinaturas_gateway_subscription_id
  on public."Recanto_Assinaturas"(gateway_subscription_id);

create index if not exists idx_recanto_assinaturas_gateway_customer_id
  on public."Recanto_Assinaturas"(gateway_customer_id);

create index if not exists idx_recanto_assinaturas_gateway_payment_id
  on public."Recanto_Assinaturas"(gateway_payment_id);

create unique index if not exists uq_recanto_assinaturas_gateway_subscription_id
  on public."Recanto_Assinaturas"(gateway_subscription_id)
  where gateway_subscription_id is not null;

-- ─── 3. Recanto_Asaas_Eventos — auditoria + idempotência do webhook ──────────
create table if not exists public."Recanto_Asaas_Eventos" (
  id                    uuid primary key default gen_random_uuid(),

  asaas_event_id        text not null unique,
  event_type            text not null,

  payment_id            text,
  subscription_id       text,

  payload               jsonb not null,

  -- recebido | processando | processado | erro | ignorado
  status_processamento  text not null default 'recebido',
  erro                  text,

  recebido_em           timestamptz not null default now(),
  processado_em         timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_recanto_asaas_eventos_payment_id
  on public."Recanto_Asaas_Eventos"(payment_id);

create index if not exists idx_recanto_asaas_eventos_subscription_id
  on public."Recanto_Asaas_Eventos"(subscription_id);

create index if not exists idx_recanto_asaas_eventos_status
  on public."Recanto_Asaas_Eventos"(status_processamento);

drop trigger if exists trg_asaas_eventos_updated_at on public."Recanto_Asaas_Eventos";
create trigger trg_asaas_eventos_updated_at
  before update on public."Recanto_Asaas_Eventos"
  for each row execute function public.set_updated_at();

-- RLS habilitado, SEM policies públicas: acesso somente via service_role.
alter table public."Recanto_Asaas_Eventos" enable row level security;

-- ─── 4. recanto_claim_asaas_event — captura atômica do evento ────────────────
-- Marca um evento 'recebido'/'erro' como 'processando' e retorna a linha.
-- Se nenhuma linha for retornada, outro processo já assumiu/concluiu o evento.
create or replace function public.recanto_claim_asaas_event(
  p_asaas_event_id text
)
returns public."Recanto_Asaas_Eventos"
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public."Recanto_Asaas_Eventos";
begin
  update public."Recanto_Asaas_Eventos"
  set
    status_processamento = 'processando',
    updated_at = now()
  where asaas_event_id = p_asaas_event_id
    and status_processamento in ('recebido', 'erro')
  returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.recanto_claim_asaas_event(text) from public;
grant execute on function public.recanto_claim_asaas_event(text) to service_role;

-- ─── 5. Recanto_Assinatura_Pagamentos — histórico de cobranças ───────────────
create table if not exists public."Recanto_Assinatura_Pagamentos" (
  id                    uuid primary key default gen_random_uuid(),

  empresa_id            text not null references public."Recanto_Empresas"(empresa_id) on delete cascade,
  assinatura_id         uuid not null references public."Recanto_Assinaturas"(id) on delete cascade,

  asaas_payment_id      text not null unique,
  asaas_subscription_id text,

  valor                 numeric(12,2),
  status                text,
  billing_type          text,

  vencimento            date,
  pago_em               timestamptz,

  invoice_url           text,
  bank_slip_url         text,

  -- Salvo apenas p/ reexibição do PIX ao cliente. Não expor em áreas admin.
  pix_payload           text,

  payload               jsonb,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_recanto_assinatura_pagamentos_empresa_id
  on public."Recanto_Assinatura_Pagamentos"(empresa_id);

create index if not exists idx_recanto_assinatura_pagamentos_assinatura_id
  on public."Recanto_Assinatura_Pagamentos"(assinatura_id);

create index if not exists idx_recanto_assinatura_pagamentos_subscription_id
  on public."Recanto_Assinatura_Pagamentos"(asaas_subscription_id);

drop trigger if exists trg_assinatura_pagamentos_updated_at on public."Recanto_Assinatura_Pagamentos";
create trigger trg_assinatura_pagamentos_updated_at
  before update on public."Recanto_Assinatura_Pagamentos"
  for each row execute function public.set_updated_at();

-- RLS: empresa lê seus próprios pagamentos; escrita somente via service_role.
alter table public."Recanto_Assinatura_Pagamentos" enable row level security;

drop policy if exists "pagamentos_select_own" on public."Recanto_Assinatura_Pagamentos";
create policy "pagamentos_select_own" on public."Recanto_Assinatura_Pagamentos"
  for select to authenticated
  using (empresa_id = public.recanto_get_empresa_id());

-- ─── 6. Recanto_Checkout_Tentativas — rate limit / antiabuso do checkout ─────
-- Suporta rate limit por IP/e-mail/CPF-CNPJ, dedupe e log de tentativa suspeita.
create table if not exists public."Recanto_Checkout_Tentativas" (
  id              uuid primary key default gen_random_uuid(),

  ip              text,
  email           text,
  cpf_cnpj        text,

  plano_id        text,
  forma_pagamento text,

  -- tentativa | captcha_falha | rate_limited | rejeitado | sucesso | erro
  status          text not null default 'tentativa',
  motivo          text,
  user_agent      text,

  created_at      timestamptz not null default now()
);

create index if not exists idx_recanto_checkout_tentativas_ip
  on public."Recanto_Checkout_Tentativas"(ip, created_at);

create index if not exists idx_recanto_checkout_tentativas_email
  on public."Recanto_Checkout_Tentativas"(email, created_at);

create index if not exists idx_recanto_checkout_tentativas_cpf_cnpj
  on public."Recanto_Checkout_Tentativas"(cpf_cnpj, created_at);

-- RLS habilitado, SEM policies públicas: acesso somente via service_role.
alter table public."Recanto_Checkout_Tentativas" enable row level security;

-- Conta tentativas da última hora por chave e registra a nova tentativa de forma
-- atômica. Retorna jsonb com as contagens ANTERIORES (antes desta tentativa).
create or replace function public.recanto_registrar_tentativa_checkout(
  p_ip       text,
  p_email    text,
  p_cpf_cnpj text,
  p_plano_id text default null,
  p_forma    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip_count       integer;
  v_email_count    integer;
  v_cpf_cnpj_count integer;
begin
  select
    count(*) filter (where p_ip is not null and ip = p_ip),
    count(*) filter (where p_email is not null and email = lower(p_email)),
    count(*) filter (where p_cpf_cnpj is not null and cpf_cnpj = p_cpf_cnpj)
  into v_ip_count, v_email_count, v_cpf_cnpj_count
  from public."Recanto_Checkout_Tentativas"
  where created_at > now() - interval '1 hour';

  insert into public."Recanto_Checkout_Tentativas" (ip, email, cpf_cnpj, plano_id, forma_pagamento, status)
  values (p_ip, lower(p_email), p_cpf_cnpj, p_plano_id, p_forma, 'tentativa');

  return jsonb_build_object(
    'ip_count',       v_ip_count,
    'email_count',    v_email_count,
    'cpf_cnpj_count', v_cpf_cnpj_count
  );
end;
$$;

revoke all on function public.recanto_registrar_tentativa_checkout(text, text, text, text, text) from public;
grant execute on function public.recanto_registrar_tentativa_checkout(text, text, text, text, text) to service_role;

-- ─── 7. Hardening: o checkout NOVO grava só via Edge Function (service_role) ──
-- O frontend não insere mais empresa/assinatura diretamente. Removemos as policies
-- de INSERT que só o checkout/cadastro antigos usavam.
--   • logs_insert_authenticated  → MANTIDA (SettingsModule grava logs de pagamento legado)
--   • assinaturas UPDATE policy   → MANTIDA (SettingsModule altera plano legado)
drop policy if exists "empresa_insert_anon_checkout"    on public."Recanto_Empresas";
drop policy if exists "assinatura_insert_anon_checkout" on public."Recanto_Assinaturas";
drop policy if exists "empresa_insert_service"          on public."Recanto_Empresas";
drop policy if exists "assinatura_insert_service"       on public."Recanto_Assinaturas";
drop policy if exists "logs_insert_service"             on public."Recanto_Logs_Empresa";
drop policy if exists "empresa_insert_authenticated"    on public."Recanto_Empresas";
drop policy if exists "assinatura_insert_authenticated" on public."Recanto_Assinaturas";

-- ─── 8. superadmin_get_empresas() — inclui dados do gateway ──────────────────
drop function if exists public.superadmin_get_empresas();
create or replace function public.superadmin_get_empresas()
returns table(
  id                      uuid,
  empresa_id              text,
  nome_instituicao        text,
  cnpj                    text,
  telefone                text,
  cidade                  text,
  estado                  text,
  email_comercial         text,
  status                  text,
  plano_id                text,
  plano_nome              text,
  valor_mensal            numeric,
  subscription_status     text,
  data_vencimento         timestamptz,
  qtd_residentes          bigint,
  qtd_usuarios            bigint,
  created_at              timestamptz,
  gateway_pagamento       text,
  gateway_customer_id     text,
  gateway_subscription_id text,
  gateway_payment_id      text,
  forma_pagamento         text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not recanto_is_superadmin() then
    raise exception 'Acesso negado: requer permissão de superadmin';
  end if;

  return query
  select
    e.id,
    e.empresa_id,
    e.nome_instituicao,
    e.cnpj,
    e.telefone,
    e.cidade,
    e.estado,
    e.email_comercial,
    e.status,
    a.plano_id,
    a.plano_nome,
    a.valor_mensal,
    a.status                  as subscription_status,
    a.data_vencimento,
    (select count(*) from "Recanto_Residentes" r where r.empresa_id = e.empresa_id),
    (select count(*) from "Recanto_Usuarios"   u where u.empresa_id = e.empresa_id),
    e.created_at,
    a.gateway_pagamento,
    a.gateway_customer_id,
    a.gateway_subscription_id,
    a.gateway_payment_id,
    a.forma_pagamento
  from "Recanto_Empresas" e
  left join lateral (
    select s.plano_id, s.plano_nome, s.valor_mensal, s.status, s.data_vencimento::timestamptz,
           s.gateway_pagamento, s.gateway_customer_id, s.gateway_subscription_id,
           s.gateway_payment_id, s.forma_pagamento
    from "Recanto_Assinaturas" s
    where s.empresa_id = e.empresa_id
    order by s.created_at desc
    limit 1
  ) a on true
  order by e.created_at desc;
end;
$$;

grant execute on function public.superadmin_get_empresas() to authenticated;
