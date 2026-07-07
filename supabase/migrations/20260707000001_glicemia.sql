-- ==========================================================================
-- MÓDULO: SAÚDE — GLICEMIA (CONTROLE DE GLICOSE)
-- ==========================================================================

CREATE TYPE recanto_momento_glicemia AS ENUM ('jejum','pre_prandial','pos_prandial','madrugada','outro');

CREATE TABLE "Recanto_Glicemia" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id       UUID NOT NULL REFERENCES "Recanto_Residentes"(id) ON DELETE CASCADE,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valor_mg_dl       INTEGER NOT NULL CHECK (valor_mg_dl BETWEEN 20 AND 700),
  momento           recanto_momento_glicemia NOT NULL DEFAULT 'outro',
  insulina_aplicada BOOLEAN NOT NULL DEFAULT false,
  insulina_unidades NUMERIC(5,1),
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_glicemia_resident_ts ON "Recanto_Glicemia"(resident_id, timestamp DESC);

ALTER TABLE "Recanto_Glicemia" ENABLE ROW LEVEL SECURITY;

-- Glicemia
CREATE POLICY "glicemia_select" ON "Recanto_Glicemia" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND resident_id = recanto_get_resident_id())
  );
CREATE POLICY "glicemia_write" ON "Recanto_Glicemia" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));
