import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Verifica que o chamador é Administrador
    const { data: callerRow } = await supabaseUser
      .from('Recanto_Usuarios')
      .select('empresa_id, profile:Recanto_Perfis(type)')
      .eq('auth_user_id', caller.id)
      .single();

    const callerProfile = (callerRow?.profile as any);
    if (callerProfile?.type !== 'Administrador') {
      return new Response(JSON.stringify({ error: 'Forbidden: apenas Administradores podem alterar e-mails' }), { status: 403, headers: corsHeaders });
    }

    const { targetUserId, newEmail } = await req.json();
    if (!targetUserId || !newEmail) {
      return new Response(JSON.stringify({ error: 'targetUserId e newEmail são obrigatórios' }), { status: 400, headers: corsHeaders });
    }

    // Valida formato de e-mail básico
    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      return new Response(JSON.stringify({ error: 'E-mail inválido' }), { status: 400, headers: corsHeaders });
    }

    // Garante que o alvo pertence à mesma empresa
    const { data: targetRow } = await supabaseUser
      .from('Recanto_Usuarios')
      .select('empresa_id')
      .eq('auth_user_id', targetUserId)
      .single();

    if (!targetRow || targetRow.empresa_id !== callerRow?.empresa_id) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado ou pertence a outra empresa' }), { status: 403, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Atualiza em auth.users
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { email: newEmail });
    if (authUpdateError) throw authUpdateError;

    // Atualiza na tabela de negócio
    await supabaseAdmin
      .from('Recanto_Usuarios')
      .update({ email: newEmail })
      .eq('auth_user_id', targetUserId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[update-user-email]', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
});
