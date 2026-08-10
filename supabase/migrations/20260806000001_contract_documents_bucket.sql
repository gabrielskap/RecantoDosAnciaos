-- Contratos de residentes: armazenamento privado com isolamento por empresa.
-- O primeiro segmento do caminho do objeto deve ser o UUID do residente.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Contratos - leitura por empresa" ON storage.objects;
CREATE POLICY "Contratos - leitura por empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Residentes" residente
    WHERE residente.id::text = (storage.foldername(name))[1]
      AND residente.empresa_id = public.recanto_get_empresa_id()
  )
);

DROP POLICY IF EXISTS "Contratos - insercao por empresa" ON storage.objects;
CREATE POLICY "Contratos - insercao por empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Residentes" residente
    WHERE residente.id::text = (storage.foldername(name))[1]
      AND residente.empresa_id = public.recanto_get_empresa_id()
  )
);

DROP POLICY IF EXISTS "Contratos - atualizacao por empresa" ON storage.objects;
CREATE POLICY "Contratos - atualizacao por empresa"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Residentes" residente
    WHERE residente.id::text = (storage.foldername(name))[1]
      AND residente.empresa_id = public.recanto_get_empresa_id()
  )
)
WITH CHECK (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Residentes" residente
    WHERE residente.id::text = (storage.foldername(name))[1]
      AND residente.empresa_id = public.recanto_get_empresa_id()
  )
);

DROP POLICY IF EXISTS "Contratos - exclusao por empresa" ON storage.objects;
CREATE POLICY "Contratos - exclusao por empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Residentes" residente
    WHERE residente.id::text = (storage.foldername(name))[1]
      AND residente.empresa_id = public.recanto_get_empresa_id()
  )
);
