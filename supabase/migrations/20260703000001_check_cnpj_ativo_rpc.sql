-- Função pública para verificar se um CNPJ já está cadastrado e ativo.
-- Usada no checkout antes de permitir avanço no formulário.
-- SECURITY DEFINER permite que usuários anônimos (role anon) consultem sem
-- acesso direto à tabela Recanto_Empresas.
CREATE OR REPLACE FUNCTION public.check_cnpj_ativo(cnpj_input text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Recanto_Empresas"
    WHERE cnpj = regexp_replace(cnpj_input, '\D', '', 'g')
      AND status IN ('ativa', 'em_trial')
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_cnpj_ativo(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_cnpj_ativo(text) TO authenticated;
