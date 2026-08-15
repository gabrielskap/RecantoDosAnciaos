-- ===========================================================================
-- Glicemia: compatibilidade de schema e isolamento por empresa
-- ===========================================================================

-- A coluna já possui migration própria, mas este IF NOT EXISTS protege bancos
-- que tenham recebido a tela antes de todas as migrations anteriores.
ALTER TABLE public."Recanto_Glicemia"
  ADD COLUMN IF NOT EXISTS tipo_insulina TEXT;

-- Explicita a condição de INSERT/UPDATE. A policy original usava somente
-- USING; WITH CHECK impede que uma escrita aproveite um resident de outra
-- empresa mesmo se o id for conhecido.
DROP POLICY IF EXISTS "glicemia_write" ON public."Recanto_Glicemia";
CREATE POLICY "glicemia_write" ON public."Recanto_Glicemia"
  FOR ALL TO authenticated
  USING (public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador'))
  WITH CHECK (public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador'));

-- Recanto_Glicemia foi criada depois da migration geral de isolamento; sem
-- esta policy restrictive, a tabela não recebe a garantia de tenant das demais
-- relações clínicas ligadas ao residente.
DROP POLICY IF EXISTS "glicemia_tenant_restrictive" ON public."Recanto_Glicemia";
CREATE POLICY "glicemia_tenant_restrictive" ON public."Recanto_Glicemia"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.recanto_get_empresa_id() IS NULL
    OR EXISTS (
      SELECT 1
      FROM public."Recanto_Residentes" residente
      WHERE residente.id = resident_id
        AND residente.empresa_id = public.recanto_get_empresa_id()
    )
  )
  WITH CHECK (
    public.recanto_get_empresa_id() IS NULL
    OR EXISTS (
      SELECT 1
      FROM public."Recanto_Residentes" residente
      WHERE residente.id = resident_id
        AND residente.empresa_id = public.recanto_get_empresa_id()
    )
  );
