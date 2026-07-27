-- Migration: 20260727000003_controle_temperatura_frigobar.sql
-- Tabela para Controle de Temperatura de Frigobares / Refrigeradores da ILPI (OMS - Medições 12h em 12h)

CREATE TABLE IF NOT EXISTS public."Recanto_ControleTemperaturaFrigobar" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id TEXT,
  equipamento_nome VARCHAR(255) NOT NULL DEFAULT 'Frigobar Enfermagem Principal',
  localizacao VARCHAR(255) DEFAULT 'Posto de Enfermagem',
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  turno VARCHAR(20) NOT NULL CHECK (turno IN ('diurno', 'noturno')),
  temperatura_atual NUMERIC(4,1) NOT NULL,
  temperatura_minima NUMERIC(4,1),
  temperatura_maxima NUMERIC(4,1),
  status VARCHAR(20) NOT NULL CHECK (status IN ('conforme', 'alerta_frio', 'alerta_quente')),
  responsavel_nome VARCHAR(255) NOT NULL,
  usuario_id UUID,
  observacoes TEXT,
  acao_corretiva TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar chave estrangeira opcional para Recanto_Empresas se a tabela existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'Recanto_Empresas'
  ) THEN
    ALTER TABLE public."Recanto_ControleTemperaturaFrigobar"
      DROP CONSTRAINT IF EXISTS fk_frigobar_empresa;
    ALTER TABLE public."Recanto_ControleTemperaturaFrigobar"
      ADD CONSTRAINT fk_frigobar_empresa 
      FOREIGN KEY (empresa_id) REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public."Recanto_ControleTemperaturaFrigobar" ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "frigobar_select" ON public."Recanto_ControleTemperaturaFrigobar";
DROP POLICY IF EXISTS "frigobar_insert" ON public."Recanto_ControleTemperaturaFrigobar";
DROP POLICY IF EXISTS "frigobar_update" ON public."Recanto_ControleTemperaturaFrigobar";
DROP POLICY IF EXISTS "frigobar_delete" ON public."Recanto_ControleTemperaturaFrigobar";
DROP POLICY IF EXISTS "Permitir leitura para usuarios da mesma empresa" ON public."Recanto_ControleTemperaturaFrigobar";
DROP POLICY IF EXISTS "Permitir insercao para usuarios da mesma empresa" ON public."Recanto_ControleTemperaturaFrigobar";
DROP POLICY IF EXISTS "Permitir edicao para usuarios da mesma empresa" ON public."Recanto_ControleTemperaturaFrigobar";
DROP POLICY IF EXISTS "Permitir exclusao para usuarios da mesma empresa" ON public."Recanto_ControleTemperaturaFrigobar";

-- Políticas RLS para usuários autenticados
CREATE POLICY "frigobar_select"
  ON public."Recanto_ControleTemperaturaFrigobar"
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "frigobar_insert"
  ON public."Recanto_ControleTemperaturaFrigobar"
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "frigobar_update"
  ON public."Recanto_ControleTemperaturaFrigobar"
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "frigobar_delete"
  ON public."Recanto_ControleTemperaturaFrigobar"
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
  );

-- Índice para consultas rápidas por empresa e data
CREATE INDEX IF NOT EXISTS idx_frigobar_empresa_data ON public."Recanto_ControleTemperaturaFrigobar"(empresa_id, data_hora DESC);
