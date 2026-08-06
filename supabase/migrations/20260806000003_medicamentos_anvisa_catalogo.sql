-- Catálogo global de medicamentos importados dos dados abertos da ANVISA.
-- O nome sem aspas é intencional: PostgreSQL o normaliza para minúsculas.
CREATE TABLE IF NOT EXISTS public.recanto_medicamentos_anvisa (
  id BIGSERIAL PRIMARY KEY,
  nome_produto             VARCHAR(255) NOT NULL,
  complemento_marca        VARCHAR(255),
  principio_ativo          TEXT NOT NULL,
  tipo_regularizacao       VARCHAR(30) NOT NULL,
  numero_regularizacao     BIGINT,
  numero_processo          VARCHAR(30),
  empresa_detentora        TEXT NOT NULL,
  situacao_regularizacao   VARCHAR(30) NOT NULL,
  vencimento_regularizacao DATE,
  data_importacao          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_medicamentos_anvisa_nome_trgm
  ON public.recanto_medicamentos_anvisa
  USING gin (nome_produto gin_trgm_ops);

ALTER TABLE public.recanto_medicamentos_anvisa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicamentos_anvisa_select" ON public.recanto_medicamentos_anvisa;
CREATE POLICY "medicamentos_anvisa_select"
  ON public.recanto_medicamentos_anvisa
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.recanto_medicamentos_anvisa TO authenticated;
