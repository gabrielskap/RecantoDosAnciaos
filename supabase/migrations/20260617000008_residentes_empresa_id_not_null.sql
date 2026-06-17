-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Tornar empresa_id obrigatório em Recanto_Residentes
-- Data: 2026-06-17
-- Descrição: Garante que todos os residentes cadastrados estejam vinculados a 
--            uma empresa e define a coluna empresa_id como NOT NULL.
-- ==========================================================================

-- 1. Migração de dados: garante que qualquer residente sem empresa_id seja associado
DO $$
DECLARE
  v_first_empresa_id text;
BEGIN
  -- Tenta obter o empresa_id da primeira empresa cadastrada
  SELECT empresa_id INTO v_first_empresa_id FROM public."Recanto_Empresas" LIMIT 1;

  -- Se não houver nenhuma empresa cadastrada, cria uma empresa padrão para evitar falha na FK
  IF v_first_empresa_id IS NULL THEN
    v_first_empresa_id := 'empresa_padrao';
    INSERT INTO public."Recanto_Empresas" (empresa_id, nome_instituicao, status)
    VALUES (v_first_empresa_id, 'Instituição Padrão', 'ativo')
    ON CONFLICT (empresa_id) DO NOTHING;
  END IF;

  -- Associa os residentes sem empresa_id a esta empresa padrão/primeira empresa
  UPDATE public."Recanto_Residentes"
  SET empresa_id = v_first_empresa_id
  WHERE empresa_id IS NULL;
END $$;

-- 2. Alterar a coluna para NOT NULL na tabela Recanto_Residentes
ALTER TABLE public."Recanto_Residentes"
  ALTER COLUMN empresa_id SET NOT NULL;
