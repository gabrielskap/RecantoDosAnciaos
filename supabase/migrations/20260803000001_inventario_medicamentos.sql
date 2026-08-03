-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Inventário de Medicamentos com baixa por posologia
-- Data: 2026-08-03
--
-- Cria o inventário de medicamentos (concentração por unidade + embalagem +
-- posologia) e um razão de movimentações. O saldo é mantido por trigger, no
-- mesmo espírito de update_stock_quantity() (ver 20260608000002). A baixa via
-- Boletim Diário/Noturno é idempotente pela UNIQUE (origem_checklist_id,
-- origem_item_id). Isolamento multi-tenant segue o padrão de empresa_id +
-- políticas PERMISSIVE (por papel) e RESTRICTIVE (por empresa) usado no estoque.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Tabela: Inventário de Medicamentos
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Recanto_InventarioMedicamentos" (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               TEXT REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id(),
  resident_id              UUID REFERENCES public."Recanto_Residentes"(id) ON DELETE CASCADE,
  medicacao_id             UUID REFERENCES public."Recanto_Medicacoes"(id) ON DELETE SET NULL,
  nome                     TEXT NOT NULL,
  principio_ativo          TEXT,
  forma                    TEXT NOT NULL DEFAULT 'comprimido'
                             CHECK (forma IN ('comprimido','capsula','ml','gota','ampola','sache','outro')),
  concentracao_valor       NUMERIC NOT NULL CHECK (concentracao_valor > 0),
  concentracao_unidade     TEXT NOT NULL DEFAULT 'mg',
  unidades_por_embalagem   NUMERIC CHECK (unidades_por_embalagem IS NULL OR unidades_por_embalagem > 0),
  saldo_unidades           NUMERIC NOT NULL DEFAULT 0 CHECK (saldo_unidades >= 0),
  estoque_minimo_unidades  NUMERIC NOT NULL DEFAULT 0 CHECK (estoque_minimo_unidades >= 0),
  dose_por_tomada          NUMERIC CHECK (dose_por_tomada IS NULL OR dose_por_tomada > 0),
  tomadas_por_dia          NUMERIC CHECK (tomadas_por_dia IS NULL OR tomadas_por_dia > 0),
  validade                 DATE,
  lote                     TEXT,
  observacoes              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_medicamentos_empresa   ON public."Recanto_InventarioMedicamentos"(empresa_id);
CREATE INDEX IF NOT EXISTS idx_inv_medicamentos_resident  ON public."Recanto_InventarioMedicamentos"(resident_id);
CREATE INDEX IF NOT EXISTS idx_inv_medicamentos_medicacao ON public."Recanto_InventarioMedicamentos"(medicacao_id);

DROP TRIGGER IF EXISTS trg_inv_medicamentos_updated_at ON public."Recanto_InventarioMedicamentos";
CREATE TRIGGER trg_inv_medicamentos_updated_at
  BEFORE UPDATE ON public."Recanto_InventarioMedicamentos"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 2. Tabela: Movimentações de Medicamento (razão / ledger)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Recanto_MovimentacoesMedicamento" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           TEXT REFERENCES public."Recanto_Empresas"(empresa_id) ON DELETE CASCADE DEFAULT public.recanto_get_empresa_id(),
  inventario_id        UUID NOT NULL REFERENCES public."Recanto_InventarioMedicamentos"(id) ON DELETE CASCADE,
  tipo                 TEXT NOT NULL CHECK (tipo IN ('entrada','administracao','ajuste','perda','vencido')),
  quantidade_unidades  NUMERIC NOT NULL CHECK (quantidade_unidades >= 0),
  data                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_name            TEXT,
  notas                TEXT,
  origem_checklist_id  UUID REFERENCES public."Recanto_ChecklistDiario"(id) ON DELETE CASCADE,
  origem_item_id       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotência da baixa via boletim: cada item "tomou" de um checklist debita
  -- no máximo uma vez, mesmo que o boletim seja salvo/reaberto várias vezes.
  -- (NULLs são distintos no Postgres, então movimentações manuais não colidem.)
  CONSTRAINT uq_mov_medicamento_origem UNIQUE (origem_checklist_id, origem_item_id)
);

