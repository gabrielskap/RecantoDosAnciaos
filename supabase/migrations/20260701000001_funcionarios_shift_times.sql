ALTER TABLE "Recanto_Funcionarios"
  ADD COLUMN IF NOT EXISTS shift_start TIME,
  ADD COLUMN IF NOT EXISTS shift_end   TIME;
