-- Migration: Superadmin setup — cross-tenant query functions with SECURITY DEFINER
-- All functions verify is_superadmin claim in JWT before returning any data.
--
-- SETUP (run once in Supabase SQL Editor after applying this migration):
--   UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data || '{"is_superadmin": true}'::jsonb
--   WHERE email = 'dev@quantumtecnologia.com.br';

-- ─── Authorization helper ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recanto_is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (raw_user_meta_data->>'is_superadmin')::boolean
     FROM auth.users
     WHERE id = auth.uid()),
    false
  );
$$;

-- ─── Dashboard KPIs ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_dashboard_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_empresas',     COUNT(*)::int,
      'empresas_ativas',    COUNT(*) FILTER (WHERE e.status = 'ativa')::int,
      'empresas_trial',     COUNT(*) FILTER (WHERE a.status = 'em_trial')::int,
      'empresas_suspensas', COUNT(*) FILTER (WHERE e.status = 'bloqueada')::int,
      'mrr_total',          COALESCE(SUM(a.valor_mensal) FILTER (WHERE a.status = 'ativa'), 0)::numeric,
      'arr_estimado',       COALESCE(SUM(a.valor_mensal) FILTER (WHERE a.status = 'ativa') * 12, 0)::numeric,
      'total_residentes',   (SELECT COUNT(*)::int FROM "Recanto_Residentes"),
      'total_usuarios',     (SELECT COUNT(*)::int FROM "Recanto_Usuarios")
    )
    FROM "Recanto_Empresas" e
    LEFT JOIN LATERAL (
      SELECT status, valor_mensal
      FROM "Recanto_Assinaturas"
      WHERE empresa_id = e.empresa_id
      ORDER BY created_at DESC
      LIMIT 1
    ) a ON true
  );
END;
$$;

-- ─── All empresas with subscription info ──────────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_empresas()
RETURNS TABLE(
  id                  uuid,
  empresa_id          text,
  nome_instituicao    text,
  cidade              text,
  estado              text,
  email_comercial     text,
  status              text,
  plano_id            text,
  plano_nome          text,
  valor_mensal        numeric,
  subscription_status text,
  data_vencimento     timestamptz,
  qtd_residentes      bigint,
  qtd_usuarios        bigint,
  created_at          timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.empresa_id,
    e.nome_instituicao,
    e.cidade,
    e.estado,
    e.email_comercial,
    e.status,
    a.plano_id,
    a.plano_nome,
    a.valor_mensal,
    a.status               AS subscription_status,
    a.data_vencimento,
    (SELECT COUNT(*) FROM "Recanto_Residentes" r WHERE r.empresa_id = e.empresa_id),
    (SELECT COUNT(*) FROM "Recanto_Usuarios"   u WHERE u.empresa_id = e.empresa_id),
    e.created_at
  FROM "Recanto_Empresas" e
  LEFT JOIN LATERAL (
    SELECT s.plano_id, s.plano_nome, s.valor_mensal, s.status, s.data_vencimento::timestamptz
    FROM "Recanto_Assinaturas" s
    WHERE s.empresa_id = e.empresa_id
    ORDER BY s.created_at DESC
    LIMIT 1
  ) a ON true
  ORDER BY e.created_at DESC;
END;
$$;

-- ─── Recent company activity ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_recent_activity(p_limit int DEFAULT 20)
RETURNS TABLE(
  id               uuid,
  empresa_id       text,
  nome_instituicao text,
  tipo             text,
  descricao        text,
  metadata         jsonb,
  created_at       timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.empresa_id,
    e.nome_instituicao,
    l.tipo,
    l.descricao,
    l.metadata,
    l.created_at
  FROM "Recanto_Logs_Empresa" l
  LEFT JOIN "Recanto_Empresas" e ON e.empresa_id = l.empresa_id
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ─── Billing overview (plan distribution + subscription list) ─────────────────
CREATE OR REPLACE FUNCTION superadmin_get_billing_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  RETURN jsonb_build_object(
    'by_plan', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'plano_id',   plano_id,
            'plano_nome', plano_nome,
            'count',      cnt::int,
            'mrr',        total_mrr
          ) ORDER BY total_mrr DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT plano_id, plano_nome, COUNT(*) AS cnt, COALESCE(SUM(valor_mensal), 0) AS total_mrr
        FROM "Recanto_Assinaturas"
        WHERE status = 'ativa'
        GROUP BY plano_id, plano_nome
      ) t
    ),
    'subscriptions', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'nome_instituicao', e.nome_instituicao,
            'plano_nome',       a.plano_nome,
            'valor_mensal',     a.valor_mensal,
            'status',           a.status,
            'data_vencimento',  a.data_vencimento,
            'email_comercial',  e.email_comercial
          ) ORDER BY a.data_vencimento ASC NULLS LAST
        ),
        '[]'::jsonb
      )
      FROM "Recanto_Assinaturas" a
      JOIN "Recanto_Empresas" e ON e.empresa_id = a.empresa_id
      WHERE a.status IN ('ativa', 'em_trial', 'vencida', 'pagamento_recusado', 'pendente')
      LIMIT 200
    )
  );
