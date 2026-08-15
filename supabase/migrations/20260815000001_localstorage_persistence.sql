-- ===========================================================================
-- RECANTO DOS ANCIÃOS — Persistência dos dados antes mantidos no navegador
-- Data: 2026-08-15
--
-- Cria armazenamento multiempresa para documentos institucionais de
-- conformidade, preferências individuais e rascunhos de boletim clínico.
-- O bucket de conformidade é privado: todo objeto deve iniciar pelo
-- empresa_id, por exemplo: <empresa_id>/<arquivo>.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Metadados dos documentos institucionais de conformidade
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."Recanto_DocumentosConformidade" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    TEXT NOT NULL
                  REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE
                  DEFAULT public.recanto_get_empresa_id(),
  tipo          TEXT NOT NULL CHECK (tipo IN ('licenca', 'ilpi')),
  caminho_arquivo TEXT NOT NULL,
  nome_arquivo  TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  validade      DATE,
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Novos registros guardam o caminho interno no prefixo da empresa, o mesmo
  -- formato exigido pelas policies do Storage. URLs HTTP/data já existentes
  -- são aceitas apenas para a migração única do navegador para o banco.
  CONSTRAINT documentos_conformidade_caminho_tenant_check CHECK (
    caminho_arquivo ~* '^(https?:|data:)'
    OR (
      caminho_arquivo <> ''
      AND POSITION('/' IN caminho_arquivo) > 1
      AND SPLIT_PART(caminho_arquivo, '/', 1) = empresa_id
    )
  ),
  CONSTRAINT documentos_conformidade_nome_arquivo_check CHECK (
    NULLIF(BTRIM(nome_arquivo), '') IS NOT NULL
  ),
  CONSTRAINT documentos_conformidade_empresa_tipo_key UNIQUE (empresa_id, tipo)
);

DROP TRIGGER IF EXISTS trg_documentos_conformidade_updated_at
  ON public."Recanto_DocumentosConformidade";
