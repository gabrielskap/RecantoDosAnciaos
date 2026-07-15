-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Limites de residentes/usuários por plano
-- Data: 2026-07-15
-- Descrição:
--   1. Recanto_Planos — colunas max_residentes / max_usuarios (null = ilimitado)
--   2. superadmin_list_planos()   — inclui os novos limites
--   3. superadmin_upsert_plano()  — aceita os novos limites
--   4. superadmin_planos_excedentes() — lista ILPIs que já excedem um limite proposto
--      (usado pelo painel para avisar antes de reduzir o limite de um plano)
-- ==========================================================================

-- ─── 1. Recanto_Planos — limites estruturados ─────────────────────────────────
alter table public."Recanto_Planos"
  add column if not exists max_residentes integer,
  add column if not exists max_usuarios   integer;

update public."Recanto_Planos" set max_residentes = 30,   max_usuarios = 5   where plano_id = 'essencial';
update public."Recanto_Planos" set max_residentes = 100,  max_usuarios = 20  where plano_id = 'profissional';
update public."Recanto_Planos" set max_residentes = null, max_usuarios = null where plano_id = 'enterprise';

-- ─── 2. superadmin_list_planos() — inclui os novos limites ────────────────────
drop function if exists superadmin_list_planos();
create or replace function superadmin_list_planos()
returns table(
  plano_id                       text,
  plano_nome                     text,
  preco_mensal                   numeric,
  preco_anual_total              numeric,
  preco_mensal_equivalente_anual numeric,
  ativo                          boolean,
  self_service                   boolean,
  descricao                      text,
  features                       jsonb,
  popular                        boolean,
  badge_label                    text,
  cta_label                      text,
  max_residentes                 integer,
  max_usuarios                   integer,
  updated_at                     timestamptz
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
    p.plano_id, p.plano_nome, p.preco_mensal, p.preco_anual_total,
    p.preco_mensal_equivalente_anual, p.ativo, p.self_service,
    p.descricao, p.features, p.popular, p.badge_label, p.cta_label,
    p.max_residentes, p.max_usuarios, p.updated_at
  from "Recanto_Planos" p
  order by
    case p.plano_id
      when 'essencial'    then 1
      when 'profissional' then 2
      when 'enterprise'   then 3
      else 4
    end;
end;
$$;

-- ─── 3. superadmin_upsert_plano() — aceita os novos limites ───────────────────
drop function if exists superadmin_upsert_plano(text, text, numeric, numeric, numeric, boolean, boolean, text, jsonb, boolean, text, text);
create or replace function superadmin_upsert_plano(
  p_plano_id                        text,
  p_plano_nome                      text,
  p_preco_mensal                    numeric,
  p_preco_anual_total               numeric,
  p_preco_mensal_equivalente_anual  numeric  default null,
  p_ativo                           boolean  default true,
  p_self_service                    boolean  default true,
  p_descricao                       text     default '',
  p_features                        jsonb    default '[]',
  p_popular                         boolean  default false,
  p_badge_label                     text     default null,
  p_cta_label                       text     default 'Assinar agora',
  p_max_residentes                  integer  default null,
  p_max_usuarios                    integer  default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not recanto_is_superadmin() then
    raise exception 'Acesso negado: requer permissão de superadmin';
  end if;

  insert into "Recanto_Planos" (
    plano_id, plano_nome, preco_mensal, preco_anual_total,
    preco_mensal_equivalente_anual, ativo, self_service,
    descricao, features, popular, badge_label, cta_label,
    max_residentes, max_usuarios
  )
  values (
    p_plano_id, p_plano_nome, p_preco_mensal, p_preco_anual_total,
    p_preco_mensal_equivalente_anual, p_ativo, p_self_service,
    p_descricao, p_features, p_popular, p_badge_label, p_cta_label,
    p_max_residentes, p_max_usuarios
  )
  on conflict (plano_id) do update set
    plano_nome                     = excluded.plano_nome,
    preco_mensal                   = excluded.preco_mensal,
    preco_anual_total              = excluded.preco_anual_total,
    preco_mensal_equivalente_anual = excluded.preco_mensal_equivalente_anual,
    ativo                          = excluded.ativo,
    self_service                   = excluded.self_service,
    descricao                      = excluded.descricao,
    features                       = excluded.features,
    popular                        = excluded.popular,
    badge_label                    = excluded.badge_label,
    cta_label                      = excluded.cta_label,
    max_residentes                 = excluded.max_residentes,
    max_usuarios                   = excluded.max_usuarios,
    updated_at                     = now();

  return true;
end;
$$;

-- ─── 4. superadmin_planos_excedentes() — ILPIs que excedem um limite proposto ─
create or replace function superadmin_planos_excedentes(
  p_plano_id       text,
  p_max_residentes integer default null,
  p_max_usuarios   integer default null
)
returns table(
  empresa_id       text,
  nome_instituicao text,
  qtd_residentes   bigint,
  qtd_usuarios     bigint
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
    e.empresa_id,
    e.nome_instituicao,
    (select count(*) from "Recanto_Residentes" r where r.empresa_id = e.empresa_id) as qtd_residentes,
    (select count(*) from "Recanto_Usuarios"   u where u.empresa_id = e.empresa_id) as qtd_usuarios
  from "Recanto_Empresas" e
  join "Recanto_Assinaturas" a on a.empresa_id = e.empresa_id
  where a.plano_id = p_plano_id
    and a.status in ('ativa', 'em_trial')
    and (
      (p_max_residentes is not null and (select count(*) from "Recanto_Residentes" r where r.empresa_id = e.empresa_id) > p_max_residentes)
      or
      (p_max_usuarios is not null and (select count(*) from "Recanto_Usuarios" u where u.empresa_id = e.empresa_id) > p_max_usuarios)
    );
end;
$$;

-- ─── Grants ────────────────────────────────────────────────────────────────────
grant execute on function superadmin_list_planos()                                                                             to authenticated;
grant execute on function superadmin_upsert_plano(text, text, numeric, numeric, numeric, boolean, boolean, text, jsonb, boolean, text, text, integer, integer) to authenticated;
grant execute on function superadmin_planos_excedentes(text, integer, integer)                                                  to authenticated;
