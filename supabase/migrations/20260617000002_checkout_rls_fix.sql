-- Allow a newly signed-up user to bootstrap their profile/permissions/usuario
-- row during checkout. Once a Recanto_Usuarios row exists the normal
-- "perfis_admin" / "usuarios_admin" policies take over.

-- Recanto_Perfis: new authenticated user may insert while they have no usuario row
CREATE POLICY "perfis_insert_checkout" ON public."Recanto_Perfis"
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public."Recanto_Usuarios"
      WHERE auth_user_id = auth.uid()
    )
  );

-- Recanto_Permissoes: same gate
CREATE POLICY "permissoes_insert_checkout" ON public."Recanto_Permissoes"
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public."Recanto_Usuarios"
      WHERE auth_user_id = auth.uid()
    )
  );

-- Recanto_Usuarios: user may insert exactly their own row
CREATE POLICY "usuarios_insert_self" ON public."Recanto_Usuarios"
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());