CREATE TRIGGER trg_documentos_conformidade_updated_at
  BEFORE UPDATE ON public."Recanto_DocumentosConformidade"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Preferências privadas do usuário autenticado
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."Recanto_PreferenciasUsuario" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    TEXT NOT NULL
                  REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE
                  DEFAULT public.recanto_get_empresa_id(),
  auth_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
                  DEFAULT auth.uid(),
  preferencias  JSONB NOT NULL DEFAULT '{}'::JSONB
                  CHECK (JSONB_TYPEOF(preferencias) = 'object'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT preferencias_usuario_empresa_auth_user_key UNIQUE (empresa_id, auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_preferencias_usuario_auth_user
  ON public."Recanto_PreferenciasUsuario"(auth_user_id);

DROP TRIGGER IF EXISTS trg_preferencias_usuario_updated_at
  ON public."Recanto_PreferenciasUsuario";
CREATE TRIGGER trg_preferencias_usuario_updated_at
  BEFORE UPDATE ON public."Recanto_PreferenciasUsuario"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Rascunhos privados de boletim clínico
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."Recanto_ChecklistRascunhos" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    TEXT NOT NULL
                  REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE
                  DEFAULT public.recanto_get_empresa_id(),
  resident_id   UUID NOT NULL
                  REFERENCES public."Recanto_Residentes"(id) ON DELETE CASCADE,
  auth_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
                  DEFAULT auth.uid(),
  data          DATE NOT NULL,
  turno         TEXT NOT NULL CHECK (turno IN ('diurno', 'noturno', 'diario')),
  dados         JSONB NOT NULL DEFAULT '{}'::JSONB
                  CHECK (JSONB_TYPEOF(dados) = 'object'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT checklist_rascunhos_empresa_resident_author_data_turno_key
    UNIQUE (empresa_id, resident_id, auth_user_id, data, turno)
);

CREATE INDEX IF NOT EXISTS idx_checklist_rascunhos_author_updated
  ON public."Recanto_ChecklistRascunhos"(auth_user_id, updated_at DESC);

-- A FK de resident_id sozinha não valida que o residente pertença à mesma
-- empresa. Esta trigger fecha esse atalho antes da RLS ser avaliada.
CREATE OR REPLACE FUNCTION public.recanto_validate_checklist_draft_resident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."Recanto_Residentes" residente
    WHERE residente.id = NEW.resident_id
      AND residente.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'O residente do rascunho deve pertencer à empresa informada'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checklist_rascunhos_validate_resident
  ON public."Recanto_ChecklistRascunhos";
CREATE TRIGGER trg_checklist_rascunhos_validate_resident
  BEFORE INSERT OR UPDATE OF empresa_id, resident_id
  ON public."Recanto_ChecklistRascunhos"
  FOR EACH ROW EXECUTE FUNCTION public.recanto_validate_checklist_draft_resident();

DROP TRIGGER IF EXISTS trg_checklist_rascunhos_updated_at
  ON public."Recanto_ChecklistRascunhos";
CREATE TRIGGER trg_checklist_rascunhos_updated_at
  BEFORE UPDATE ON public."Recanto_ChecklistRascunhos"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    Políticas permissivas tratam o papel/dono; a política RESTRICTIVE de
--    empresa sempre combina em AND e impede cruzamento entre tenants.
-- ---------------------------------------------------------------------------

ALTER TABLE public."Recanto_DocumentosConformidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_PreferenciasUsuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_ChecklistRascunhos" ENABLE ROW LEVEL SECURITY;

-- Documentos de conformidade: equipe interna pode consultar; somente o
-- Administrador da própria empresa pode criar, alterar ou remover metadados.
DROP POLICY IF EXISTS "documentos_conformidade_team_select"
  ON public."Recanto_DocumentosConformidade";
CREATE POLICY "documentos_conformidade_team_select"
  ON public."Recanto_DocumentosConformidade" FOR SELECT TO authenticated
  USING (public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador'));

DROP POLICY IF EXISTS "documentos_conformidade_admin_insert"
  ON public."Recanto_DocumentosConformidade";
CREATE POLICY "documentos_conformidade_admin_insert"
  ON public."Recanto_DocumentosConformidade" FOR INSERT TO authenticated
  WITH CHECK (public.recanto_get_profile_type() = 'Administrador');

DROP POLICY IF EXISTS "documentos_conformidade_admin_update"
  ON public."Recanto_DocumentosConformidade";
CREATE POLICY "documentos_conformidade_admin_update"
  ON public."Recanto_DocumentosConformidade" FOR UPDATE TO authenticated
  USING (public.recanto_get_profile_type() = 'Administrador')
  WITH CHECK (public.recanto_get_profile_type() = 'Administrador');

DROP POLICY IF EXISTS "documentos_conformidade_admin_delete"
  ON public."Recanto_DocumentosConformidade";
CREATE POLICY "documentos_conformidade_admin_delete"
  ON public."Recanto_DocumentosConformidade" FOR DELETE TO authenticated
  USING (public.recanto_get_profile_type() = 'Administrador');

DROP POLICY IF EXISTS "documentos_conformidade_tenant_restrictive"
  ON public."Recanto_DocumentosConformidade";
CREATE POLICY "documentos_conformidade_tenant_restrictive"
  ON public."Recanto_DocumentosConformidade"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Preferências são estritamente do próprio usuário, inclusive para contas
-- administradoras. O tenant restrictive evita reutilizar um UUID em outra
-- empresa caso a associação do usuário mude no futuro.
DROP POLICY IF EXISTS "preferencias_usuario_owner"
  ON public."Recanto_PreferenciasUsuario";
CREATE POLICY "preferencias_usuario_owner"
  ON public."Recanto_PreferenciasUsuario" FOR ALL TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "preferencias_usuario_tenant_restrictive"
  ON public."Recanto_PreferenciasUsuario";
CREATE POLICY "preferencias_usuario_tenant_restrictive"
  ON public."Recanto_PreferenciasUsuario"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- Rascunhos clínicos são acessíveis apenas ao profissional que os criou.
-- Responsáveis não acessam rascunhos; o registro final continua seguindo a
-- política já existente de Recanto_ChecklistDiario.
DROP POLICY IF EXISTS "checklist_rascunhos_clinical_owner"
  ON public."Recanto_ChecklistRascunhos";
CREATE POLICY "checklist_rascunhos_clinical_owner"
  ON public."Recanto_ChecklistRascunhos" FOR ALL TO authenticated
  USING (
    auth_user_id = auth.uid()
    AND public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador')
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    AND public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador')
  );

DROP POLICY IF EXISTS "checklist_rascunhos_tenant_restrictive"
  ON public."Recanto_ChecklistRascunhos";
CREATE POLICY "checklist_rascunhos_tenant_restrictive"
  ON public."Recanto_ChecklistRascunhos"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

-- ---------------------------------------------------------------------------
-- 5. Storage privado de documentos de conformidade
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- O primeiro segmento de storage.objects.name é sempre o empresa_id.
-- Leitura para a equipe interna; mutações somente para Administrador.
DROP POLICY IF EXISTS "compliance_storage_team_select" ON storage.objects;
CREATE POLICY "compliance_storage_team_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = public.recanto_get_empresa_id()
    AND public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador')
  );

DROP POLICY IF EXISTS "compliance_storage_admin_insert" ON storage.objects;
CREATE POLICY "compliance_storage_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = public.recanto_get_empresa_id()
    AND public.recanto_get_profile_type() = 'Administrador'
  );

DROP POLICY IF EXISTS "compliance_storage_admin_update" ON storage.objects;
CREATE POLICY "compliance_storage_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = public.recanto_get_empresa_id()
    AND public.recanto_get_profile_type() = 'Administrador'
  )
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = public.recanto_get_empresa_id()
    AND public.recanto_get_profile_type() = 'Administrador'
  );

DROP POLICY IF EXISTS "compliance_storage_admin_delete" ON storage.objects;
CREATE POLICY "compliance_storage_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = public.recanto_get_empresa_id()
    AND public.recanto_get_profile_type() = 'Administrador'
  );
