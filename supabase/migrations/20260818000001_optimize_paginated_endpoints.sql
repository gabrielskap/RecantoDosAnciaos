-- ============================================================================
-- RECANTO DOS ANCIAOS — Otimizacao dos endpoints paginados do prontuario
-- Data: 2026-08-18
--
-- Esta migration reconcilia otimizacoes que antes estavam em uma versao de
-- migration duplicada. Ela nao altera politicas RLS nem regras de acesso:
-- apenas reafirma a volatilidade STABLE dos helpers, preservando os corpos
-- atuais, e garante os indices usados pelos filtros/ordenacoes do front-end.
-- ============================================================================

-- ─── 1. Helpers usados pelas politicas RLS ──────────────────────────────────
-- Os corpos abaixo sao intencionalmente identicos aos da ultima definicao no
-- historico. STABLE permite ao PostgreSQL tratar o resultado como constante
-- durante o statement, sem mudar a semantica de autorizacao existente.

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
  -- Tenta obter do JWT (rapido e evita RLS)
  v_empresa_id := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::text;

  -- Se for nulo, busca da tabela auth.users (evita recursao de RLS na Recanto_Usuarios)
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

-- ─── 2. Historicos paginados e relacoes clinicas ────────────────────────────

-- Ja existe na migration base; IF NOT EXISTS reconcilia bancos onde o indice
-- nao tenha sido criado e atende filtro + ordenacao por residente/timestamp.
CREATE INDEX IF NOT EXISTS idx_sinais_vitais_resident_ts
  ON public."Recanto_SinaisVitais" (resident_id, timestamp DESC);

-- Cobre o FK resident_id, a selecao de medicacoes vigentes por end_date e a
-- ordenacao nominal usada ao montar os dados resumidos do residente.
CREATE INDEX IF NOT EXISTS idx_medicacoes_resident_end_date_name
  ON public."Recanto_Medicacoes" (resident_id, end_date, name);

-- Ordem deterministica da pagina de auditoria, inclusive quando duas linhas
-- possuem o mesmo timestamp.
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_resident_ts_id
  ON public."Recanto_LogsAuditoria" (resident_id, timestamp DESC, id DESC);

-- Caminho especifico para filtro por tipo de acao, seguido pela mesma ordem
-- deterministica da pagina.
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_resident_action_ts_id
  ON public."Recanto_LogsAuditoria"
  (resident_id, action, timestamp DESC, id DESC);

-- ─── 3. FKs usados nos embeds/resumos do residente ─────────────────────────
-- Alguns destes indices tambem existiam apenas na migration de versao
-- duplicada. Reafirma-los aqui torna o estado final independente de qual
-- arquivo daquela versao foi registrado no ambiente remoto.

CREATE INDEX IF NOT EXISTS idx_alergias_resident
  ON public."Recanto_Alergias" (resident_id);

CREATE INDEX IF NOT EXISTS idx_contatos_emerg_resident
  ON public."Recanto_ContatosEmergencia" (resident_id);

CREATE INDEX IF NOT EXISTS idx_planos_assist_resident
  ON public."Recanto_PlanosAssistencia" (resident_id);

CREATE INDEX IF NOT EXISTS idx_documentos_resident
  ON public."Recanto_Documentos" (resident_id);

CREATE INDEX IF NOT EXISTS idx_restricoes_dieta_diet_plan
  ON public."Recanto_RestricoesDieta" (diet_plan_id);

-- Recanto_ResponsaveisLegais.resident_id ja e coberto pelo indice UNIQUE da
-- constraint recanto_resp_legais_resident_id_key. Nao criar outro indice evita
-- custo duplicado em INSERT/UPDATE.
--
-- O FK Recanto_Medicacoes.resident_id e coberto pelo indice composto
-- idx_medicacoes_resident_end_date_name criado acima.
