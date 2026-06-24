-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Segredos de integração em tabela (Asaas)
-- Data: 2026-06-24
-- Descrição:
--   Armazena os segredos do Asaas (ASAAS_API_KEY, ASAAS_API_URL,
--   ASAAS_WEBHOOK_TOKEN) em tabela no banco, lidos pelas Edge Functions via
--   service_role. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY continuam como
--   variáveis de ambiente (bootstrap — a função precisa delas para conectar
--   e ler esta tabela).
--
--   SEGURANÇA:
--   - RLS habilitado, SEM policies públicas → ninguém (anon/authenticated) lê.
--     Apenas o service_role (que ignora RLS) acessa.
--   - NÃO versione os valores reais. Rode os UPSERTs de valor manualmente.
-- ==========================================================================

create table if not exists public."Recanto_Integracao_Secrets" (
  chave       text primary key,
  valor       text not null,
  descricao   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_integracao_secrets_updated_at on public."Recanto_Integracao_Secrets";
create trigger trg_integracao_secrets_updated_at
  before update on public."Recanto_Integracao_Secrets"
  for each row execute function public.set_updated_at();

-- RLS habilitado, SEM policies públicas: acesso somente via service_role.
alter table public."Recanto_Integracao_Secrets" enable row level security;

-- Seed apenas do valor NÃO sensível (URL base da API). Os segredos reais
-- (ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN) devem ser inseridos manualmente.
insert into public."Recanto_Integracao_Secrets" (chave, valor, descricao) values
  ('ASAAS_API_URL', 'https://api-sandbox.asaas.com/v3', 'Base URL da API Asaas (sandbox/produção)')
on conflict (chave) do update set
  valor      = excluded.valor,
  descricao  = excluded.descricao,
  updated_at = now();

-- ── Preencha os segredos reais executando manualmente (NÃO versionar) ──
-- insert into public."Recanto_Integracao_Secrets" (chave, valor, descricao) values
--   ('ASAAS_API_KEY',       '<sua_chave_rotacionada>',     'API key do Asaas'),
--   ('ASAAS_WEBHOOK_TOKEN', '<token_forte_do_webhook>',    'Token do header asaas-access-token')
-- on conflict (chave) do update set valor = excluded.valor, updated_at = now();
