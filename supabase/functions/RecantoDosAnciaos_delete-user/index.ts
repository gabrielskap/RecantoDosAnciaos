import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Verifica autenticação do chamador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // 2. Cria cliente com a chave do chamador para verificar permissão
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // 3. Verifica que o chamador é Administrador da mesma empresa
    const { data: callerRow } = await supabaseUser
      .from('Recanto_Usuarios')
      .select('empresa_id, profile:Recanto_Perfis(type)')
      .eq('auth_user_id', caller.id)
      .single();

    const callerProfile = (callerRow?.profile as any);
    if (callerProfile?.type !== 'Administrador') {
      return new Response(JSON.stringify({ error: 'Forbidden: apenas Administradores podem excluir usuários' }), { status: 403, headers: corsHeaders });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) return new Response(JSON.stringify({ error: 'targetUserId obrigatório' }), { status: 400, headers: corsHeaders });

    // 4. Garante que o alvo pertence à mesma empresa
    const { data: targetRow } = await supabaseUser
      .from('Recanto_Usuarios')
      .select('empresa_id, auth_user_id')
      .eq('auth_user_id', targetUserId)
      .single();

    if (!targetRow || targetRow.empresa_id !== callerRow?.empresa_id) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado ou pertence a outra empresa' }), { status: 403, headers: corsHeaders });
    }

    // 5. Usa service_role para operações admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 5a. Desvincula funcionário
    await supabaseAdmin
      .from('Recanto_Funcionarios')
      .update({ auth_user_id: null })
      .eq('auth_user_id', targetUserId);

    // 5b. Remove da tabela de negócio
    await supabaseAdmin
      .from('Recanto_Usuarios')
      .delete()
      .eq('auth_user_id', targetUserId);

    // 5c. Remove do Auth (definitivo — impede login)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError) throw deleteAuthError;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[RecantoDosAnciaos_delete-user]', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
});
