-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Ajuste do Trigger de Cadastro de Usuário no Auth
-- Data: 2026-06-17
-- Descrição: Atualiza a função handle_new_auth_user para associar a empresa
--            informada no metadado (checkout) e garantir a criação/associação
--            do perfil Administrador e suas permissões se necessário.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_name TEXT;
  v_profile_type TEXT;
  v_empresa_id TEXT;
BEGIN
  -- 1. Determinar o profile_id correto
  IF NEW.raw_user_meta_data ? 'profile_id' THEN
    v_profile_id := (NEW.raw_user_meta_data->>'profile_id')::UUID;
  ELSE
    -- Tenta encontrar pelo tipo de perfil indicado nos metadados ou 'Cuidador' como fallback
    v_profile_type := COALESCE(NEW.raw_user_meta_data->>'profile_type', 'Cuidador');
    
    SELECT id INTO v_profile_id
    FROM public."Recanto_Perfis"
    WHERE type::text = v_profile_type
    LIMIT 1;

    -- Se for Administrador e o perfil não existir, cria-se automaticamente o perfil e permissões padrão
    IF v_profile_id IS NULL AND v_profile_type = 'Administrador' THEN
      INSERT INTO public."Recanto_Perfis" (name, type, is_editable)
      VALUES ('Administrador', 'Administrador', false)
      RETURNING id INTO v_profile_id;

      INSERT INTO public."Recanto_Permissoes" (profile_id, module, actions)
      VALUES
        (v_profile_id, 'DASHBOARD', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'RESIDENTS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'RESIDENT_DETAIL', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'AGENDA', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'NUTRITION', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'TEAM', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'FINANCE', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'STOCK', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'REPORTS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'USERS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'ROOMS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]),
        (v_profile_id, 'SETTINGS', ARRAY['view', 'edit', 'create', 'delete']::public.recanto_acao_permissao[]);
    END IF;

    -- Se não encontrar nenhum perfil, pega o primeiro perfil existente
    IF v_profile_id IS NULL THEN
      SELECT id INTO v_profile_id FROM public."Recanto_Perfis" LIMIT 1;
    END IF;
  END IF;

  -- 2. Determinar o nome do usuário
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- 3. Obter empresa_id dos metadados
  v_empresa_id := NULL;
  IF NEW.raw_user_meta_data ? 'empresa_id' THEN
    v_empresa_id := NEW.raw_user_meta_data->>'empresa_id';
  END IF;

  -- 4. Inserir ou atualizar na tabela pública de usuários
  INSERT INTO public."Recanto_Usuarios" (auth_user_id, name, email, profile_id, resident_id, empresa_id)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_profile_id,
    CASE 
      WHEN NEW.raw_user_meta_data ? 'resident_id' THEN (NEW.raw_user_meta_data->>'resident_id')::UUID
      ELSE NULL
    END,
    v_empresa_id
  )
  ON CONFLICT (auth_user_id) DO UPDATE 
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      profile_id = EXCLUDED.profile_id,
      resident_id = EXCLUDED.resident_id,
      empresa_id = COALESCE(EXCLUDED.empresa_id, public."Recanto_Usuarios".empresa_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
