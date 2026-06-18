-- Permite que usuários autenticados atualizem a assinatura da sua própria empresa.
-- Sem esta política, UPDATE em Recanto_Assinaturas falha silenciosamente pois só existia
-- SELECT e INSERT como políticas permissivas — UPDATE não era coberto.
CREATE POLICY "assinatura_update_own" ON public."Recanto_Assinaturas"
  FOR UPDATE TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());
