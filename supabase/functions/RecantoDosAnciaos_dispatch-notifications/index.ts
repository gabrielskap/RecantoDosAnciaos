// ===========================================================================
// Edge Function: RecantoDosAnciaos_dispatch-notifications
// ---------------------------------------------------------------------------
// Dispatcher do padrão Outbox. Chamado periodicamente (pg_cron) para enviar as
// mensagens pendentes em Recanto_Notificacao_Fila via UAZAPI.
//
// Segurança / robustez:
//   - Exige `Authorization: Bearer <DISPATCH_SECRET>` (lido de
//     Recanto_Integracao_Secrets, fallback env).
//   - Reivindica um lote atomicamente (recanto_claim_pending_notifications,
//     FOR UPDATE SKIP LOCKED) → sem envio duplicado entre execuções.
//   - Usa o token UAZAPI da empresa (Recanto_Whatsapp_Instancias) — service_role.
//     O token NUNCA é retornado ao chamador.
//   - Retry: em falha, volta a 'pending' com backoff de 5 min até max_attempts;
//     depois marca 'failed' e grava last_error.
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SECRETS_TABLE = 'Recanto_Integracao_Secrets';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const UAZAPI_TIMEOUT_MS = 20000;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// Lê chaves de Recanto_Integracao_Secrets (fallback env). Nunca loga valores.
async function loadSecrets(admin: any, keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    const { data, error } = await admin.from(SECRETS_TABLE).select('chave, valor').in('chave', keys);
    if (error) {
      console.error('[dispatch] Falha ao ler segredos:', JSON.stringify({ code: error.code, message: error.message }));
    } else {
      for (const r of data ?? []) out[r.chave] = String(r.valor ?? '').trim();
    }
  } catch (err) {
    console.error('[dispatch] Erro de conexão ao ler segredos:', (err as Error).message);
  }
  for (const k of keys) {
    if (!out[k]) out[k] = (Deno.env.get(k) ?? '').trim();
  }
  return out;
}

async function uazapiSend(
  baseUrl: string,
  token: string,
  job: any,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  let endpoint = '/send/text';
  let body: Record<string, unknown> = { number: job.recipient_phone, text: job.message_text };

  if (job.message_type === 'button' || job.message_type === 'menu') {
    endpoint = '/send/menu';
    body = {
      number: job.recipient_phone,
      type: 'button',
      text: job.message_text,
      choices: job.choices ?? [],
      footerText: job.footer_text ?? '',
      track_source: job.trigger_event,
      track_id: job.id,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UAZAPI_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'token': token },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return { ok: res.ok, status: res.status, body: parsed };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[dispatch] Variáveis de ambiente do Supabase ausentes.');
    return jsonResponse({ error: 'Configuração ausente.' }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Autenticação por Bearer (segredo da tabela, fallback env).
  const secrets = await loadSecrets(admin, ['DISPATCH_SECRET', 'UAZAPI_BASE_URL']);
  const expected = secrets['DISPATCH_SECRET'];
  const auth = req.headers.get('Authorization') ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const baseUrl = (secrets['UAZAPI_BASE_URL'] ?? '').replace(/\/+$/, '');
  if (!baseUrl) {
    return jsonResponse({ error: 'UAZAPI_BASE_URL não configurado.' }, 500);
  }

  // 2. Reivindica um lote de pendentes.
  const { data: jobs, error: claimErr } = await admin.rpc('recanto_claim_pending_notifications', { p_batch: 20 });
  if (claimErr) {
    console.error('[dispatch] Erro no claim:', claimErr.message);
    return jsonResponse({ error: claimErr.message }, 500);
  }

  // Cache de token por empresa (evita refetch dentro do lote).
  const tokenCache = new Map<string, { token: string | null; status: string | null }>();
  const getInstance = async (empresaId: string) => {
    if (tokenCache.has(empresaId)) return tokenCache.get(empresaId)!;
    const { data } = await admin
      .from('Recanto_Whatsapp_Instancias')
      .select('uazapi_token, status')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    const entry = { token: data?.uazapi_token ?? null, status: data?.status ?? null };
    tokenCache.set(empresaId, entry);
    return entry;
  };

  let sent = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    try {
      const inst = await getInstance(job.empresa_id);
      if (!inst.token) {
        throw new Error('Nenhuma instância UAZAPI com token para esta empresa.');
      }
      if (inst.status && inst.status !== 'connected') {
        throw new Error(`Instância UAZAPI não conectada (status: ${inst.status}).`);
      }

      const resp = await uazapiSend(baseUrl, inst.token, job);
      if (!resp.ok) {
        throw new Error(`UAZAPI ${resp.status}: ${JSON.stringify(resp.body).slice(0, 400)}`);
      }

      await admin.from('Recanto_Notificacao_Fila').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        last_error: null,
        provider_response: resp.body,
      }).eq('id', job.id);

      sent++;
    } catch (err) {
      const attempts = job.attempts ?? 1;
      const maxAttempts = job.max_attempts ?? 5;
      const giveUp = attempts >= maxAttempts;

      await admin.from('Recanto_Notificacao_Fila').update({
        status: giveUp ? 'failed' : 'pending',
        scheduled_for: giveUp ? job.scheduled_for : new Date(Date.now() + 5 * 60_000).toISOString(),
        claimed_at: null,
        last_error: String((err as Error).message ?? err).slice(0, 500),
      }).eq('id', job.id);

      failed++;
    }
  }

  return jsonResponse({ claimed: jobs?.length ?? 0, sent, failed });
});
