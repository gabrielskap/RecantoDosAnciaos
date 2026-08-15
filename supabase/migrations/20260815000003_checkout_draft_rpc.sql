-- Checkout progressivo: substitui acesso público direto por uma RPC de escrita.
-- O token UUID é opaco e funciona como capacidade de escrita; nenhuma leitura
-- dos dados de cadastro fica exposta ao navegador.

ALTER TABLE public."Recanto_Checkout_Rascunhos" ENABLE ROW LEVEL SECURITY;

-- O cliente não deve consultar nem gravar a tabela diretamente. Mantemos apenas
-- o mínimo para a Edge Function, que usa a chave service_role no servidor para
-- carregar e invalidar o rascunho durante a criação da assinatura.
REVOKE ALL PRIVILEGES ON TABLE public."Recanto_Checkout_Rascunhos"
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public."Recanto_Checkout_Rascunhos" TO service_role;

-- Remove quaisquer policies legadas: a tabela passa a não ter acesso direto por
-- papéis de navegador. A operação é propositalmente genérica para também
-- corrigir instâncias que tenham recebido policies equivalentes manualmente.
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Recanto_Checkout_Rascunhos'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_name,
      'Recanto_Checkout_Rascunhos'
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.recanto_save_checkout_rascunho(
  p_rascunho_token UUID,
  p_dados_empresa JSONB DEFAULT NULL,
  p_dados_admin JSONB DEFAULT NULL,
  p_dados_plano JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_rascunho_token IS NULL THEN
    RAISE EXCEPTION 'Token do rascunho é obrigatório'
      USING ERRCODE = '22023';
  END IF;

  IF p_dados_empresa IS NULL
     AND p_dados_admin IS NULL
     AND p_dados_plano IS NULL THEN
    RAISE EXCEPTION 'Informe ao menos uma parte do rascunho'
      USING ERRCODE = '22023';
  END IF;

  IF p_dados_empresa IS NOT NULL AND jsonb_typeof(p_dados_empresa) <> 'object' THEN
    RAISE EXCEPTION 'Dados da empresa inválidos'
      USING ERRCODE = '22023';
  END IF;

  IF p_dados_admin IS NOT NULL AND jsonb_typeof(p_dados_admin) <> 'object' THEN
    RAISE EXCEPTION 'Dados do administrador inválidos'
      USING ERRCODE = '22023';
  END IF;

  IF p_dados_plano IS NOT NULL AND jsonb_typeof(p_dados_plano) <> 'object' THEN
    RAISE EXCEPTION 'Dados do plano inválidos'
      USING ERRCODE = '22023';
  END IF;

  -- Limita o payload e aceita apenas os campos que o checkout precisa. Isso
  -- impede que a RPC se torne um armazenamento público genérico, inclusive
  -- para senha, cartão ou CVV.
  IF COALESCE(octet_length(p_dados_empresa::TEXT), 0) > 16384
     OR COALESCE(octet_length(p_dados_admin::TEXT), 0) > 8192
     OR COALESCE(octet_length(p_dados_plano::TEXT), 0) > 2048 THEN
    RAISE EXCEPTION 'Rascunho excede o tamanho permitido'
      USING ERRCODE = '22001';
  END IF;

  IF p_dados_empresa IS NOT NULL AND EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_dados_empresa) AS campos(campo)
    WHERE campo <> ALL (ARRAY[
      'nomeInstituicao', 'cnpj', 'razaoSocial', 'nomeFantasia',
      'telefoneEmpresa', 'emailComercial', 'endereco', 'cidade', 'estado',
      'cep', 'qtdResidentes', 'qtdUsuarios'
    ]::TEXT[])
  ) THEN
    RAISE EXCEPTION 'Campo inválido nos dados da empresa'
      USING ERRCODE = '22023';
  END IF;

  IF p_dados_admin IS NOT NULL AND EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_dados_admin) AS campos(campo)
    WHERE campo <> ALL (ARRAY[
      'nomeAdmin', 'cpfAdmin', 'emailAdmin', 'telefoneAdmin', 'cargo'
    ]::TEXT[])
  ) THEN
    RAISE EXCEPTION 'Campo inválido nos dados do administrador'
      USING ERRCODE = '22023';
  END IF;

  IF p_dados_plano IS NOT NULL AND EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_dados_plano) AS campos(campo)
    WHERE campo <> ALL (ARRAY['planoId', 'periodicidade']::TEXT[])
  ) THEN
    RAISE EXCEPTION 'Campo inválido nos dados do plano'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public."Recanto_Checkout_Rascunhos" AS rascunho (
    rascunho_token,
    dados_empresa,
    dados_admin,
    dados_plano,
    expires_at
  )
  VALUES (
    p_rascunho_token::TEXT,
    COALESCE(p_dados_empresa, '{}'::JSONB),
    p_dados_admin,
    p_dados_plano,
    now() + INTERVAL '2 hours'
  )
  ON CONFLICT (rascunho_token) DO UPDATE
  SET
    dados_empresa = CASE
      WHEN p_dados_empresa IS NULL THEN rascunho.dados_empresa
      ELSE EXCLUDED.dados_empresa
    END,
    dados_admin = CASE
      WHEN p_dados_admin IS NULL THEN rascunho.dados_admin
      ELSE EXCLUDED.dados_admin
    END,
    dados_plano = CASE
      WHEN p_dados_plano IS NULL THEN rascunho.dados_plano
      ELSE EXCLUDED.dados_plano
    END,
    -- O prazo é renovado a cada etapa salva, evitando que um usuário ativo
    -- receba um rascunho expirado enquanto ainda preenche o checkout.
    expires_at = now() + INTERVAL '2 hours';
END;
$$;

REVOKE ALL ON FUNCTION public.recanto_save_checkout_rascunho(UUID, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recanto_save_checkout_rascunho(UUID, JSONB, JSONB, JSONB)
  TO anon, authenticated;
