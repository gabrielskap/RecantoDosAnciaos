-- Migration: Superadmin — criar nova ILPI/empresa diretamente pelo painel

CREATE OR REPLACE FUNCTION superadmin_create_empresa(
  p_nome_instituicao  text,
  p_email_comercial   text    DEFAULT NULL,
  p_cidade            text    DEFAULT NULL,
  p_estado            text    DEFAULT NULL,
  p_cnpj              text    DEFAULT NULL,
  p_telefone          text    DEFAULT NULL,
  p_plano_id          text    DEFAULT 'essencial',
  p_plano_nome        text    DEFAULT 'Essencial',
  p_valor_mensal      numeric DEFAULT 399,
  p_status_inicial    text    DEFAULT 'ativa'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id text;
BEGIN
  IF NOT recanto_is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de superadmin';
  END IF;

  IF p_nome_instituicao IS NULL OR trim(p_nome_instituicao) = '' THEN
    RAISE EXCEPTION 'Nome da instituição é obrigatório';
  END IF;

  IF p_status_inicial NOT IN ('ativa', 'em_trial', 'pendente') THEN
    RAISE EXCEPTION 'Status inválido: %. Use: ativa, em_trial, pendente', p_status_inicial;
  END IF;

  -- Gera empresa_id único no formato emp_YYYYMMDD_xxxxxxxx
  v_empresa_id := 'emp_' || to_char(now(), 'YYYYMMDD') || '_' || substr(md5(gen_random_uuid()::text), 1, 8);

  INSERT INTO "Recanto_Empresas" (
    empresa_id, nome_instituicao, email_comercial,
    cidade, estado, cnpj, telefone, status
  ) VALUES (
    v_empresa_id,
    trim(p_nome_instituicao),
    nullif(trim(p_email_comercial), ''),
    nullif(trim(p_cidade), ''),
    nullif(upper(trim(p_estado)), ''),
    nullif(trim(p_cnpj), ''),
    nullif(trim(p_telefone), ''),
    CASE p_status_inicial WHEN 'em_trial' THEN 'ativa' ELSE p_status_inicial END
  );

  INSERT INTO "Recanto_Assinaturas" (
    empresa_id, plano_id, plano_nome, valor_mensal,
    status, data_inicio, data_vencimento
  ) VALUES (
    v_empresa_id,
    p_plano_id,
    p_plano_nome,
    p_valor_mensal,
    p_status_inicial,
    current_date,
    CASE p_status_inicial
      WHEN 'em_trial' THEN current_date + interval '14 days'
      ELSE current_date + interval '30 days'
    END
  );

  INSERT INTO "Recanto_Logs_Empresa" (empresa_id, tipo, descricao, metadata)
  VALUES (
    v_empresa_id,
    'empresa_criada',
    'ILPI criada pelo superadmin: ' || trim(p_nome_instituicao),
    jsonb_build_object(
      'plano_id',   p_plano_id,
      'plano_nome', p_plano_nome,
      'status',     p_status_inicial,
      'criado_por', 'superadmin'
    )
  );

  RETURN v_empresa_id;
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_create_empresa(text, text, text, text, text, text, text, text, numeric, text)
  TO authenticated;
