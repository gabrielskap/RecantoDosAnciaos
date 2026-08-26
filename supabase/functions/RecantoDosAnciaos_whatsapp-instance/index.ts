// ===========================================================================
// Edge Function: RecantoDosAnciaos_whatsapp-instance
// ---------------------------------------------------------------------------
// Gerencia a conexão da instância UAZAPI da empresa (criar/conectar/status/
// desconectar). Invocada pelo frontend com o JWT do usuário
// (supabase.functions.invoke). O token da instância UAZAPI é persistido em
// Recanto_Whatsapp_Instancias via service_role e NUNCA retorna ao frontend —
// só devolvemos status, QR Code (base64) e telefone.
//
// Ações (body.action): 'connect' | 'status' | 'disconnect'
//   - connect: cria a instância (se necessário) e gera o QR Code.
//   - status:  consulta o estado atual (polling) e persiste connected/phone.
//   - disconnect: desconecta a instância.
//
// Segurança: apenas Administrador da própria empresa. Usa UAZAPI_ADMIN_TOKEN +
// UAZAPI_BASE_URL de Recanto_Integracao_Secrets (fallback env).
//
// NOTA: os endpoints/campos exatos da UAZAPI são parseados defensivamente
// (token / qrcode / status podem vir em formatos levemente diferentes).
// Referência: https://docs.uazapi.com/
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SECRETS_TABLE = 'Recanto_Integracao_Secrets';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const UAZAPI_TIMEOUT_MS = 20000;
const INSTANCES_TABLE = 'Recanto_Whatsapp_Instancias';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function loadSecrets(admin: any, keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    const { data, error } = await admin.from(SECRETS_TABLE).select('chave, valor').in('chave', keys);
    if (!error) for (const r of data ?? []) out[r.chave] = String(r.valor ?? '').trim();
  } catch (err) {
    console.error('[RecantoDosAnciaos_whatsapp-instance] Erro ao ler segredos:', (err as Error).message);
  }
  for (const k of keys) if (!out[k]) out[k] = (Deno.env.get(k) ?? '').trim();
  return out;
}

// ─── Helpers de parsing defensivo das respostas UAZAPI ──────────────────────
function pick(obj: any, paths: string[]): any {
  for (const p of paths) {
    const parts = p.split('.');
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) cur = cur[part];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return null;
}

function extractToken(d: any): string | null {
  return pick(d, ['token', 'instance.token', 'instance.apikey', 'hash', 'apikey']);
}
function extractStatus(d: any): string | null {
  const raw = pick(d, ['status', 'instance.status', 'state', 'instance.state', 'connectionStatus']);
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (['connected', 'open', 'online'].includes(s)) return 'connected';
  if (['connecting', 'qrcode', 'pairing', 'syncing'].includes(s)) return 'connecting';
  return 'disconnected';
}
function extractQr(d: any): string | null {
  return pick(d, ['qrcode', 'instance.qrcode', 'qrCode', 'instance.qrCode', 'base64', 'qr']);
}
function extractPhone(d: any): string | null {
  return pick(d, ['phone', 'instance.phone', 'instance.owner', 'owner', 'me.id', 'instance.profileName']);
}

