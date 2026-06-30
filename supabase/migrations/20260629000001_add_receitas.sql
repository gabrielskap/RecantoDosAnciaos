-- Módulo de Receitas Médicas do Residente
CREATE TABLE IF NOT EXISTS "Recanto_Receitas" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receitas_resident ON "Recanto_Receitas"(resident_id);

ALTER TABLE "Recanto_Receitas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receitas_select" ON "Recanto_Receitas" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "Recanto_Residentes" r
    WHERE r.id = resident_id
      AND r.empresa_id = (
        SELECT empresa_id FROM "Recanto_Usuarios"
        WHERE auth_user_id = auth.uid() LIMIT 1
      )
  ));

CREATE POLICY "receitas_insert" ON "Recanto_Receitas" FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Recanto_Residentes" r
    WHERE r.id = resident_id
      AND r.empresa_id = (
        SELECT empresa_id FROM "Recanto_Usuarios"
        WHERE auth_user_id = auth.uid() LIMIT 1
      )
  ));

CREATE POLICY "receitas_delete" ON "Recanto_Receitas" FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM "Recanto_Residentes" r
    WHERE r.id = resident_id
      AND r.empresa_id = (
        SELECT empresa_id FROM "Recanto_Usuarios"
        WHERE auth_user_id = auth.uid() LIMIT 1
      )
  ));
