-- Um plano geral gera uma linha completa para cada residente. group_id permite
-- reagrupar essas linhas na listagem geral sem alterar o consumo individual do
-- prontuário, do boletim diário ou do acompanhamento do plano.

ALTER TABLE public."Recanto_PlanosAssistencia"
  ADD COLUMN IF NOT EXISTS group_id UUID;

UPDATE public."Recanto_PlanosAssistencia"
SET group_id = id
WHERE group_id IS NULL;

ALTER TABLE public."Recanto_PlanosAssistencia"
  ALTER COLUMN group_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recanto_planos_assistencia_group_id
  ON public."Recanto_PlanosAssistencia" (group_id);

CREATE INDEX IF NOT EXISTS idx_recanto_planos_assistencia_criacao
  ON public."Recanto_PlanosAssistencia" (created_at DESC);
