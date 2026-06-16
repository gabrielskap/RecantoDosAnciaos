-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adicionar Coluna de Assinatura ao Usuário e RLS
-- Data: 2026-06-16
-- Descrição: Adiciona a coluna 'signature_image' à tabela 'Recanto_Usuarios'
--            e cria a política de RLS para permitir que os próprios usuários
--            atualizem suas assinaturas.
-- ==========================================================================

-- 1. Adiciona a coluna signature_image se ela não existir
ALTER TABLE public."Recanto_Usuarios" 
  ADD COLUMN IF NOT EXISTS signature_image TEXT;

-- 2. Cria a política de RLS para permitir que os usuários editem seu próprio perfil (incluindo assinatura)
--    Garante que eles não possam mudar seu profile_id para evitar escalada de privilégios.
DROP POLICY IF EXISTS "usuarios_self_update" ON public."Recanto_Usuarios";
CREATE POLICY "usuarios_self_update" ON public."Recanto_Usuarios" 
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid() 
    AND (
      profile_id IS NOT DISTINCT FROM (
        SELECT profile_id FROM public."Recanto_Usuarios" WHERE auth_user_id = auth.uid()
      )
    )
  );
