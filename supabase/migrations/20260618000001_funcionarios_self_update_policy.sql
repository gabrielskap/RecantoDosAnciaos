-- Descrição: Permite que os usuários atualizem seus próprios registros de funcionário.
DROP POLICY IF EXISTS "funcionarios_self_update" ON public."Recanto_Funcionarios";
CREATE POLICY "funcionarios_self_update" ON public."Recanto_Funcionarios"
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
