-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Copy honesta + reposicionamento RDC 283 (landing/CMS)
-- Data: 2026-07-29
-- Descrição:
--   Corrige as provas sociais não comprováveis semeadas em
--   20260715000001_site_cms.sql (números, selos e depoimentos fictícios) e
--   reposiciona a mensagem em torno de compliance/vigilância sanitária,
--   conforme a pesquisa de mercado (Hammer, Jul/2026).
--
--   IMPORTANTE: o que o visitante real vê vem desta tabela (Recanto_ConteudoSite),
--   não dos defaults do código. Esta migration é a fonte da verdade em produção.
--
--   Usa merge JSONB (operador ||) para substituir apenas as chaves de topo
--   alteradas de cada seção, preservando o restante. Idempotente: reaplicar
--   produz o mesmo resultado. Roda após o seed inicial, então instalações
--   novas também terminam com a copy honesta.
-- ==========================================================================

-- ─── HERO — remove "#1", troca métricas fabricadas por chips de capacidade,
--             e lidera com a dor de fiscalização (RDC 283) ────────────────────
update public."Recanto_ConteudoSite" set conteudo = conteudo || '{
  "eyebrow": "Conformidade RDC 283/2005 + gestão completa",
  "subtitulo": "Prontuário eletrônico, controle de medicação e relatórios exigidos pela vigilância sanitária — evite autuações e cuide melhor. Toda a gestão da sua ILPI (saúde, financeiro, equipe e estoque) em uma só plataforma.",
  "stats": [
    { "valor": "RDC 283", "label": "Documentação em conformidade" },
    { "valor": "LGPD", "label": "Dados protegidos" },
    { "valor": "Nuvem", "label": "100% online, sem instalação" }
  ]
}'::jsonb
where secao = 'hero';

-- ─── SOBRE — remove selos de prêmio inexistentes e métricas fabricadas
--             (98% satisfação / 4h/dia), troca por capacidades factuais ───────
update public."Recanto_ConteudoSite" set conteudo = conteudo || '{
  "reconhecimento_label": "Feito para a realidade das ILPIs",
  "badges": ["Conformidade ANVISA RDC 283", "Segurança LGPD", "Backup automático", "Suporte humano"],
  "stat_tiles": [
    { "valor": "RDC 283", "label": "conformidade documental" },
    { "valor": "100%", "label": "na nuvem, sem instalação" },
    { "valor": "24/7", "label": "acesso de qualquer lugar" },
    { "valor": "IA", "label": "resumos e insights clínicos" }
  ]
}'::jsonb
where secao = 'sobre';

-- ─── TESTIMONIALS — remove depoimentos fictícios; seção fica oculta enquanto
--             "itens" estiver vazio (guarda no LandingPage.tsx) ───────────────
update public."Recanto_ConteudoSite" set conteudo = conteudo || '{
  "subtitulo": "Gestores e equipes de ILPIs que confiam no RecantoCare.",
  "itens": []
}'::jsonb
where secao = 'testimonials';

-- ─── CTA FINAL — remove "mais de 500 ILPIs"; reforça conformidade ────────────
update public."Recanto_ConteudoSite" set conteudo = conteudo || '{
  "titulo": "Coloque sua ILPI em conformidade e no controle",
  "subtitulo": "Prontuário, controle de medicação, relatórios para a vigilância sanitária e toda a gestão da sua instituição — comece hoje, sem instalação."
}'::jsonb
where secao = 'cta_final';

-- ─── FOOTER — remove "plataforma líder"; tagline factual ─────────────────────
update public."Recanto_ConteudoSite" set conteudo = conteudo || '{
  "tagline": "Gestão e conformidade para Instituições de Longa Permanência para Idosos."
}'::jsonb
where secao = 'footer';
