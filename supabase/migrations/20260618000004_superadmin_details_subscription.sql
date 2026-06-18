-- Migration: SuperAdmin — edição de cadastro e gestão de assinatura
-- Adds: superadmin_update_empresa_details, superadmin_update_assinatura
-- Updates: superadmin_get_empresas to include cnpj and telefone

-- ─── Update superadmin_get_empresas (add cnpj + telefone) ────────────────────
DROP FUNCTION IF EXISTS superadmin_get_empresas();
CREATE OR REPLACE FUNCTION superadmin_get_empresas()
RETURNS TABLE(
  id                  uuid,
  empresa_id          text,
  nome_instituicao    text,
  cnpj                text,
  telefone            text,
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
    e.cnpj,
    e.telefone,
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
    SELECT plano_id, plano_nome, valor_mensal, status, data_vencimento
    FROM "Recanto_Assinaturas"
    WHERE empresa_id = e.empresa_id
    ORDER BY created_at DESC
    LIMIT 1
  ) a ON true
  ORDER BY e.created_at DESC;
END;
$$;

-- ─── Update empresa details ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_update_empresa_details(
  p_empresa_id       text,
  p_nome_instituicao text    DEFAULT NULL,
  p_email_comercial  text    DEFAULT NULL,
  p_cidade           text    DEFAULT NULL,
  p_estado           text    DEFAULT NULL,
  p_cnpj             text    DEFAULT NULL,
  p_telefone         text    DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  UPDATE "Recanto_Empresas"
  SET
    nome_instituicao = COALESCE(p_nome_instituicao, nome_instituicao),
    email_comercial  = COALESCE(p_email_comercial,  email_comercial),
    cidade           = COALESCE(p_cidade,           cidade),
    estado           = COALESCE(p_estado,           estado),
    cnpj             = COALESCE(p_cnpj,             cnpj),
    telefone         = COALESCE(p_telefone,         telefone),
    updated_at       = now()
  WHERE empresa_id = p_empresa_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada: %', p_empresa_id;
  END IF;

  INSERT INTO "Recanto_Logs_Empresa" (empresa_id, tipo, descricao, metadata)
  VALUES (
    p_empresa_id,
    'dados_atualizados',
    'Dados cadastrais atualizados pelo SuperAdmin',
    jsonb_build_object('acao', 'update_details')
  );

  RETURN true;
END;
$$;

-- ─── Manage subscription ─────────────────────────────────────────────────────
-- p_acao: 'change_plan' | 'extend_trial' | 'cancel' | 'reactivate' | 'manual_payment'
CREATE OR REPLACE FUNCTION superadmin_update_assinatura(
  p_empresa_id    text,
  p_acao          text,
  p_plano_id      text    DEFAULT NULL,
  p_plano_nome    text    DEFAULT NULL,
  p_valor_mensal  numeric DEFAULT NULL,
  p_dias_extensao integer DEFAULT NULL,
  p_motivo        text    DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assinatura_id uuid;
  v_log_tipo      text;
  v_log_descricao text;
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  SELECT id INTO v_assinatura_id
  FROM "Recanto_Assinaturas"
  WHERE empresa_id = p_empresa_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_assinatura_id IS NULL THEN
    RAISE EXCEPTION 'Assinatura não encontrada para a empresa %', p_empresa_id;
  END IF;

  IF p_acao = 'change_plan' THEN
    UPDATE "Recanto_Assinaturas"
    SET plano_id = p_plano_id, plano_nome = p_plano_nome, valor_mensal = p_valor_mensal,
        updated_at = now()
    WHERE id = v_assinatura_id;
    v_log_tipo      := 'plano_alterado';
    v_log_descricao := 'Plano alterado para ' || COALESCE(p_plano_nome, p_plano_id) || ' pelo SuperAdmin';

  ELSIF p_acao = 'extend_trial' THEN
    UPDATE "Recanto_Assinaturas"
    SET data_vencimento = COALESCE(data_vencimento, now()) + (COALESCE(p_dias_extensao, 14) || ' days')::interval,
        updated_at = now()
    WHERE id = v_assinatura_id;
    v_log_tipo      := 'trial_estendido';
    v_log_descricao := 'Trial estendido por ' || COALESCE(p_dias_extensao, 14) || ' dias pelo SuperAdmin';

  ELSIF p_acao = 'cancel' THEN
    UPDATE "Recanto_Assinaturas"
    SET status = 'cancelada', data_cancelamento = now(), updated_at = now()
    WHERE id = v_assinatura_id;
    UPDATE "Recanto_Empresas"
    SET status = 'cancelada', updated_at = now()
    WHERE empresa_id = p_empresa_id;
    v_log_tipo      := 'assinatura_cancelada';
    v_log_descricao := 'Assinatura cancelada pelo SuperAdmin' ||
      CASE WHEN p_motivo IS NOT NULL THEN '. Motivo: ' || p_motivo ELSE '' END;

  ELSIF p_acao = 'reactivate' THEN
    UPDATE "Recanto_Assinaturas"
    SET status = 'ativa', data_cancelamento = NULL,
        data_vencimento = now() + INTERVAL '30 days', updated_at = now()
    WHERE id = v_assinatura_id;
    UPDATE "Recanto_Empresas"
    SET status = 'ativa', updated_at = now()
    WHERE empresa_id = p_empresa_id;
    v_log_tipo      := 'empresa_reativada';
    v_log_descricao := 'Assinatura reativada pelo SuperAdmin';

  ELSIF p_acao = 'manual_payment' THEN
    UPDATE "Recanto_Assinaturas"
    SET status = 'ativa', data_vencimento = now() + INTERVAL '30 days', updated_at = now()
    WHERE id = v_assinatura_id;
    UPDATE "Recanto_Empresas"
    SET status = 'ativa', updated_at = now()
    WHERE empresa_id = p_empresa_id;
    v_log_tipo      := 'pagamento_aprovado';
    v_log_descricao := 'Pagamento manual registrado pelo SuperAdmin' ||
      CASE WHEN p_motivo IS NOT NULL THEN '. Referência: ' || p_motivo ELSE '' END;

  ELSE
    RAISE EXCEPTION 'Ação desconhecida: %. Use: change_plan, extend_trial, cancel, reactivate, manual_payment', p_acao;
  END IF;

  INSERT INTO "Recanto_Logs_Empresa" (empresa_id, tipo, descricao, metadata)
  VALUES (
    p_empresa_id,
    v_log_tipo,
    v_log_descricao,
    jsonb_build_object('acao', p_acao, 'motivo', p_motivo)
  );

  RETURN true;
END;
$$;

-- ─── Grant execute ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION superadmin_get_empresas()                                                          TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_update_empresa_details(text, text, text, text, text, text, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_update_assinatura(text, text, text, text, numeric, integer, text)       TO authenticated;