END;
$$;

-- ─── Cross-tenant access logs ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_access_logs(p_limit int DEFAULT 50)
RETURNS TABLE(
  id               uuid,
  empresa_id       text,
  nome_instituicao text,
  user_name        text,
  role             text,
  action           text,
  ip_address       text,
  created_at       timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.empresa_id,
    e.nome_instituicao,
    l.user_name,
    l.role::text,
    l.action::text,
    l.ip_address,
    l.created_at
  FROM "Recanto_LogsAcesso" l
  LEFT JOIN "Recanto_Empresas" e ON e.empresa_id = l.empresa_id
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ─── Update empresa status (logs action to Recanto_Logs_Empresa) ──────────────
CREATE OR REPLACE FUNCTION superadmin_update_empresa_status(
  p_empresa_id  text,
  p_novo_status text,
  p_motivo      text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_anterior text;
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  IF p_novo_status NOT IN ('ativa', 'pendente', 'bloqueada', 'cancelada') THEN
    RAISE EXCEPTION 'Status inválido: %. Use: ativa, pendente, bloqueada, cancelada', p_novo_status;
  END IF;

  SELECT status INTO v_status_anterior
  FROM "Recanto_Empresas"
  WHERE empresa_id = p_empresa_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada: %', p_empresa_id;
  END IF;

  UPDATE "Recanto_Empresas"
  SET status = p_novo_status, updated_at = now()
  WHERE empresa_id = p_empresa_id;

  INSERT INTO "Recanto_Logs_Empresa" (empresa_id, tipo, descricao, metadata)
  VALUES (
    p_empresa_id,
    CASE p_novo_status
      WHEN 'ativa'     THEN 'empresa_reativada'
      WHEN 'bloqueada' THEN 'empresa_bloqueada'
      WHEN 'cancelada' THEN 'assinatura_cancelada'
      ELSE 'status_alterado'
    END,
    COALESCE(
      p_motivo,
      'Status alterado pelo superadmin: ' || COALESCE(v_status_anterior, '?') || ' → ' || p_novo_status
    ),
    jsonb_build_object(
      'status_anterior', v_status_anterior,
      'novo_status',     p_novo_status,
      'alterado_por',    'superadmin'
    )
  );

  RETURN true;
END;
$$;

-- ─── Grant execute to authenticated users (functions check is_superadmin internally) ───
GRANT EXECUTE ON FUNCTION recanto_is_superadmin()                                    TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_dashboard_kpis()                            TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_empresas()                                  TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_recent_activity(int)                        TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_billing_overview()                          TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_access_logs(int)                            TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_update_empresa_status(text, text, text)         TO authenticated;
