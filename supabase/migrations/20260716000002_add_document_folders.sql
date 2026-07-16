-- ==========================================================================
-- Pastas para Documentos Digitalizados do Residente
-- --------------------------------------------------------------------------
-- Permite organizar os documentos de cada residente em pastas nomeadas.
-- - Nova tabela "Recanto_DocumentosPastas" (uma pasta pertence a um residente).
-- - Nova coluna "Recanto_Documentos".folder_id (nullable). Documentos sem
--   pasta ficam em "Sem pasta". Excluir a pasta zera o vínculo (SET NULL),
--   sem apagar o documento.
-- ==========================================================================

-- ─── 1. Tabela de pastas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Recanto_DocumentosPastas" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Vínculo do documento com a pasta ───────────────────────────────────
ALTER TABLE "Recanto_Documentos"
  ADD COLUMN IF NOT EXISTS folder_id UUID
  REFERENCES "Recanto_DocumentosPastas"(id) ON DELETE SET NULL;

-- ─── 3. Índices ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pastas_resident   ON public."Recanto_DocumentosPastas"(resident_id);
CREATE INDEX IF NOT EXISTS idx_documentos_folder ON public."Recanto_Documentos"(folder_id);

-- ─── 4. Row Level Security ─────────────────────────────────────────────────
ALTER TABLE "Recanto_DocumentosPastas" ENABLE ROW LEVEL SECURITY;

-- Espelha as políticas de "Recanto_Documentos"
DROP POLICY IF EXISTS "pastas_select" ON "Recanto_DocumentosPastas";
CREATE POLICY "pastas_select" ON "Recanto_DocumentosPastas" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );

DROP POLICY IF EXISTS "pastas_write" ON "Recanto_DocumentosPastas";
CREATE POLICY "pastas_write" ON "Recanto_DocumentosPastas" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'));

-- Política RESTRICTIVE de isolamento por empresa (mesmo padrão da multitenancy)
DROP POLICY IF EXISTS "pastas_tenant_restrictive" ON public."Recanto_DocumentosPastas";
CREATE POLICY "pastas_tenant_restrictive" ON public."Recanto_DocumentosPastas"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.recanto_get_empresa_id() IS NULL OR EXISTS (
    SELECT 1 FROM public."Recanto_Residentes" r
    WHERE r.id = resident_id
      AND r.empresa_id = public.recanto_get_empresa_id()
  ));
