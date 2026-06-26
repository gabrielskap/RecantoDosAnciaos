-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Módulo de Notificações WhatsApp — Funções e Trigger
-- Data: 2026-06-25
-- Descrição:
--   Funções auxiliares (normalização de telefone, render de template),
--   enfileiramento (Outbox), claim do dispatcher, leitura segura da instância,
--   reenviar/cancelar, trigger de medicamento com estoque baixo, template seed
--   e view de observabilidade.
--   REGRA: nenhuma função aqui faz HTTP — apenas insere na fila.
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 1. Normalizar telefone brasileiro → 55DDDNNNNNNNN (12 ou 13 dígitos)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_normalize_br_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits text;
BEGIN
  v_digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF v_digits = '' THEN
    RETURN NULL;
  END IF;

  IF left(v_digits, 2) <> '55' THEN
    v_digits := '55' || v_digits;
  END IF;

  IF length(v_digits) < 12 OR length(v_digits) > 13 THEN
    RETURN NULL;
  END IF;

  RETURN v_digits;
END;
$$;


-- --------------------------------------------------------------------------
-- 2. Renderizar template — substitui {chave} pelos valores do jsonb
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_render_notification_template(
  p_template text,
  p_vars jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_key text;
  v_value text;
  v_output text := p_template;
BEGIN
  FOR v_key, v_value IN
    SELECT key, value FROM jsonb_each_text(coalesce(p_vars, '{}'::jsonb))
  LOOP
    v_output := replace(v_output, '{' || v_key || '}', coalesce(v_value, ''));
  END LOOP;

  RETURN v_output;
END;
$$;


-- --------------------------------------------------------------------------
-- 3. Enfileirar notificação (usado por triggers e pelo envio manual)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_enqueue_notification(
  p_empresa_id    text,
  p_trigger_event text,
  p_template_id   uuid,
  p_message_type  text,
  p_recipient_type text,
  p_recipient_id  uuid,
  p_recipient_name text,
  p_recipient_phone text,
  p_message_text  text,
  p_footer_text   text DEFAULT NULL,
  p_choices       jsonb DEFAULT NULL,
  p_dedup_key     text DEFAULT NULL,
  p_created_by    uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phone text;
  v_id uuid;
BEGIN
  v_phone := public.recanto_normalize_br_phone(p_recipient_phone);

  IF v_phone IS NULL THEN
    RAISE NOTICE 'Telefone inválido. Destinatário: %, Telefone original: %',
      p_recipient_name, p_recipient_phone;
    RETURN NULL;
  END IF;

  INSERT INTO public."Recanto_Notificacao_Fila" (
    empresa_id, trigger_event, template_id, message_type, recipient_type,
    recipient_id, recipient_name, recipient_phone, message_text, footer_text,
    choices, dedup_key, created_by
  )
  VALUES (
    p_empresa_id,
    p_trigger_event,
    p_template_id,
    coalesce(p_message_type, 'text')::recanto_notif_msgtype,
    coalesce(p_recipient_type, 'responsible')::recanto_notif_recipient,
    p_recipient_id,
    p_recipient_name,
    v_phone,
    p_message_text,
    p_footer_text,
    p_choices,
    p_dedup_key,
    p_created_by
  )
  ON CONFLICT (dedup_key) WHERE status IN ('pending','processing')
  DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


-- --------------------------------------------------------------------------
-- 4. Envio manual a partir da interface (multi-destinatário)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_enqueue_manual_notification(
  p_template_id  uuid DEFAULT NULL,
  p_message_text text DEFAULT NULL,
  p_recipients   jsonb DEFAULT '[]'::jsonb,
  p_created_by   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id text := public.recanto_get_empresa_id();
  v_template public."Recanto_Notificacao_Templates"%rowtype;
  v_recipient jsonb;
  v_message text;
  v_id uuid;
  v_total int := 0;
  v_created int := 0;
BEGIN
  -- Apenas administradores podem disparar envios manuais.
  IF public.recanto_get_profile_type() <> 'Administrador' THEN
    RAISE EXCEPTION 'Sem permissão para enviar notificações.';
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa do usuário não identificada.';
  END IF;

  IF p_template_id IS NOT NULL THEN
    SELECT * INTO v_template
    FROM public."Recanto_Notificacao_Templates"
    WHERE id = p_template_id AND active = true
      AND (empresa_id = v_empresa_id OR empresa_id IS NULL);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Template não encontrado ou inativo.';
    END IF;
  END IF;

  FOR v_recipient IN SELECT value FROM jsonb_array_elements(coalesce(p_recipients, '[]'::jsonb))
  LOOP
    v_total := v_total + 1;

    v_message := coalesce(p_message_text, v_template.message_text);
    v_message := public.recanto_render_notification_template(
      v_message, coalesce(v_recipient->'variables', '{}'::jsonb)
    );

    v_id := public.recanto_enqueue_notification(
      v_empresa_id,
      'manual',
      p_template_id,
      coalesce(v_template.message_type::text, 'text'),
      coalesce(v_recipient->>'recipient_type', 'manual_phone'),
      nullif(v_recipient->>'recipient_id', '')::uuid,
      v_recipient->>'recipient_name',
      v_recipient->>'recipient_phone',
      v_message,
      v_template.footer_text,
      v_template.choices,
      NULL,             -- envio manual: sem dedup
      p_created_by
    );

    IF v_id IS NOT NULL THEN
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'created', v_created);
END;
$$;


-- --------------------------------------------------------------------------
-- 5. Reenviar / Cancelar item da fila (UI — sem expor escrita direta)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_resend_notification(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  IF public.recanto_get_profile_type() <> 'Administrador' THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  UPDATE public."Recanto_Notificacao_Fila"
  SET status = 'pending', attempts = 0, claimed_at = NULL, last_error = NULL,
      scheduled_for = now()
  WHERE id = p_id
    AND empresa_id = public.recanto_get_empresa_id()
    AND status = 'failed';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.recanto_cancel_notification(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  IF public.recanto_get_profile_type() <> 'Administrador' THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  UPDATE public."Recanto_Notificacao_Fila"
  SET status = 'cancelled'
  WHERE id = p_id
    AND empresa_id = public.recanto_get_empresa_id()
    AND status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;


-- --------------------------------------------------------------------------
-- 6. Leitura segura da instância WhatsApp da empresa (sem o token)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_get_whatsapp_instance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id text := public.recanto_get_empresa_id();
  v_row public."Recanto_Whatsapp_Instancias"%rowtype;
BEGIN
  IF v_empresa_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM public."Recanto_Whatsapp_Instancias"
  WHERE empresa_id = v_empresa_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_configured', 'connected', false);
  END IF;

  RETURN jsonb_build_object(
    'instance_name', v_row.instance_name,
    'status', v_row.status,
    'connected', (v_row.status = 'connected'),
    'phone_number', v_row.phone_number,
    'has_token', (v_row.uazapi_token IS NOT NULL),
    'connected_at', v_row.connected_at,
    'updated_at', v_row.updated_at
  );
END;
$$;


-- --------------------------------------------------------------------------
-- 7. Claim de lote pelo dispatcher (FOR UPDATE SKIP LOCKED)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_claim_pending_notifications(p_batch int DEFAULT 20)
RETURNS SETOF public."Recanto_Notificacao_Fila"
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public."Recanto_Notificacao_Fila" q
  SET status = 'processing', attempts = attempts + 1, claimed_at = now()
  WHERE q.id IN (
    SELECT id FROM public."Recanto_Notificacao_Fila"
    WHERE status = 'pending'
      AND scheduled_for <= now()
      AND attempts < max_attempts
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch
  )
  RETURNING q.*;
$$;


-- --------------------------------------------------------------------------
-- 8. Trigger: medicamento com estoque baixo → enfileira aviso ao responsável
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recanto_fn_notify_medication_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template public."Recanto_Notificacao_Templates"%rowtype;
  v_resident_name text;
  v_responsible_id uuid;
  v_responsible_name text;
  v_responsible_phone text;
  v_can_send boolean := false;
  v_message text;
  v_dedup_key text;
BEGIN
  -- Só medicamentos vinculados a um residente, e apenas no cruzamento do limiar.
  IF NEW.category <> 'medicamento' OR NEW.resident_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (
    NEW.quantity <= NEW.min_threshold
    AND (TG_OP = 'INSERT' OR OLD.quantity > OLD.min_threshold)
  ) THEN
    RETURN NEW;
  END IF;

  -- Template ativo (específico da empresa vence o global).
  SELECT * INTO v_template
  FROM public."Recanto_Notificacao_Templates"
  WHERE trigger_event = 'medication_low'
    AND active = true
    AND (empresa_id = NEW.empresa_id OR empresa_id IS NULL)
  ORDER BY empresa_id NULLS LAST, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'Nenhum template ativo para medication_low.';
    RETURN NEW;
  END IF;

  -- Responsável PRINCIPAL do residente.
  SELECT resp.id, resp.name, resp.phone, r.name
    INTO v_responsible_id, v_responsible_name, v_responsible_phone, v_resident_name
  FROM public."Recanto_Residentes" r
  JOIN public."Recanto_ResponsaveisLegais" resp ON resp.resident_id = r.id
  WHERE r.id = NEW.resident_id
  ORDER BY resp.is_primary DESC, resp.created_at ASC
  LIMIT 1;

  IF v_responsible_id IS NULL OR v_responsible_phone IS NULL THEN
    RAISE NOTICE 'Residente % sem responsável/telefone.', NEW.resident_id;
    RETURN NEW;
  END IF;

  -- Consentimento (prefere a preferência específica do residente).
  SELECT coalesce(pref.whatsapp_enabled, false)
     AND coalesce(pref.health_notifications_enabled, false)
     AND pref.revoked_at IS NULL
    INTO v_can_send
  FROM public."Recanto_Notificacao_Preferencias" pref
  WHERE pref.responsible_id = v_responsible_id
    AND (pref.resident_id = NEW.resident_id OR pref.resident_id IS NULL)
  ORDER BY (pref.resident_id IS NOT NULL) DESC
  LIMIT 1;

  v_can_send := coalesce(v_can_send, false);

  IF NOT v_can_send THEN
    RAISE NOTICE 'Responsável % sem consentimento de saúde.', v_responsible_id;
    RETURN NEW;
  END IF;

  v_message := public.recanto_render_notification_template(
    v_template.message_text,
    jsonb_build_object(
      'resident_name', coalesce(v_resident_name, ''),
      'responsible_name', coalesce(v_responsible_name, ''),
      'medication_name', coalesce(NEW.name, ''),
      'quantity', coalesce(NEW.quantity::text, ''),
      'min_quantity', coalesce(NEW.min_threshold::text, '')
    )
  );

  v_dedup_key := 'medication_low:' || NEW.id::text || ':' || v_responsible_id::text;

  PERFORM public.recanto_enqueue_notification(
    NEW.empresa_id,
    'medication_low',
    v_template.id,
    v_template.message_type::text,
    'responsible',
    v_responsible_id,
    v_responsible_name,
    v_responsible_phone,
    v_message,
    v_template.footer_text,
    v_template.choices,
    v_dedup_key,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_medication_low_stock ON public."Recanto_Estoque";
CREATE TRIGGER trg_notify_medication_low_stock
  AFTER INSERT OR UPDATE OF quantity ON public."Recanto_Estoque"
  FOR EACH ROW EXECUTE FUNCTION public.recanto_fn_notify_medication_low_stock();


-- --------------------------------------------------------------------------
-- 9. Template inicial (global) para medicamento com estoque baixo
--    LGPD: sem diagnóstico/posologia.
-- --------------------------------------------------------------------------

INSERT INTO public."Recanto_Notificacao_Templates" (
  empresa_id, name, trigger_event, message_type, message_text, footer_text, choices, active
)
SELECT
  NULL,
  'Aviso de medicamento com estoque baixo',
  'medication_low',
  'button',
  'Olá {responsible_name}, identificamos que um medicamento do(a) residente {resident_name} está com estoque baixo no Recanto dos Anciãos.

Medicamento: {medication_name}
Quantidade atual: {quantity}

Por gentileza, providencie a reposição ou entre em contato com a equipe para mais informações.',
  'Recanto dos Anciãos',
  '[{"id":"confirmar_recebimento","text":"Confirmar recebimento"},{"id":"falar_com_equipe","text":"Falar com a equipe"}]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public."Recanto_Notificacao_Templates"
  WHERE trigger_event = 'medication_low' AND empresa_id IS NULL
);


-- --------------------------------------------------------------------------
-- 10. View de observabilidade (contagem por empresa/status)
-- --------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.recanto_v_notification_status_summary AS
SELECT empresa_id, status, count(*) AS total
FROM public."Recanto_Notificacao_Fila"
GROUP BY empresa_id, status;
