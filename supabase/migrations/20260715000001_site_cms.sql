-- ==========================================================================
-- RECANTO DOS ANCIÃOS — CMS do site (planos, conteúdo de marketing, imagens)
-- Data: 2026-07-15
-- Descrição:
--   1. Recanto_Planos          — novas colunas de copy (descricao/features/popular/badge/cta)
--   2. Recanto_ConteudoSite    — blocos de texto da landing page, editáveis pelo superadmin
--   3. Recanto_ImagensSite     — slots de imagem (logo, hero, og) com fallback nulo
--   4. Bucket de storage site-assets — leitura pública, escrita só superadmin
--   5. RPCs superadmin_* para listar/editar os itens acima (SECURITY DEFINER)
-- ==========================================================================

-- ─── 1. Recanto_Planos — novas colunas de copy ────────────────────────────────
alter table public."Recanto_Planos"
  add column if not exists descricao    text not null default '',
  add column if not exists features     jsonb not null default '[]',
  add column if not exists popular      boolean not null default false,
  add column if not exists badge_label  text,
  add column if not exists cta_label    text not null default 'Assinar agora';

-- Seed de copy (mesmo conteúdo hoje hardcoded em LandingPage.tsx/CheckoutPage.tsx)
update public."Recanto_Planos" set
  descricao   = 'Ideal para ILPIs com até 30 residentes',
  features    = '["Até 30 residentes","5 usuários","Gestão de residentes","Saúde & checklists","Financeiro básico","Estoque","Suporte por e-mail"]'::jsonb,
  popular     = false,
  badge_label = null,
  cta_label   = 'Assinar agora'
where plano_id = 'essencial';

update public."Recanto_Planos" set
  descricao   = 'Para ILPIs de médio porte com mais recursos',
  features    = '["Até 100 residentes","20 usuários","Todos os módulos","Relatórios avançados","IA Assistente","Portal do familiar","Suporte prioritário","API de integração"]'::jsonb,
  popular     = true,
  badge_label = 'Mais popular',
  cta_label   = 'Assinar agora'
where plano_id = 'profissional';

update public."Recanto_Planos" set
  descricao   = 'Para redes e grupos com múltiplas unidades',
  features    = '["Residentes ilimitados","Usuários ilimitados","Múltiplas unidades","Dashboard consolidado","Onboarding dedicado","SLA garantido 99.9%","Integração customizada","Gerente de sucesso"]'::jsonb,
  popular     = false,
  badge_label = null,
  cta_label   = 'Falar com vendas'
where plano_id = 'enterprise';

