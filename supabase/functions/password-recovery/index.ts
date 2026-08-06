import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TABLE = 'Recanto_Recuperacao_Senha';
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

async function loadSecrets(admin: any, keys: string[]) {
  const values: Record<string, string> = {};
  const { data } = await admin.from('Recanto_Integracao_Secrets').select('chave, valor').in('chave', keys);
  for (const row of data ?? []) values[row.chave] = String(row.valor ?? '').trim();
  for (const key of keys) values[key] ||= (Deno.env.get(key) ?? '').trim();
  return values;
}

async function hashCode(email: string, code: string, pepper: string) {
  const bytes = new TextEncoder().encode(`${email}:${code}:${pepper}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function createCode() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(100000 + (buffer[0] % 900000));
}

async function sendCode(apiKey: string, from: string, email: string, code: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Código para redefinir sua senha — RecantoCare',
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:520px;margin:auto">
        <h2 style="color:#1d4ed8">RecantoCare</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eff6ff;padding:18px;text-align:center;border-radius:12px">${code}</p>
        <p>O código expira em 10 minutos e só pode ser usado uma vez.</p>
        <p style="color:#64748b;font-size:13px">Se você não solicitou a alteração, ignore este e-mail. Sua senha continuará a mesma.</p>
      </div>`,
    }),
  });

  if (!response.ok) {
    console.error('[password-recovery] Falha no envio:', response.status, (await response.text()).slice(0, 300));
    throw new Error('Não foi possível enviar o e-mail.');
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Serviço não configurado.' }, 500);

  try {
    const body = await req.json();
    const action = String(body?.action ?? '');
    const email = normalizeEmail(body?.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const secrets = await loadSecrets(admin, ['RESEND_API_KEY', 'PASSWORD_RESET_FROM_EMAIL', 'PASSWORD_RESET_CODE_PEPPER']);
    const pepper = secrets.PASSWORD_RESET_CODE_PEPPER;
    if (!pepper) {
      console.error('[password-recovery] PASSWORD_RESET_CODE_PEPPER ausente.');
      return json({ error: 'Recuperação de senha temporariamente indisponível.' }, 503);
    }

    if (action === 'request') {
      const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const [{ count: recentCount }, { count: lastMinute }] = await Promise.all([
        admin.from(TABLE).select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', oneHourAgo),
        admin.from(TABLE).select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', oneMinuteAgo),
      ]);

      if ((lastMinute ?? 0) > 0 || (recentCount ?? 0) >= 5) {
        return json({ error: 'Aguarde antes de solicitar um novo código.' }, 429);
      }

      const { data: profile } = await admin.from('Recanto_Usuarios').select('auth_user_id')
        .ilike('email', email).not('auth_user_id', 'is', null).limit(1).maybeSingle();

      // Não revela se o e-mail está ou não cadastrado.
      if (!profile?.auth_user_id) return json({ ok: true });
      if (!secrets.RESEND_API_KEY || !secrets.PASSWORD_RESET_FROM_EMAIL) {
        console.error('[password-recovery] Configuração do Resend ausente.');
        return json({ error: 'Envio de e-mail temporariamente indisponível.' }, 503);
      }

      const code = createCode();
      const codeHash = await hashCode(email, code, pepper);
      await admin.from(TABLE).update({ consumed_at: new Date().toISOString() }).eq('email', email).is('consumed_at', null);

      const requestedIp = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
      const { error: insertError } = await admin.from(TABLE).insert({
        auth_user_id: profile.auth_user_id,
        email,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        requested_ip: requestedIp,
      });
      if (insertError) throw insertError;

      try {
        await sendCode(secrets.RESEND_API_KEY, secrets.PASSWORD_RESET_FROM_EMAIL, email, code);
      } catch (error) {
        await admin.from(TABLE).update({ consumed_at: new Date().toISOString() }).eq('email', email).eq('code_hash', codeHash);
        throw error;
      }
      return json({ ok: true });
    }

    if (action === 'confirm') {
      const code = String(body?.code ?? '').replace(/\D/g, '');
      const password = String(body?.password ?? '');
      if (code.length !== 6) return json({ error: 'Informe o código de 6 dígitos.' }, 400);
      if (password.length < 8) return json({ error: 'A senha deve ter no mínimo 8 caracteres.' }, 400);

      const { data: recovery } = await admin.from(TABLE).select('*').eq('email', email)
        .is('consumed_at', null).gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (!recovery || recovery.attempts >= MAX_ATTEMPTS) {
        return json({ error: 'Código inválido ou expirado. Solicite um novo.' }, 400);
      }

      await admin.from(TABLE).update({ attempts: recovery.attempts + 1 }).eq('id', recovery.id);
      const candidateHash = await hashCode(email, code, pepper);
      if (candidateHash !== recovery.code_hash) {
        if (recovery.attempts + 1 >= MAX_ATTEMPTS) {
          await admin.from(TABLE).update({ consumed_at: new Date().toISOString() }).eq('id', recovery.id);
        }
        return json({ error: 'Código inválido ou expirado. Solicite um novo.' }, 400);
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(recovery.auth_user_id, { password });
      if (updateError) throw updateError;
      await admin.from(TABLE).update({ consumed_at: new Date().toISOString() }).eq('id', recovery.id);
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    console.error('[password-recovery]', error instanceof Error ? error.message : error);
    return json({ error: 'Não foi possível concluir a recuperação. Tente novamente.' }, 500);
  }
});
