-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Acompanhamento do Plano de Cuidados e Permissões RLS
-- Data: 2026-06-08
-- Descrição: Criação da tabela de acompanhamento de planos de cuidados, RLS
--            e ajuste da política de escrita nos Planos de Assistência.
-- ==========================================================================

-- 1. Criar a função auxiliar para retornar a role do funcionário autenticado
CREATE OR REPLACE FUNCTION public.recanto_get_employee_role()
RETURNS TEXT AS $$
  SELECT role::TEXT
  FROM public."Recanto_Funcionarios"
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Atualizar as políticas de escrita na tabela de Planos de Assistência
-- Permitir escrita para Administrador, perfil Médico ou funcionários com cargo de Médico, Nutricionista ou Fisioterapeuta.
DROP POLICY IF EXISTS "planos_assist_write" ON public."Recanto_PlanosAssistencia";

CREATE POLICY "planos_assist_write" ON public."Recanto_PlanosAssistencia" FOR ALL
  USING (
    public.recanto_get_profile_type() IN ('Administrador', 'Médico')
    OR public.recanto_get_employee_role() IN ('Médico', 'Nutricionista', 'Fisioterapeuta')
  );

-- 3. Criar a tabela de Acompanhamento do Plano de Cuidados no Boletim Diário
CREATE TABLE public."Recanto_AcompanhamentoPlano" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  UUID NOT NULL REFERENCES public."Recanto_ChecklistDiario"(id) ON DELETE CASCADE,
  care_plan_id  UUID NOT NULL REFERENCES public."Recanto_PlanosAssistencia"(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('conseguindo_seguir', 'nao_conseguindo_seguir', 'apresentando_dificuldades')),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(checklist_id, care_plan_id)
);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trg_acompanhamento_plano_updated_at
  BEFORE UPDATE ON public."Recanto_AcompanhamentoPlano"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Habilitar RLS
ALTER TABLE public."Recanto_AcompanhamentoPlano" ENABLE ROW LEVEL SECURITY;

-- 4. Definir as políticas de RLS para a tabela de Acompanhamento
CREATE POLICY "acompanhamento_plano_select" ON public."Recanto_AcompanhamentoPlano" FOR SELECT
  USING (
    public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador')
    OR (
      public.recanto_get_profile_type() = 'Responsável'
      AND EXISTS (
        SELECT 1 FROM public."Recanto_ChecklistDiario" cd
        WHERE cd.id = checklist_id
          AND cd.resident_id = public.recanto_get_resident_id()
      )
    )
  );

CREATE POLICY "acompanhamento_plano_write" ON public."Recanto_AcompanhamentoPlano" FOR ALL
  USING (
    public.recanto_get_profile_type() IN ('Administrador', 'Médico', 'Cuidador')
  );

-- Criar índice para performance
CREATE INDEX idx_acompanhamento_plano_checklist ON public."Recanto_AcompanhamentoPlano"(checklist_id);
