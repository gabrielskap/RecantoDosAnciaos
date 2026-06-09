-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Histórico de Visitas
-- Data: 2026-06-08
-- Descrição: Criação da tabela de visitas dos residentes, RLS e políticas de acesso.
-- ==========================================================================

CREATE TABLE public."Recanto_Visitas" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   UUID NOT NULL REFERENCES public."Recanto_Residentes"(id) ON DELETE CASCADE,
  visitor_name  TEXT NOT NULL,
  relation      TEXT NOT NULL,
  cpf           TEXT,
  phone         TEXT,
  date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  temperature   NUMERIC(4,1),
  observations  TEXT,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para atualizar data de modificação automaticamente
CREATE TRIGGER trg_visitas_updated_at
  BEFORE UPDATE ON public."Recanto_Visitas"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public."Recanto_Visitas" ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "visitas_select" ON public."Recanto_Visitas" FOR SELECT
  USING (
    public.recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (public.recanto_get_profile_type() = 'Responsável' AND resident_id = public.recanto_get_resident_id())
  );

CREATE POLICY "visitas_write" ON public."Recanto_Visitas" FOR ALL
  USING (public.recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

-- Criar índice para performance
CREATE INDEX idx_visitas_resident_date ON public."Recanto_Visitas"(resident_id, date DESC);
