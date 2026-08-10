-- Corrige o RLS do bucket de contratos.
-- A verificacao direta de Recanto_Residentes dentro da policy de storage
-- tambem acionava o RLS da tabela e podia negar usuarios validos.

CREATE OR REPLACE FUNCTION public.recanto_can_access_resident_storage(p_resident_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Recanto_Residentes" residente
    WHERE residente.id::text = p_resident_id
      AND residente.empresa_id = public.recanto_get_empresa_id()
  );
$$;

REVOKE ALL ON FUNCTION public.recanto_can_access_resident_storage(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recanto_can_access_resident_storage(text) TO authenticated;

DROP POLICY IF EXISTS "Contratos - leitura por empresa" ON storage.objects;
CREATE POLICY "Contratos - leitura por empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND public.recanto_can_access_resident_storage((storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Contratos - insercao por empresa" ON storage.objects;
CREATE POLICY "Contratos - insercao por empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contract-documents'
  AND public.recanto_can_access_resident_storage((storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Contratos - atualizacao por empresa" ON storage.objects;
CREATE POLICY "Contratos - atualizacao por empresa"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND public.recanto_can_access_resident_storage((storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'contract-documents'
  AND public.recanto_can_access_resident_storage((storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Contratos - exclusao por empresa" ON storage.objects;
CREATE POLICY "Contratos - exclusao por empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND public.recanto_can_access_resident_storage((storage.foldername(name))[1])
);
