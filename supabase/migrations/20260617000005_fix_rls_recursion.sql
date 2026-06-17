-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Correção de Recursão de RLS e Perfis Globais
-- Data: 2026-06-17
-- Descrição: Corrige recursão na função recanto_get_empresa_id e ajusta
--            políticas de Perfis/Permissões para permitir perfis globais (empresa_id IS NULL).
-- ==========================================================================

-- 1. Redefine a função para evitar recursão buscando do JWT ou auth.users
CREATE OR REPLACE FUNCTION public.recanto_get_empresa_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 2. Atualiza usuários cujo empresa_id possa estar desatualizado com base no auth.users
UPDATE public."Recanto_Usuarios" u
SET empresa_id = (SELECT (raw_user_meta_data ->> 'empresa_id')::text FROM auth.users au WHERE au.id = u.auth_user_id)
WHERE u.empresa_id IS NULL;

-- 3. Atualiza políticas para Recanto_Perfis para aceitar perfis com empresa_id nulo (perfis globais do sistema)
DROP POLICY IF EXISTS "perfis_tenant_restrictive" ON public."Recanto_Perfis";
CREATE POLICY "perfis_tenant_restrictive" ON public."Recanto_Perfis" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (empresa_id = public.recanto_get_empresa_id() OR empresa_id IS NULL) 
  WITH CHECK (empresa_id = public.recanto_get_empresa_id() OR empresa_id IS NULL);

-- 4. Atualiza políticas para Recanto_Permissoes para aceitar permissões vinculadas a perfis globais
DROP POLICY IF EXISTS "permissoes_tenant_restrictive" ON public."Recanto_Permissoes";
CREATE POLICY "permissoes_tenant_restrictive" ON public."Recanto_Permissoes" 
  AS RESTRICTIVE FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public."Recanto_Perfis" p 
    WHERE p.id = profile_id 
      AND (p.empresa_id = public.recanto_get_empresa_id() OR p.empresa_id IS NULL)
  ));
