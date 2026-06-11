-- Add digital signature fields to daily checklist
ALTER TABLE "Recanto_ChecklistDiario"
  ADD COLUMN IF NOT EXISTS signed_by  TEXT,
  ADD COLUMN IF NOT EXISTS signed_at  TIMESTAMPTZ;
