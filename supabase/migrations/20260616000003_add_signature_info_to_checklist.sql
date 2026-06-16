-- RECANTO DOS ANCIÃOS — Adicionar Coluna de Detalhes da Assinatura ao Boletim
ALTER TABLE public."Recanto_ChecklistDiario"
  ADD COLUMN IF NOT EXISTS signature_info TEXT;
