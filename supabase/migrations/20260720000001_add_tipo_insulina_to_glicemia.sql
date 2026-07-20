-- Adiciona campo tipo_insulina à tabela Recanto_Glicemia
ALTER TABLE "Recanto_Glicemia" ADD COLUMN IF NOT EXISTS tipo_insulina TEXT;
