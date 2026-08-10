-- Códigos de recuperação gerenciados pela aplicação.
-- A tabela não é exposta aos clientes; somente a Edge Function com service_role
-- pode criar e validar registros.
create table if not exists public."Recanto_Recuperacao_Senha" (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  consumed_at timestamptz,
  requested_ip text,
  created_at timestamptz not null default now(),
  constraint recanto_recuperacao_senha_attempts_check check (attempts between 0 and 10)
);

create index if not exists idx_recanto_recuperacao_senha_email_created
  on public."Recanto_Recuperacao_Senha" (email, created_at desc);

create index if not exists idx_recanto_recuperacao_senha_expires
  on public."Recanto_Recuperacao_Senha" (expires_at);

alter table public."Recanto_Recuperacao_Senha" enable row level security;
revoke all on table public."Recanto_Recuperacao_Senha" from anon, authenticated;

comment on table public."Recanto_Recuperacao_Senha" is
  'Códigos de uso único para recuperação de senha; acessível apenas via service_role.';
