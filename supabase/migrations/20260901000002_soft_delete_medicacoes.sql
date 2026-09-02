-- ============================================================================
-- RECANTO DOS ANCIÃOS — Exclusão lógica de prescrições de medicamentos
--
-- recanto_status_medicacao pertence aos registros de administração
-- (administrado/recusado/atrasado). A prescrição precisa de um ciclo de vida
-- independente (ativo/inativo), para que a exclusão preserve seu histórico.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'recanto_status_prescricao_medicacao'
  ) THEN
    CREATE TYPE public.recanto_status_prescricao_medicacao AS ENUM ('ativo', 'inativo');
  END IF;
END
$$;

DO $$
DECLARE
  v_status_type TEXT;
BEGIN
  SELECT c.udt_name
    INTO v_status_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'Recanto_Medicacoes'
    AND c.column_name = 'status';

  IF v_status_type IS NULL THEN
    ALTER TABLE public."Recanto_Medicacoes"
      ADD COLUMN status public.recanto_status_prescricao_medicacao
      NOT NULL DEFAULT 'ativo';
  ELSIF v_status_type <> 'recanto_status_prescricao_medicacao' THEN
    -- Reconcilia bancos em que a coluna foi criada acidentalmente com o enum
    -- dos logs de administração. Qualquer valor antigo diferente de inativo
    -- representa uma prescrição vigente.
    ALTER TABLE public."Recanto_Medicacoes"
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public."Recanto_Medicacoes"
      ALTER COLUMN status TYPE public.recanto_status_prescricao_medicacao
      USING (
        CASE
          WHEN status::text = 'inativo' THEN 'inativo'
          ELSE 'ativo'
        END
      )::public.recanto_status_prescricao_medicacao;

    ALTER TABLE public."Recanto_Medicacoes"
      ALTER COLUMN status SET DEFAULT 'ativo',
      ALTER COLUMN status SET NOT NULL;
  ELSE
    UPDATE public."Recanto_Medicacoes" SET status = 'ativo' WHERE status IS NULL;
    ALTER TABLE public."Recanto_Medicacoes"
      ALTER COLUMN status SET DEFAULT 'ativo',
      ALTER COLUMN status SET NOT NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_medicacoes_resident_status
  ON public."Recanto_Medicacoes" (resident_id, status);
