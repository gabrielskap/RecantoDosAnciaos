-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Captura de leads de marketing
-- Data: 2026-07-29
-- Descrição:
--   Tabela para capturar leads da landing (barra de demo, "Falar com vendas").
--   Antes, o e-mail informado na barra de demo era descartado. Agora é
--   persistido aqui (best-effort) além de pré-preencher o checkout.
--   Inserção pública (qualquer visitante); leitura só superadmin.
-- ==========================================================================

create table if not exists public."Recanto_Leads" (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  origem     text not null default 'desconhecida',
  dados      jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public."Recanto_Leads" enable row level security;

-- Captura pública: qualquer visitante pode inserir (anon/authenticated).
-- Sem policy de SELECT para anon → ninguém anônimo consegue ler os leads.
drop policy if exists "leads_insert_publico" on public."Recanto_Leads";
create policy "leads_insert_publico" on public."Recanto_Leads"
  for insert to anon, authenticated
  with check (true);

-- Leitura restrita ao superadmin.
drop policy if exists "leads_select_superadmin" on public."Recanto_Leads";
create policy "leads_select_superadmin" on public."Recanto_Leads"
  for select to authenticated
  using (recanto_is_superadmin());