CREATE INDEX IF NOT EXISTS idx_mov_medicamento_inventario ON public."Recanto_MovimentacoesMedicamento"(inventario_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_mov_medicamento_empresa    ON public."Recanto_MovimentacoesMedicamento"(empresa_id);

-- --------------------------------------------------------------------------
-- 3. Trigger: mantém saldo_unidades a partir das movimentações
--    SECURITY DEFINER para que a atualização do saldo não seja filtrada pela
--    RLS quando um Cuidador registra a baixa (via boletim ou manual) — o
--    UPDATE no item tem política de escrita mais restrita que a inserção da
--    movimentação, então sem SECURITY DEFINER o saldo silenciosamente não
--    mudaria para papéis não-Administrador.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_medicamento_saldo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public."Recanto_InventarioMedicamentos"
    SET saldo_unidades = saldo_unidades + NEW.quantidade_unidades
    WHERE id = NEW.inventario_id;
  ELSIF NEW.tipo IN ('administracao','perda','vencido') THEN
    UPDATE public."Recanto_InventarioMedicamentos"
    SET saldo_unidades = GREATEST(0, saldo_unidades - NEW.quantidade_unidades)
    WHERE id = NEW.inventario_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public."Recanto_InventarioMedicamentos"
    SET saldo_unidades = NEW.quantidade_unidades
    WHERE id = NEW.inventario_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_medicamento_movimentacao ON public."Recanto_MovimentacoesMedicamento";
CREATE TRIGGER trg_after_medicamento_movimentacao
  AFTER INSERT ON public."Recanto_MovimentacoesMedicamento"
  FOR EACH ROW EXECUTE FUNCTION public.update_medicamento_saldo();

-- --------------------------------------------------------------------------
-- 4. Row Level Security
--    PERMISSIVE por papel (como o estoque) + RESTRICTIVE por empresa (tenant).
-- --------------------------------------------------------------------------
ALTER TABLE public."Recanto_InventarioMedicamentos"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recanto_MovimentacoesMedicamento"  ENABLE ROW LEVEL SECURITY;

-- Inventário: leitura clínica ampla; escrita por Administrador/Médico (como Recanto_Medicacoes)
DROP POLICY IF EXISTS "inv_medicamentos_select" ON public."Recanto_InventarioMedicamentos";
CREATE POLICY "inv_medicamentos_select" ON public."Recanto_InventarioMedicamentos" FOR SELECT
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

DROP POLICY IF EXISTS "inv_medicamentos_write" ON public."Recanto_InventarioMedicamentos";
CREATE POLICY "inv_medicamentos_write" ON public."Recanto_InventarioMedicamentos" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico'))
  WITH CHECK (recanto_get_profile_type() IN ('Administrador','Médico'));

-- Movimentações: leitura clínica ampla; escrita inclui Cuidador (baixa via boletim)
DROP POLICY IF EXISTS "mov_medicamento_select" ON public."Recanto_MovimentacoesMedicamento";
CREATE POLICY "mov_medicamento_select" ON public."Recanto_MovimentacoesMedicamento" FOR SELECT
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

DROP POLICY IF EXISTS "mov_medicamento_write" ON public."Recanto_MovimentacoesMedicamento";
CREATE POLICY "mov_medicamento_write" ON public."Recanto_MovimentacoesMedicamento" FOR ALL
  USING (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'))
  WITH CHECK (recanto_get_profile_type() IN ('Administrador','Médico','Cuidador'));

-- Isolamento por empresa (RESTRICTIVE) — combina em AND com as permissivas acima
DROP POLICY IF EXISTS "inv_medicamentos_tenant_restrictive" ON public."Recanto_InventarioMedicamentos";
CREATE POLICY "inv_medicamentos_tenant_restrictive" ON public."Recanto_InventarioMedicamentos"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());

DROP POLICY IF EXISTS "mov_medicamento_tenant_restrictive" ON public."Recanto_MovimentacoesMedicamento";
CREATE POLICY "mov_medicamento_tenant_restrictive" ON public."Recanto_MovimentacoesMedicamento"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id())
  WITH CHECK (empresa_id = public.recanto_get_empresa_id());
