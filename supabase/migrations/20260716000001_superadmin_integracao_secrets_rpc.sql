-- ==========================================================================
-- RECANTO DOS ANCIÃOS — RPCs superadmin para Recanto_Integracao_Secrets
-- Data: 2026-07-16
-- Descrição:
--   Painel "Integrações" no /superadmin para visualizar e editar as chaves
--   de integração (Asaas, UAZAPI/WhatsApp, etc.) já centralizadas na tabela
--   Recanto_Integracao_Secrets (criada em 20260624000001_asaas_secrets.sql).
--
--   A tabela tem RLS habilitado sem policies públicas — só service_role
--   (Edge Functions) e pg_cron acessam diretamente. As RPCs abaixo, por
--   serem SECURITY DEFINER (mesmo owner das demais superadmin_*), contornam
--   o RLS da mesma forma que superadmin_get_empresas já faz para
--   Recanto_Empresas.
-- ==========================================================================

-- Lista todas as chaves de integração (para a tela de administração)
create or replace function superadmin_list_integracao_secrets()
returns table(chave text, valor text, descricao text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not recanto_is_superadmin() then
    raise exception 'Acesso negado: requer permissão de superadmin';
  end if;

  return query
  select s.chave, s.valor, s.descricao, s.updated_at
  from "Recanto_Integracao_Secrets" s
  order by s.chave;
end;
$$;

-- Cria ou atualiza uma chave de integração
create or replace function superadmin_upsert_integracao_secret(
  p_chave     text,
  p_valor     text,
  p_descricao text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chave text := upper(btrim(coalesce(p_chave, '')));
begin
  if not recanto_is_superadmin() then
    raise exception 'Acesso negado: requer permissão de superadmin';
  end if;

  if v_chave = '' then
    raise exception 'Chave não pode ser vazia';
  end if;

  insert into "Recanto_Integracao_Secrets" (chave, valor, descricao)
  values (v_chave, p_valor, p_descricao)
  on conflict (chave) do update set
    valor      = excluded.valor,
    descricao  = coalesce(excluded.descricao, "Recanto_Integracao_Secrets".descricao),
    updated_at = now();

  return true;
end;
$$;

-- Remove uma chave de integração
create or replace function superadmin_delete_integracao_secret(p_chave text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not recanto_is_superadmin() then
    raise exception 'Acesso negado: requer permissão de superadmin';
  end if;

  delete from "Recanto_Integracao_Secrets" where chave = p_chave;
  return true;
end;
$$;

-- ─── Grants ────────────────────────────────────────────────────────────────────
grant execute on function superadmin_list_integracao_secrets()                  to authenticated;
grant execute on function superadmin_upsert_integracao_secret(text, text, text) to authenticated;
grant execute on function superadmin_delete_integracao_secret(text)             to authenticated;
