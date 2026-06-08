-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Triggers e Automações de Banco de Dados
-- Data: 2026-06-08
-- Descrição: Triggers para automatizar a consistência e o armazenamento
--            direto no banco de dados, reduzindo complexidade do frontend.
-- ==========================================================================


-- --------------------------------------------------------------------------
-- TRIGGER 1: Sincronização automática Supabase Auth -> Recanto_Usuarios
-- --------------------------------------------------------------------------

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger na tabela auth.users (necessita rodar como superuser/postgres)
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- --------------------------------------------------------------------------
-- TRIGGER 2: Controle de Estoque Automático baseado em Movimentações
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'entrada' THEN
    UPDATE public."Recanto_Estoque"
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.stock_item_id;
  ELSIF NEW.type = 'saida' THEN
    UPDATE public."Recanto_Estoque"
    SET quantity = GREATEST(0, quantity - NEW.quantity)
    WHERE id = NEW.stock_item_id;
  ELSIF NEW.type = 'ajuste' THEN
    UPDATE public."Recanto_Estoque"
    SET quantity = NEW.quantity
    WHERE id = NEW.stock_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_stock_transaction ON public."Recanto_MovimentacoesEstoque";
CREATE TRIGGER trg_after_stock_transaction
  AFTER INSERT ON public."Recanto_MovimentacoesEstoque"
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_quantity();


-- --------------------------------------------------------------------------
-- TRIGGER 3: Faturamento Automático (Gera primeira mensalidade ao criar contrato)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_initial_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_due_date DATE;
  v_month_year TEXT;
