-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Corrige timeout (57014) ao buscar residentes
-- Data: 2026-07-16
-- Descrição:
--   O front-end (dataService.fetchResidents) faz um único SELECT aninhado
--   embutindo ~15 tabelas relacionadas por residente. Duas causas combinadas
--   tornavam essa consulta lenta o suficiente para estourar o statement_timeout:
--
--   1) As funções auxiliares de RLS (recanto_get_profile_type, recanto_get_resident_id,
--      recanto_get_empresa_id, recanto_get_employee_role) não eram marcadas STABLE.
--      Sem STABLE, o Postgres não pode cachear o resultado nem otimizar o plano —
--      ele reavalia a função a cada linha verificada pela política de RLS, em vez
--      de uma única vez por statement.
--   2) Várias FKs resident_id usadas nos embeds não tinham índice
--      (Alergias, ContatosEmergencia, ResponsaveisLegais, Medicacoes,
--      PlanosAssistencia, Documentos), forçando sequential scan nessas tabelas
--      para cada residente retornado.
--
--   Ambas as mudanças são apenas otimizações de plano/índice — não alteram
--   comportamento nem regras de acesso.
-- ==========================================================================

-- ─── 1. Marcar funções auxiliares de RLS como STABLE ─────────────────────────

CREATE OR REPLACE FUNCTION public.recanto_get_profile_type()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT p.type::TEXT
  FROM "Recanto_Usuarios" u
  JOIN "Recanto_Perfis" p ON u.profile_id = p.id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.recanto_get_resident_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT resident_id
  FROM "Recanto_Usuarios"
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.recanto_get_empresa_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_empresa_id text;
BEGIN
  -- Tenta obter do JWT (rápido e evita RLS)
  v_empresa_id := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::text;

  -- Se for nulo, busca da tabela auth.users (evita recursão de RLS na Recanto_Usuarios)
  IF v_empresa_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT (raw_user_meta_data ->> 'empresa_id')::text INTO v_empresa_id
    FROM auth.users
    WHERE id = auth.uid();
  END IF;

  RETURN v_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recanto_get_employee_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::TEXT
  FROM public."Recanto_Funcionarios"
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ─── 2. Índices ausentes em resident_id (usados nos embeds de fetchResidents) ─

CREATE INDEX IF NOT EXISTS idx_alergias_resident      ON public."Recanto_Alergias"(resident_id);
CREATE INDEX IF NOT EXISTS idx_contatos_emerg_resident ON public."Recanto_ContatosEmergencia"(resident_id);
CREATE INDEX IF NOT EXISTS idx_resp_legais_resident    ON public."Recanto_ResponsaveisLegais"(resident_id);
CREATE INDEX IF NOT EXISTS idx_medicacoes_resident     ON public."Recanto_Medicacoes"(resident_id);
CREATE INDEX IF NOT EXISTS idx_planos_assist_resident  ON public."Recanto_PlanosAssistencia"(resident_id);
CREATE INDEX IF NOT EXISTS idx_documentos_resident     ON public."Recanto_Documentos"(resident_id);
