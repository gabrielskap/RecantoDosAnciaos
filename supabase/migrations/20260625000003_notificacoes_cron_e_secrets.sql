-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Módulo de Notificações WhatsApp — Cron e Segredos
-- Data: 2026-06-25
-- Descrição:
--   Seeds (não sensíveis) em Recanto_Integracao_Secrets e agendamentos pg_cron
--   que chamam a Edge Function RecantoDosAnciaos_dispatch-notifications (envio) e o reaper
--   (destrava mensagens presas em 'processing').
--
--   PRÉ-REQUISITOS (passo manual do ambiente):
--     - Habilitar extensões pg_cron e pg_net no projeto Supabase.
--     - Inserir os segredos reais (UAZAPI_BASE_URL, UAZAPI_ADMIN_TOKEN,
--       DISPATCH_SECRET, NOTIF_DISPATCH_URL) via UPSERT manual — ver abaixo.
--   Os agendamentos leem a URL e o segredo da tabela em tempo de execução,
--   portanto NÃO há project-ref/segredo embutido nesta migration.
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 1. Seeds NÃO sensíveis (placeholders). Não sobrescreve valores já definidos.
-- --------------------------------------------------------------------------

INSERT INTO public."Recanto_Integracao_Secrets" (chave, valor, descricao) VALUES
  ('UAZAPI_BASE_URL',    'https://SEU_HOST.uazapi.com',
     'Base URL da API UAZAPI (ex.: https://free.uazapi.com)'),
  ('NOTIF_DISPATCH_URL', 'https://SEU_PROJETO.supabase.co/functions/v1/RecantoDosAnciaos_dispatch-notifications',
     'URL da Edge Function RecantoDosAnciaos_dispatch-notifications (usada pelo cron)')
ON CONFLICT (chave) DO NOTHING;

-- ── Preencha os segredos sensíveis manualmente (NÃO versionar valores) ──
-- insert into public."Recanto_Integracao_Secrets" (chave, valor, descricao) values
--   ('UAZAPI_ADMIN_TOKEN', '<admintoken_do_servidor_uazapi>', 'Token admin p/ criar/conectar instâncias'),
--   ('DISPATCH_SECRET',    '<segredo_forte_do_dispatcher>',  'Bearer exigido pela Edge Function RecantoDosAnciaos_dispatch-notifications')
-- on conflict (chave) do update set valor = excluded.valor, updated_at = now();
-- E ajuste UAZAPI_BASE_URL / NOTIF_DISPATCH_URL com os valores reais.


-- --------------------------------------------------------------------------
-- 2. Extensões (tenta habilitar; se faltar privilégio, registra aviso)
-- --------------------------------------------------------------------------

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não pôde ser criado automaticamente: %', SQLERRM;
END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net não pôde ser criado automaticamente: %', SQLERRM;
END $$;


-- --------------------------------------------------------------------------
-- 3. Agendamentos (idempotente). A URL e o segredo vêm da tabela em runtime.
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron ausente — habilite a extensão e reaplique esta migration para criar os agendamentos.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net ausente — habilite a extensão e reaplique esta migration para criar os agendamentos.';
    RETURN;
  END IF;

  -- Remove agendamentos antigos com o mesmo nome (idempotência).
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('dispatch-whatsapp-notifications', 'reap-stuck-whatsapp-notifications');

  -- 3.1 Dispatcher: a cada minuto chama a Edge Function.
  PERFORM cron.schedule(
    'dispatch-whatsapp-notifications',
    '* * * * *',
    $cron$
      SELECT net.http_post(
        url := (SELECT valor FROM public."Recanto_Integracao_Secrets" WHERE chave = 'NOTIF_DISPATCH_URL'),
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (SELECT valor FROM public."Recanto_Integracao_Secrets" WHERE chave = 'DISPATCH_SECRET'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $cron$
  );

  -- 3.2 Reaper: a cada 5 min destrava mensagens presas em 'processing'.
  PERFORM cron.schedule(
    'reap-stuck-whatsapp-notifications',
    '*/5 * * * *',
    $cron$
      UPDATE public."Recanto_Notificacao_Fila"
      SET status = 'pending',
          claimed_at = NULL,
          scheduled_for = now() + interval '1 minute',
          last_error = coalesce(last_error, '') || ' | Reprocessada pelo reaper'
      WHERE status = 'processing'
        AND claimed_at < now() - interval '5 minutes';
    $cron$
  );
END $$;
