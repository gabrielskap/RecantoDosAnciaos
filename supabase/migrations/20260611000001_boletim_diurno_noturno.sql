-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Boletim Diário Diurno e Noturno
-- Data: 2026-06-11
-- Descrição: Permite 2 boletins por dia (diurno e noturno) por residente,
--            adicionando a coluna shift e alterando a restrição de unicidade.
-- ==========================================================================

-- 1. Remover a restrição de unicidade antiga (apenas por residente e data)
ALTER TABLE public."Recanto_ChecklistDiario" 
  DROP CONSTRAINT IF EXISTS "Recanto_ChecklistDiario_resident_id_date_key";

-- 2. Adicionar a coluna shift com padrão 'diurno' e restrição CHECK
ALTER TABLE public."Recanto_ChecklistDiario" 
  ADD COLUMN IF NOT EXISTS "shift" TEXT NOT NULL DEFAULT 'diurno' CHECK ("shift" IN ('diurno', 'noturno'));

-- 3. Adicionar a nova restrição de unicidade incluindo o turno (shift)
ALTER TABLE public."Recanto_ChecklistDiario" 
  ADD CONSTRAINT "Recanto_ChecklistDiario_resident_id_date_shift_key" UNIQUE (resident_id, date, shift);

-- 4. Atualizar a função de auditoria para registrar o turno nas alterações de checklist
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
      v_details := 'Checklist ' || COALESCE(NEW.shift, 'diurno') || ' criado para a data ' || NEW.date::text;
    ELSE
      v_action := 'Edição de Checklist Diário';
      v_details := 'Checklist ' || COALESCE(NEW.shift, 'diurno') || ' atualizado para a data ' || NEW.date::text;
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
