-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Adiciona empresa_id em Contratos e Mensalidades
-- Data: 2026-06-17
-- Descrição: As tabelas Recanto_Contratos e Recanto_Mensalidades ficaram sem
--            empresa_id na migração de multi-tenancy. Esta migration corrige isso.
-- ==========================================================================

ALTER TABLE public."Recanto_Contratos"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE;

ALTER TABLE public."Recanto_Mensalidades"
  ADD COLUMN IF NOT EXISTS empresa_id text REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE;

-- Popula empresa_id a partir do residente vinculado
UPDATE public."Recanto_Contratos" c
SET empresa_id = r.empresa_id
FROM public."Recanto_Residentes" r
WHERE c.resident_id = r.id
  AND c.empresa_id IS NULL;

UPDATE public."Recanto_Mensalidades" m
SET empresa_id = r.empresa_id
FROM public."Recanto_Residentes" r
WHERE m.resident_id = r.id
  AND m.empresa_id IS NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_contratos_empresa   ON public."Recanto_Contratos"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_empresa ON public."Recanto_Mensalidades"(empresa_id);

-- Atualiza RLS para usar empresa_id diretamente (mais eficiente que via join)
DROP POLICY IF EXISTS "contratos_tenant_restrictive" ON public."Recanto_Contratos";
CREATE POLICY "contratos_tenant_restrictive" ON public."Recanto_Contratos"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "mensalidades_tenant_restrictive" ON public."Recanto_Mensalidades";
CREATE POLICY "mensalidades_tenant_restrictive" ON public."Recanto_Mensalidades"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());