function uazapiFetch(baseUrl: string) {
  return async (path: string, method: string, headers: Record<string, string>, body?: unknown) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UAZAPI_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timeout);
    }
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return json({ error: 'Configuração ausente.' }, 500);
  }

  try {
    // 1. Autenticação do chamador (JWT).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    // 2. Verifica Administrador + resolve empresa.
    const { data: callerRow } = await supabaseUser
      .from('Recanto_Usuarios')
      .select('empresa_id, profile:Recanto_Perfis(type)')
      .eq('auth_user_id', caller.id)
      .single();

    const empresaId = callerRow?.empresa_id as string | undefined;
    if ((callerRow?.profile as any)?.type !== 'Administrador') {
      return json({ error: 'Forbidden: apenas Administradores.' }, 403);
    }
    if (!empresaId) return json({ error: 'Empresa não identificada.' }, 400);

    const { action } = await req.json().catch(() => ({ action: 'status' }));

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const secrets = await loadSecrets(admin, ['UAZAPI_BASE_URL', 'UAZAPI_ADMIN_TOKEN']);
    const baseUrl = (secrets['UAZAPI_BASE_URL'] ?? '').replace(/\/+$/, '');
    const adminToken = secrets['UAZAPI_ADMIN_TOKEN'] ?? '';
    if (!baseUrl) return json({ error: 'UAZAPI_BASE_URL não configurado.' }, 500);
    const api = uazapiFetch(baseUrl);

    // Linha atual da instância da empresa.
    const { data: existing } = await admin
      .from(INSTANCES_TABLE).select('*').eq('empresa_id', empresaId).maybeSingle();

    const persist = async (patch: Record<string, unknown>) => {
      await admin.from(INSTANCES_TABLE).upsert(
        { empresa_id: empresaId, ...patch }, { onConflict: 'empresa_id' },
      );
    };

    // ── disconnect ───────────────────────────────────────────────────────
    if (action === 'disconnect') {
      if (existing?.uazapi_token) {
        await api('/instance/disconnect', 'POST', { token: existing.uazapi_token }).catch(() => { });
      }
      await persist({ status: 'disconnected', last_qr: null });
      return json({ status: 'disconnected', connected: false });
    }

    // ── status (polling) ─────────────────────────────────────────────────
    if (action === 'status') {
      if (!existing?.uazapi_token) return json({ status: 'not_configured', connected: false });
      const r = await api('/instance/status', 'GET', { token: existing.uazapi_token });
      const status = extractStatus(r.data) ?? existing.status ?? 'disconnected';
      const phone = extractPhone(r.data);
      await persist({
        status,
        phone_number: phone ?? existing.phone_number ?? null,
        connected_at: status === 'connected' ? (existing.connected_at ?? new Date().toISOString()) : existing.connected_at,
        last_qr: status === 'connected' ? null : existing.last_qr,
      });
      return json({ status, connected: status === 'connected', phone_number: phone ?? existing.phone_number ?? null });
    }

    // ── connect (cria a instância se preciso e gera QR) ───────────────────
    if (action === 'connect') {
      let token = existing?.uazapi_token as string | null;
      const instanceName = existing?.instance_name ?? `recanto_${String(empresaId).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40)}`;

      // 1) Cria a instância se ainda não há token (exige admintoken).
      if (!token) {
        if (!adminToken) return json({ error: 'UAZAPI_ADMIN_TOKEN não configurado.' }, 500);
        const initResp = await api('/instance/init', 'POST', { admintoken: adminToken }, { name: instanceName });
        if (!initResp.ok) {
          return json({ error: `Falha ao criar instância UAZAPI (${initResp.status}).` }, 502);
        }
        token = extractToken(initResp.data);
        if (!token) return json({ error: 'UAZAPI não retornou o token da instância.' }, 502);
        await persist({
          instance_name: instanceName,
          uazapi_token: token,
          uazapi_instance_id: pick(initResp.data, ['instance.id', 'id', 'instanceId']),
          status: 'connecting',
        });
      }

      // 2) Conecta → obtém QR Code / status.
      const connResp = await api('/instance/connect', 'POST', { token: token! });
      if (!connResp.ok) {
        return json({ error: `Falha ao conectar instância UAZAPI (${connResp.status}).` }, 502);
      }
      const qr = extractQr(connResp.data);
      const status = extractStatus(connResp.data) ?? 'connecting';
      await persist({
        status,
        last_qr: qr,
        connected_at: status === 'connected' ? new Date().toISOString() : null,
      });

      return json({ status, connected: status === 'connected', qrcode: qr });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (err) {
    console.error('[RecantoDosAnciaos_whatsapp-instance]', (err as Error).message);
    return json({ error: (err as Error).message ?? 'Erro interno.' }, 500);
  }
});