BEGIN
  -- Ouve apenas contratos ativos
  IF NEW.status = 'Ativo' THEN
    -- Calcula o dia de vencimento no mês/ano do início do contrato (start_date)
    BEGIN
      v_due_date := make_date(
        EXTRACT(YEAR FROM NEW.start_date)::INTEGER,
        EXTRACT(MONTH FROM NEW.start_date)::INTEGER,
        NEW.due_day
      );
    EXCEPTION WHEN OTHERS THEN
      -- Se o dia do vencimento extrapolar o limite do mês (ex: 30 de Fevereiro), pega o último dia do mês
      v_due_date := (date_trunc('month', NEW.start_date) + interval '1 month - 1 day')::DATE;
    END;

    -- Se a data calculada for anterior à data de início do contrato, move para o mês subsequente
    IF v_due_date < NEW.start_date THEN
      v_due_date := (v_due_date + interval '1 month')::DATE;
    END IF;

    -- Define o formato de competência (MM/YYYY)
    v_month_year := to_char(v_due_date, 'MM/YYYY');

    -- Insere a mensalidade pendente inicial
    INSERT INTO public."Recanto_Mensalidades" (contract_id, resident_id, amount, due_date, status, month_year)
    VALUES (
      NEW.id,
      NEW.resident_id,
      NEW.monthly_value,
      v_due_date,
      'Pendente',
      v_month_year
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_contract_insert ON public."Recanto_Contratos";
CREATE TRIGGER trg_after_contract_insert
  AFTER INSERT ON public."Recanto_Contratos"
  FOR EACH ROW EXECUTE FUNCTION public.generate_initial_invoice();


-- --------------------------------------------------------------------------
-- TRIGGER 4: Integração de Cobranças Pagas no Registro Financeiro (Lançamento de Receita)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_to_financial()
RETURNS TRIGGER AS $$
DECLARE
  v_resident_name TEXT;
BEGIN
  -- Executa apenas quando a mensalidade é marcada como 'Pago'
  IF NEW.status = 'Pago' AND (OLD.status IS NULL OR OLD.status <> 'Pago') THEN
    -- Busca o nome do residente para uma descrição mais detalhada
    SELECT name INTO v_resident_name
    FROM public."Recanto_Residentes"
    WHERE id = NEW.resident_id;

    -- Verifica se já não foi criado um lançamento financeiro para essa mensalidade
    IF NOT EXISTS (
      SELECT 1 FROM public."Recanto_RegistrosFinanceiros"
      WHERE invoice_id = NEW.id
    ) THEN
      INSERT INTO public."Recanto_RegistrosFinanceiros" (type, category, description, amount, date, status, invoice_id)
      VALUES (
        'receita',
        'Mensalidade',
        'Mensalidade ' || NEW.month_year || ' - ' || COALESCE(v_resident_name, 'Residente'),
        NEW.amount,
        COALESCE(NEW.paid_date::DATE, CURRENT_DATE),
        'pago',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_invoice_payment ON public."Recanto_Mensalidades";
CREATE TRIGGER trg_after_invoice_payment
  AFTER UPDATE ON public."Recanto_Mensalidades"
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_to_financial();


-- --------------------------------------------------------------------------
-- TRIGGER 5: Log de Auditoria Clínica Automático
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_clinical_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id TEXT;
  v_user_name TEXT;
  v_action TEXT;
  v_details TEXT;
  v_resident_id UUID;
BEGIN
  -- Identifica o ID do usuário conectado no Supabase Auth
  v_user_id := COALESCE(auth.uid()::text, 'system');
  
  -- Busca o nome do usuário na tabela Recanto_Usuarios
  SELECT name INTO v_user_name
  FROM public."Recanto_Usuarios"
  WHERE auth_user_id = auth.uid();
  
  v_user_name := COALESCE(v_user_name, 'Sistema');

  -- Define os detalhes baseado na tabela e operação
  IF TG_TABLE_NAME = 'Recanto_SinaisVitais' THEN
    v_resident_id := NEW.resident_id;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Inserção de Sinais Vitais';
      v_details := 'Pressão: ' || COALESCE(NEW.bp, '-') || ', FC: ' || COALESCE(NEW.hr::text, '-') || ' bpm, Temp: ' || COALESCE(NEW.temp::text, '-') || '°C';
    ELSE
      v_action := 'Edição de Sinais Vitais';
      v_details := 'Registro de sinais vitais atualizado';
    END IF;
  ELSIF TG_TABLE_NAME = 'Recanto_ChecklistDiario' THEN
    v_resident_id := NEW.resident_id;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Inserção de Checklist Diário';
      v_details := 'Checklist diário criado para a data ' || NEW.date::text;
    ELSE
      v_action := 'Edição de Checklist Diário';
      v_details := 'Checklist diário atualizado para a data ' || NEW.date::text;
    END IF;
  ELSIF TG_TABLE_NAME = 'Recanto_Medicacoes' THEN
    IF TG_OP = 'DELETE' THEN
      v_resident_id := OLD.resident_id;
      v_action := 'Exclusão de Medicação';
      v_details := 'Removida medicação: ' || OLD.name || ' (' || OLD.dosage || ')';
    ELSE
      v_resident_id := NEW.resident_id;
      IF TG_OP = 'INSERT' THEN
        v_action := 'Inserção de Medicação';
        v_details := 'Cadastrado medicamento: ' || NEW.name || ' (' || NEW.dosage || ')';
      ELSE
        v_action := 'Atualização de Medicação';
        v_details := 'Medicação alterada: ' || NEW.name || ' (' || NEW.dosage || ')';
      END IF;
    END IF;
  END IF;

  -- Grava o log de auditoria
  INSERT INTO public."Recanto_LogsAuditoria" (resident_id, user_id, user_name, action, details)
  VALUES (v_resident_id, v_user_id, v_user_name, v_action, v_details);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vincula auditoria à tabela Recanto_SinaisVitais
DROP TRIGGER IF EXISTS trg_audit_sinais_vitais ON public."Recanto_SinaisVitais";
CREATE TRIGGER trg_audit_sinais_vitais
  AFTER INSERT OR UPDATE ON public."Recanto_SinaisVitais"
  FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_changes();

-- Vincula auditoria à tabela Recanto_ChecklistDiario
DROP TRIGGER IF EXISTS trg_audit_checklist ON public."Recanto_ChecklistDiario";
CREATE TRIGGER trg_audit_checklist
  AFTER INSERT OR UPDATE ON public."Recanto_ChecklistDiario"
  FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_changes();

-- Vincula auditoria à tabela Recanto_Medicacoes
DROP TRIGGER IF EXISTS trg_audit_medicacoes ON public."Recanto_Medicacoes";
CREATE TRIGGER trg_audit_medicacoes
  AFTER INSERT OR UPDATE OR DELETE ON public."Recanto_Medicacoes"
  FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_changes();