-- ─── 2. Recanto_ConteudoSite — blocos de texto da landing page ───────────────
create table if not exists public."Recanto_ConteudoSite" (
  secao      text primary key,
  conteudo   jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_conteudo_site_updated_at on public."Recanto_ConteudoSite";
create trigger trg_conteudo_site_updated_at
  before update on public."Recanto_ConteudoSite"
  for each row execute function public.set_updated_at();

alter table public."Recanto_ConteudoSite" enable row level security;

drop policy if exists "conteudo_site_select_publico" on public."Recanto_ConteudoSite";
create policy "conteudo_site_select_publico" on public."Recanto_ConteudoSite"
  for select to anon, authenticated
  using (true);

insert into public."Recanto_ConteudoSite" (secao, conteudo) values
  ('nav', '{
    "marca": "RecantoCare"
  }'::jsonb),

  ('hero', '{
    "eyebrow": "Plataforma #1 para ILPIs no Brasil",
    "titulo_prefixo": "A gestão completa para o seu",
    "titulo_destaque": "Lar de Idosos",
    "subtitulo": "Controle residentes, saúde, finanças, equipe e estoque em uma única plataforma. Tecnologia de ponta a serviço do cuidado humano.",
    "cta_primario": "Saiba mais",
    "cta_secundario": "Ver funcionalidades",
    "stats": [
      { "valor": "500+", "label": "ILPIs atendidas" },
      { "valor": "15.000+", "label": "Residentes gerenciados" },
      { "valor": "99.9%", "label": "Uptime garantido" }
    ]
  }'::jsonb),

  ('demo_bar', '{
    "texto": "Veja o RecantoCare em ação"
  }'::jsonb),

  ('sobre', '{
    "titulo": "O que é o RecantoCare?",
    "paragrafo1": "O RecantoCare é uma plataforma SaaS completa que centraliza toda a gestão de Instituições de Longa Permanência para Idosos (ILPIs). Da admissão do residente ao faturamento mensal, passando pelo controle de saúde e equipe — tudo em um só lugar.",
    "paragrafo2": "Desenvolvida especificamente para a realidade das ILPIs brasileiras, com conformidade com a RDC 283/2005 da ANVISA e suporte à documentação exigida pelos órgãos fiscalizadores.",
    "destaques": ["Conformidade ANVISA", "Dados em tempo real", "Prontuário digital", "Multi-unidade"],
    "reconhecimento_label": "Reconhecido pelo setor",
    "badges": ["Melhor Plataforma ILPI 2024", "Inovação em Saúde", "Escolha do Gestor", "Suporte 5 Estrelas"],
    "stat_tiles": [
      { "valor": "98%", "label": "de satisfação dos clientes" },
      { "valor": "4h", "label": "economizadas por dia em média" },
      { "valor": "100%", "label": "na nuvem, sem instalação" },
      { "valor": "24/7", "label": "disponibilidade da plataforma" }
    ]
  }'::jsonb),

  ('features_tabs', '{
    "titulo": "Tudo que sua ILPI precisa",
    "subtitulo": "Módulos integrados para gestão completa, do cuidado ao faturamento.",
    "tab_gestores_label": "Gestores Individuais",
    "tab_grupos_label": "Grupos & Redes",
    "gestores_titulo": "Para gestores de ILPIs",
    "gestores_subtitulo": "Gerencie cada aspecto da sua instituição com precisão e facilidade, sem precisar de vários sistemas.",
    "gestores_cta": "Começar agora",
    "gestores_features": [
      "Prontuário eletrônico completo para cada residente",
      "Checklists diários de cuidado e saúde",
      "Controle financeiro de contratos e mensalidades",
      "Gestão de medicamentos com alertas",
      "Relatórios para vigilância sanitária",
      "Portal exclusivo para familiares"
    ],
    "grupos_titulo": "Para grupos e redes de ILPIs",
    "grupos_subtitulo": "Gerencie múltiplas unidades com visão consolidada e controle centralizado.",
    "grupos_cta": "Falar com especialista",
    "grupos_features": [
      "Visão consolidada de múltiplas unidades",
      "Dashboard de KPIs por filial",
      "Controle centralizado de equipe",
      "Relatórios comparativos entre unidades",
      "Gestão financeira multi-empresa",
      "Onboarding e suporte dedicado"
    ]
  }'::jsonb),

  ('features_cards', '{
    "cards": [
      { "slug": "residentes", "title": "Gestão de Residentes", "desc": "Prontuários completos com histórico de saúde, fotos, documentos e acompanhamento individualizado para cada residente." },
      { "slug": "saude",      "title": "Saúde & Clínica",      "desc": "Sinais vitais, checklists diários de cuidado, controle de medicações e planos assistenciais personalizados." },
      { "slug": "financeiro","title": "Financeiro",            "desc": "Contratos, mensalidades, receitas e despesas. Relatórios financeiros e controle de inadimplência." },
      { "slug": "estoque",   "title": "Estoque",                "desc": "Controle de medicamentos e suprimentos com alertas automáticos de estoque mínimo e histórico." },
      { "slug": "equipe",    "title": "Equipe & RH",            "desc": "Gestão de funcionários, escalas de trabalho, treinamentos e registros de acesso." },
      { "slug": "relatorios","title": "Relatórios & BI",        "desc": "Dashboards com indicadores de ocupação, saúde, financeiro e performance em tempo real." },
      { "slug": "nutricao",  "title": "Nutrição",               "desc": "Planos dietéticos individuais, cardápios nutricionais e acompanhamento da alimentação." },
      { "slug": "agenda",    "title": "Agenda & Eventos",       "desc": "Calendário integrado para atividades, consultas médicas, visitas e eventos institucionais." },
      { "slug": "ia",        "title": "IA Assistente",          "desc": "Assistente inteligente para resumos clínicos, análise de dados e insights automáticos sobre seus residentes." }
    ]
  }'::jsonb),

  ('pricing_header', '{
    "titulo": "Preços simples e transparentes",
    "subtitulo": "Escolha o plano ideal para o tamanho da sua ILPI. Sem taxas ocultas."
  }'::jsonb),

  ('testimonials', '{
    "titulo": "Quem usa, recomenda",
    "subtitulo": "Gestores e equipes de ILPIs em todo o Brasil confiam no RecantoCare.",
    "itens": [
      { "name": "Maria Silva", "role": "Diretora Administrativa", "institution": "Lar Esperança — São Paulo, SP", "text": "O RecantoCare transformou nossa operação. Antes perdíamos horas com planilhas. Hoje tudo é automatizado e a qualidade do cuidado melhorou visivelmente.", "rating": 5, "avatar": "MS", "avatarColor": "bg-pink-500" },
      { "name": "Dr. Carlos Mendes", "role": "Médico Coordenador", "institution": "Residencial Vida Nova — Rio de Janeiro, RJ", "text": "O controle de medicações e sinais vitais é excepcional. Consigo acompanhar todos os residentes em tempo real de qualquer lugar. Indispensável.", "rating": 5, "avatar": "CM", "avatarColor": "bg-blue-600" },
      { "name": "Ana Rodrigues", "role": "Enfermeira Chefe", "institution": "Casa de Repouso Harmonia — Belo Horizonte, MG", "text": "Os checklists diários são muito intuitivos. Nossa equipe adotou em dias e a organização dos cuidados ficou muito melhor. Recomendo a todos.", "rating": 5, "avatar": "AR", "avatarColor": "bg-emerald-600" }
    ]
  }'::jsonb),

  ('cta_final', '{
    "titulo": "Pronto para transformar sua ILPI?",
    "subtitulo": "Junte-se a mais de 500 ILPIs que já modernizaram sua gestão com o RecantoCare.",
    "cta_primario": "Assinar agora",
    "cta_secundario": "Já tenho conta",
    "rodape": "Ativação imediata · Cancele quando quiser · Suporte humano"
  }'::jsonb),

  ('footer', '{
    "tagline": "A plataforma líder em gestão de ILPIs no Brasil.",
    "copyright": "© 2026 RecantoCare. Todos os direitos reservados.",
    "lgpd": "Dados protegidos conforme LGPD"
  }'::jsonb)
on conflict (secao) do nothing;

-- ─── 3. Recanto_ImagensSite — slots de imagem ────────────────────────────────
create table if not exists public."Recanto_ImagensSite" (
  chave      text primary key,
  url        text,
  alt_text   text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_imagens_site_updated_at on public."Recanto_ImagensSite";
create trigger trg_imagens_site_updated_at
  before update on public."Recanto_ImagensSite"
  for each row execute function public.set_updated_at();

alter table public."Recanto_ImagensSite" enable row level security;

drop policy if exists "imagens_site_select_publico" on public."Recanto_ImagensSite";
create policy "imagens_site_select_publico" on public."Recanto_ImagensSite"
  for select to anon, authenticated
  using (true);

insert into public."Recanto_ImagensSite" (chave, url, alt_text) values
  ('logo',        null, 'Logo RecantoCare'),
  ('hero_imagem', null, 'Imagem de destaque do RecantoCare'),
  ('og_image',    null, 'Imagem de compartilhamento do RecantoCare')
on conflict (chave) do nothing;

-- ─── 4. Storage bucket site-assets — leitura pública, escrita só superadmin ──
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists "Site Assets - Leitura pública" on storage.objects;
create policy "Site Assets - Leitura pública" on storage.objects
  for select using (bucket_id = 'site-assets');

drop policy if exists "Site Assets - Escrita superadmin" on storage.objects;
create policy "Site Assets - Escrita superadmin" on storage.objects
  for all using (bucket_id = 'site-assets' and recanto_is_superadmin())
  with check (bucket_id = 'site-assets' and recanto_is_superadmin());

-- ─── 5. RPCs superadmin_* ─────────────────────────────────────────────────────

-- Lista todos os planos (inclusive inativos) para a tela de administração
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
    p.descricao, p.features, p.popular, p.badge_label, p.cta_label, p.updated_at
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

-- Cria ou atualiza um plano do catálogo
create or replace function superadmin_upsert_plano(
  p_plano_id                        text,
  p_plano_nome                      text,
  p_preco_mensal                    numeric,
  p_preco_anual_total               numeric,
  p_preco_mensal_equivalente_anual  numeric default null,
  p_ativo                           boolean default true,
  p_self_service                    boolean default true,
  p_descricao                       text default '',
  p_features                        jsonb default '[]',
  p_popular                         boolean default false,
  p_badge_label                     text default null,
  p_cta_label                       text default 'Assinar agora'
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
    descricao, features, popular, badge_label, cta_label
  )
  values (
    p_plano_id, p_plano_nome, p_preco_mensal, p_preco_anual_total,
    p_preco_mensal_equivalente_anual, p_ativo, p_self_service,
    p_descricao, p_features, p_popular, p_badge_label, p_cta_label
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
    updated_at                     = now();

  return true;
end;
$$;

-- Lista todo o conteúdo de texto do site (para a tela de administração)
create or replace function superadmin_get_conteudo_site()
returns table(secao text, conteudo jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not recanto_is_superadmin() then
    raise exception 'Acesso negado: requer permissão de superadmin';
  end if;

  return query
  select c.secao, c.conteudo, c.updated_at
  from "Recanto_ConteudoSite" c
  order by c.secao;
end;
$$;

-- Cria ou atualiza o conteúdo de uma seção da landing page
create or replace function superadmin_upsert_conteudo_site(
  p_secao    text,
  p_conteudo jsonb
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

  insert into "Recanto_ConteudoSite" (secao, conteudo)
  values (p_secao, p_conteudo)
  on conflict (secao) do update set
    conteudo   = excluded.conteudo,
    updated_at = now();

  return true;
end;
$$;

-- Lista todas as imagens do site (para a tela de administração)
create or replace function superadmin_get_imagens_site()
returns table(chave text, url text, alt_text text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not recanto_is_superadmin() then
    raise exception 'Acesso negado: requer permissão de superadmin';
  end if;

  return query
  select i.chave, i.url, i.alt_text, i.updated_at
  from "Recanto_ImagensSite" i
  order by i.chave;
end;
$$;

-- Cria ou atualiza um slot de imagem do site
create or replace function superadmin_upsert_imagem_site(
  p_chave    text,
  p_url      text,
  p_alt_text text default null
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

  insert into "Recanto_ImagensSite" (chave, url, alt_text)
  values (p_chave, p_url, p_alt_text)
  on conflict (chave) do update set
    url        = excluded.url,
    alt_text   = excluded.alt_text,
    updated_at = now();

  return true;
end;
$$;

-- ─── Grants ────────────────────────────────────────────────────────────────────
grant execute on function superadmin_list_planos()                                     to authenticated;
grant execute on function superadmin_upsert_plano(text, text, numeric, numeric, numeric, boolean, boolean, text, jsonb, boolean, text, text) to authenticated;
grant execute on function superadmin_get_conteudo_site()                                to authenticated;
grant execute on function superadmin_upsert_conteudo_site(text, jsonb)                  to authenticated;
grant execute on function superadmin_get_imagens_site()                                 to authenticated;
grant execute on function superadmin_upsert_imagem_site(text, text, text)               to authenticated;
