-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Hardening de Segurança RLS
-- Data: 2026-06-17
-- Descrição:
--   1. Remove o bypass "empresa_id IS NULL = vê tudo" das políticas restritivas.
--      Usuários sem empresa_id no JWT ficam com acesso negado (retornam 0 linhas).
--   2. Remove INSERT liberado para anon nas tabelas de empresas/assinaturas/logs.
--   3. Mantém acesso do próprio usuário à sua linha em Recanto_Usuarios (necessário
--      para bootstrap do perfil no primeiro login).
-- ==========================================================================

-- ─── 1. REMOVER BYPASS NULL NAS POLÍTICAS RESTRITIVAS ────────────────────────
-- Antes: USING (recanto_get_empresa_id() IS NULL OR empresa_id = ...)
-- Depois: USING (empresa_id = recanto_get_empresa_id())
-- Efeito: usuário sem empresa_id no JWT não vê nenhum dado — fail safe.

DROP POLICY IF EXISTS "empresas_tenant_restrictive"            ON public."Recanto_Empresas";
DROP POLICY IF EXISTS "assinaturas_tenant_restrictive"         ON public."Recanto_Assinaturas";
DROP POLICY IF EXISTS "logs_empresa_tenant_restrictive"        ON public."Recanto_Logs_Empresa";
DROP POLICY IF EXISTS "residentes_tenant_restrictive"          ON public."Recanto_Residentes";
DROP POLICY IF EXISTS "funcionarios_tenant_restrictive"        ON public."Recanto_Funcionarios";
DROP POLICY IF EXISTS "estoque_tenant_restrictive"             ON public."Recanto_Estoque";
DROP POLICY IF EXISTS "registros_financeiros_tenant_restrictive" ON public."Recanto_RegistrosFinanceiros";
DROP POLICY IF EXISTS "eventos_tenant_restrictive"             ON public."Recanto_Eventos";
DROP POLICY IF EXISTS "treinamentos_tenant_restrictive"        ON public."Recanto_Treinamentos";
DROP POLICY IF EXISTS "logs_acesso_tenant_restrictive"         ON public."Recanto_LogsAcesso";
DROP POLICY IF EXISTS "quartos_tenant_restrictive"             ON public."Recanto_Quartos";
DROP POLICY IF EXISTS "perfis_tenant_restrictive"              ON public."Recanto_Perfis";
DROP POLICY IF EXISTS "usuarios_tenant_restrictive"            ON public."Recanto_Usuarios";

-- Recanto_Empresas
CREATE POLICY "empresas_tenant_restrictive" ON public."Recanto_Empresas"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Assinaturas
CREATE POLICY "assinaturas_tenant_restrictive" ON public."Recanto_Assinaturas"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Logs_Empresa
CREATE POLICY "logs_empresa_tenant_restrictive" ON public."Recanto_Logs_Empresa"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Residentes
CREATE POLICY "residentes_tenant_restrictive" ON public."Recanto_Residentes"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Funcionarios
CREATE POLICY "funcionarios_tenant_restrictive" ON public."Recanto_Funcionarios"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Estoque
CREATE POLICY "estoque_tenant_restrictive" ON public."Recanto_Estoque"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_RegistrosFinanceiros
CREATE POLICY "registros_financeiros_tenant_restrictive" ON public."Recanto_RegistrosFinanceiros"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Eventos
CREATE POLICY "eventos_tenant_restrictive" ON public."Recanto_Eventos"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Treinamentos
CREATE POLICY "treinamentos_tenant_restrictive" ON public."Recanto_Treinamentos"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_LogsAcesso
CREATE POLICY "logs_acesso_tenant_restrictive" ON public."Recanto_LogsAcesso"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Quartos
CREATE POLICY "quartos_tenant_restrictive" ON public."Recanto_Quartos"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Recanto_Perfis: mantém permissão para perfis globais (empresa_id IS NULL = sistema)
CREATE POLICY "perfis_tenant_restrictive" ON public."Recanto_Perfis"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id() OR empresa_id IS NULL)
  WITH CHECK (empresa_id = public.recanto_get_empresa_id() OR empresa_id IS NULL);

-- Recanto_Usuarios: usuário sempre pode ler/gravar sua própria linha (bootstrap login)
CREATE POLICY "usuarios_tenant_restrictive" ON public."Recanto_Usuarios"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING  (empresa_id = public.recanto_get_empresa_id() OR auth_user_id = auth.uid())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id() OR auth_user_id = auth.uid());

-- ─── 2. REMOVER INSERT LIVRE PARA anon ───────────────────────────────────────
-- As tabelas de empresa/assinatura/logs não devem aceitar INSERT de anon.
-- O checkout usa authenticated (usuário já logado após signUp).

DROP POLICY IF EXISTS "empresa_insert_service"    ON public."Recanto_Empresas";
DROP POLICY IF EXISTS "assinatura_insert_service" ON public."Recanto_Assinaturas";
DROP POLICY IF EXISTS "logs_insert_service"        ON public."Recanto_Logs_Empresa";

-- Permite INSERT apenas para usuários autenticados (o signUp do checkout autentica antes)
CREATE POLICY "empresa_insert_authenticated" ON public."Recanto_Empresas"
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "assinatura_insert_authenticated" ON public."Recanto_Assinaturas"
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "logs_insert_authenticated" ON public."Recanto_Logs_Empresa"
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- ─── 3. GARANTIR QUE recanto_get_empresa_id NUNCA RETORNE NULL PARA USUÁRIOS
--        COM empresa_id GRAVADO EM auth.users MAS SEM JWT ATUALIZADO ────────────
-- A função já tenta JWT → auth.users; isso é suficiente.
-- Garantia adicional: se a função retornar NULL para um usuário autenticado,
-- as políticas restritivas acima bloqueiam o acesso (fail-closed).

-- ─── 4. UPDATE: sincroniza empresa_id de auth.users → Recanto_Usuarios ────────
-- Corrige usuários que ainda têm empresa_id NULL na tabela pública.
UPDATE public."Recanto_Usuarios" u
SET empresa_id = (
  SELECT (raw_user_meta_data ->> 'empresa_id')::text
  FROM auth.users au
  WHERE au.id = u.auth_user_id
)
WHERE u.empresa_id IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users au2
    WHERE au2.id = u.auth_user_id
      AND au2.raw_user_meta_data ->> 'empresa_id' IS NOT NULL
  );
