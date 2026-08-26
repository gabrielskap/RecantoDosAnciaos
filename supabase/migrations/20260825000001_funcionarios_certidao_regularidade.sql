-- Certidão de Regularidade dos profissionais da equipe multidisciplinar:
-- número de registro no conselho (já existente) passa a exigir, no
-- aplicativo, o anexo da certidão vigente (validade de 1 ano) para os
-- cargos com conselho profissional (Médico, Enfermeiro, Nutricionista,
-- Fisioterapeuta). Esta migration adiciona as colunas de suporte e o
-- bucket privado onde o arquivo da certidão é armazenado, isolado por
-- empresa, no mesmo padrão de "contract-documents".

ALTER TABLE "Recanto_Funcionarios"
  ADD COLUMN IF NOT EXISTS registration_certificate_valid_until DATE,
  ADD COLUMN IF NOT EXISTS registration_certificate_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS registration_certificate_file_name TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Docs Funcionarios - leitura por empresa" ON storage.objects;
CREATE POLICY "Docs Funcionarios - leitura por empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Funcionarios" funcionario
    WHERE funcionario.id::text = (storage.foldername(name))[1]
      AND funcionario.empresa_id = public.recanto_get_empresa_id()
  )
);

DROP POLICY IF EXISTS "Docs Funcionarios - insercao por empresa" ON storage.objects;
CREATE POLICY "Docs Funcionarios - insercao por empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Funcionarios" funcionario
    WHERE funcionario.id::text = (storage.foldername(name))[1]
      AND funcionario.empresa_id = public.recanto_get_empresa_id()
  )
);

DROP POLICY IF EXISTS "Docs Funcionarios - atualizacao por empresa" ON storage.objects;
CREATE POLICY "Docs Funcionarios - atualizacao por empresa"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Funcionarios" funcionario
    WHERE funcionario.id::text = (storage.foldername(name))[1]
      AND funcionario.empresa_id = public.recanto_get_empresa_id()
  )
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Funcionarios" funcionario
    WHERE funcionario.id::text = (storage.foldername(name))[1]
      AND funcionario.empresa_id = public.recanto_get_empresa_id()
  )
);

DROP POLICY IF EXISTS "Docs Funcionarios - exclusao por empresa" ON storage.objects;
CREATE POLICY "Docs Funcionarios - exclusao por empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1
    FROM public."Recanto_Funcionarios" funcionario
    WHERE funcionario.id::text = (storage.foldername(name))[1]
      AND funcionario.empresa_id = public.recanto_get_empresa_id()
  )
);
