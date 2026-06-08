-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Módulo de Quartos
-- Data: 2026-06-08
-- Descrição: Criação da tabela de quartos, definição de políticas de RLS 
--            e inserção de dados iniciais (seed).
-- ==========================================================================

-- 1. Tipo ENUM para tipo do quarto
CREATE TYPE recanto_tipo_quarto AS ENUM ('Individual', 'Compartilhado');

-- 2. Tabela de Quartos
CREATE TABLE "Recanto_Quartos" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number       TEXT UNIQUE NOT NULL,
  type         recanto_tipo_quarto NOT NULL DEFAULT 'Individual',
  capacity     INTEGER NOT NULL DEFAULT 1,
  assets       TEXT[] NOT NULL DEFAULT '{}',
  status       recanto_status_quarto DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at automático
CREATE TRIGGER trg_quartos_updated_at
  BEFORE UPDATE ON "Recanto_Quartos"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE "Recanto_Quartos" ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (RLS)
-- Equipe (Admin, Médico, Cuidador) pode ver todos os quartos.
-- Responsável pode ver apenas o quarto onde seu residente está vinculado.
CREATE POLICY "quartos_select" ON "Recanto_Quartos" FOR SELECT
  USING (
    recanto_get_profile_type() IN ('Administrador','Médico','Cuidador')
    OR (recanto_get_profile_type() = 'Responsável' AND EXISTS (
      SELECT 1 FROM "Recanto_Residentes" r 
      WHERE r.id = recanto_get_resident_id() AND r.room = "Recanto_Quartos".number
    ))
  );

-- Apenas Administrador pode criar, editar ou excluir quartos.
CREATE POLICY "quartos_write" ON "Recanto_Quartos" FOR ALL
  USING (recanto_get_profile_type() = 'Administrador');

-- 5. Seed de Quartos Iniciais
INSERT INTO "Recanto_Quartos" (number, type, capacity, assets) VALUES
  ('101', 'Individual', 1, ARRAY['Televisão', 'Guarda-roupa', 'Banheiro Adaptado']),
  ('102', 'Individual', 1, ARRAY['Guarda-roupa', 'Ventilador']),
  ('103', 'Compartilhado', 2, ARRAY['Televisão', 'Guarda-roupa', 'Banheiro Adaptado', 'Ar Condicionado']),
  ('201', 'Compartilhado', 2, ARRAY['Guarda-roupa', 'Ventilador']),
  ('202', 'Compartilhado', 3, ARRAY['Televisão', 'Guarda-roupa', 'Banheiro Adaptado', 'Ar Condicionado', 'Frigobar'])
ON CONFLICT (number) DO NOTHING;

-- 6. Vincular permissões padrão para o novo módulo ROOMS
-- Administrador: permissão total
INSERT INTO "Recanto_Permissoes" (profile_id, module, actions)
SELECT id, 'ROOMS', ARRAY['view', 'edit', 'create', 'delete']::recanto_acao_permissao[]
FROM "Recanto_Perfis"
WHERE type = 'Administrador'
ON CONFLICT (profile_id, module) DO UPDATE
SET actions = EXCLUDED.actions;

-- Médico: permissão de leitura
INSERT INTO "Recanto_Permissoes" (profile_id, module, actions)
SELECT id, 'ROOMS', ARRAY['view']::recanto_acao_permissao[]
FROM "Recanto_Perfis"
WHERE type = 'Médico'
ON CONFLICT (profile_id, module) DO UPDATE
SET actions = EXCLUDED.actions;

-- Cuidador: permissão de leitura
INSERT INTO "Recanto_Permissoes" (profile_id, module, actions)
SELECT id, 'ROOMS', ARRAY['view']::recanto_acao_permissao[]
FROM "Recanto_Perfis"
WHERE type = 'Cuidador'
ON CONFLICT (profile_id, module) DO UPDATE
SET actions = EXCLUDED.actions;

-- Responsável: permissão de leitura
INSERT INTO "Recanto_Permissoes" (profile_id, module, actions)
SELECT id, 'ROOMS', ARRAY['view']::recanto_acao_permissao[]
FROM "Recanto_Perfis"
WHERE type = 'Responsável'
ON CONFLICT (profile_id, module) DO UPDATE
SET actions = EXCLUDED.actions;
