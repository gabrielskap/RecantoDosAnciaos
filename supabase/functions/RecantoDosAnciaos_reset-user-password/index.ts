import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Serviço não configurado.' }, 500);
    if (!authHeader) return json({ error: 'Não autorizado.' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Sessão inválida.' }, 401);

    const { data: callerRow } = await userClient.from('Recanto_Usuarios')
      .select('empresa_id, profile:Recanto_Perfis(type)')
      .eq('auth_user_id', caller.id)
      .single();
    const callerProfile = callerRow?.profile as any;
    if (callerProfile?.type !== 'Administrador') {
      return json({ error: 'Apenas administradores podem redefinir senhas.' }, 403);
    }

    const { targetUserId, newPassword } = await req.json();
    if (!targetUserId || typeof targetUserId !== 'string') return json({ error: 'Usuário inválido.' }, 400);
    if (targetUserId === caller.id) return json({ error: 'Use seu perfil para alterar a própria senha.' }, 400);
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return json({ error: 'A senha deve ter no mínimo 8 caracteres.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: targetRow } = await admin.from('Recanto_Usuarios')
      .select('empresa_id')
      .eq('auth_user_id', targetUserId)
      .maybeSingle();
    if (!targetRow || targetRow.empresa_id !== callerRow?.empresa_id) {
      return json({ error: 'Usuário não encontrado ou pertence a outra empresa.' }, 403);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });
    if (updateError) throw updateError;

    return json({ ok: true });
  } catch (error) {
    console.error('[RecantoDosAnciaos_reset-user-password]', error);
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500);
  }
});
