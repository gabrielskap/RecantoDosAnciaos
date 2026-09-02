-- Permite identificar um único lançamento de evolução aplicado a vários
-- residentes. Cada residente continua tendo sua própria linha (e, portanto,
-- seu próprio histórico no prontuário), enquanto group_id reúne as linhas na
-- tela de Evolução Geral.

ALTER TABLE public."Recanto_Evolucoes"
  ADD COLUMN IF NOT EXISTS group_id UUID;

UPDATE public."Recanto_Evolucoes"
SET group_id = id
WHERE group_id IS NULL;

ALTER TABLE public."Recanto_Evolucoes"
  ALTER COLUMN group_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recanto_evolucoes_empresa_criacao
  ON public."Recanto_Evolucoes" (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recanto_evolucoes_group_id
  ON public."Recanto_Evolucoes" (group_id);
