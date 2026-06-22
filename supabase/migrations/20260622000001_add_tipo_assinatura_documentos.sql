-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adicionar tipo de assinatura de documentos
-- Data: 2026-06-22
-- Descrição: Adiciona coluna tipo_assinatura_documentos à tabela Recanto_Empresas
--            para que cada instituição configure o modelo de assinatura utilizado
--            em documentos que exigem assinatura eletrônica.
--
--            Valores permitidos:
--              'simples'        — Assinatura eletrônica interna: registra nome
--                                 completo, CPF e data/hora do usuário autenticado.
--              'certificado_a1' — Exige certificado digital ICP-Brasil Tipo A1
--                                 (.pfx/.p12) previamente cadastrado para o assinante.
--
--            Padrão: 'simples'
--
--            NOTA: O fluxo real de assinatura dos documentos será implementado
--            em etapa posterior. Esta migration apenas persiste a preferência
--            institucional que controlará qual fluxo será exibido.
-- ==========================================================================

-- 1. Adicionar coluna com constraint de valores válidos
ALTER TABLE public."Recanto_Empresas"
  ADD COLUMN IF NOT EXISTS tipo_assinatura_documentos text
    NOT NULL DEFAULT 'simples'
    CONSTRAINT chk_tipo_assinatura_documentos
      CHECK (tipo_assinatura_documentos IN ('simples', 'certificado_a1'));

-- 2. Substituir a policy de update permissiva por uma que exige perfil Administrador
--    A função recanto_get_profile_type() já existe (criada em schema_completo.sql)
--    e retorna o tipo de perfil do usuário autenticado atual.
DROP POLICY IF EXISTS "empresa_update_own" ON public."Recanto_Empresas";

CREATE POLICY "empresa_update_admin_only" ON public."Recanto_Empresas"
  FOR UPDATE TO authenticated
  USING (
    empresa_id = public.recanto_get_empresa_id()
    AND public.recanto_get_profile_type() = 'Administrador'
  )
  WITH CHECK (
    empresa_id = public.recanto_get_empresa_id()
    AND public.recanto_get_profile_type() = 'Administrador'
  );
