-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Vinculação de Funcionários com Usuários
-- Data: 2026-06-08
-- Descrição: Atualiza a trigger handle_new_auth_user para suportar vinculação
--            com a tabela de Funcionários usando employee_id ou e-mail.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_name TEXT;
  v_profile_type TEXT;
BEGIN
  -- 1. Determinar o profile_id correto
  IF NEW.raw_user_meta_data ? 'profile_id' THEN
    v_profile_id := (NEW.raw_user_meta_data->>'profile_id')::UUID;
  ELSE
    -- Tenta encontrar pelo tipo indicado ou usa 'Cuidador' como fallback
    v_profile_type := COALESCE(NEW.raw_user_meta_data->>'profile_type', 'Cuidador');
    SELECT id INTO v_profile_id
    FROM public."Recanto_Perfis"
    WHERE type::text = v_profile_type
    LIMIT 1;

    -- Se não encontrar perfil desse tipo no banco, pega o primeiro perfil existente
    IF v_profile_id IS NULL THEN
      SELECT id INTO v_profile_id FROM public."Recanto_Perfis" LIMIT 1;
    END IF;
  END IF;

  -- 2. Determinar o nome do usuário
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- 3. Inserir ou atualizar na tabela pública de usuários
  INSERT INTO public."Recanto_Usuarios" (auth_user_id, name, email, profile_id, resident_id)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_profile_id,
    CASE 
      WHEN NEW.raw_user_meta_data ? 'resident_id' THEN (NEW.raw_user_meta_data->>'resident_id')::UUID
      ELSE NULL
    END
  )
  ON CONFLICT (auth_user_id) DO UPDATE 
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      profile_id = EXCLUDED.profile_id,
      resident_id = EXCLUDED.resident_id;

  -- 4. Vincular ao funcionário correspondente
  IF NEW.raw_user_meta_data ? 'employee_id' THEN
    UPDATE public."Recanto_Funcionarios"
    SET auth_user_id = NEW.id
    WHERE id = (NEW.raw_user_meta_data->>'employee_id')::UUID;
  ELSE
    -- Tenta pelo e-mail se não houver employee_id informado nos metadados
    UPDATE public."Recanto_Funcionarios"
    SET auth_user_id = NEW.id
    WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
