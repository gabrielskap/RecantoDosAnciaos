// ===========================================================================
// Edge Function: RecantoDosAnciaos_asaas-create-subscription
// ---------------------------------------------------------------------------
// Checkout público da assinatura SaaS. Cria empresa + assinatura + usuário admin
// (status pendente) e a cobrança real no Asaas (cartão / PIX / boleto).
//
// Suporta payLater=true para criar conta com trial de 7 dias sem pagamento.
// Suporta rascunhoToken para carregar dados salvos progressivamente no checkout.
//
// Segurança:
//   - Apenas POST; responde OPTIONS (CORS).
//   - Valida Origin contra allowlist (CHECKOUT_ALLOWED_ORIGINS).
//   - Verifica CAPTCHA (hCaptcha) quando HCAPTCHA_SECRET estiver definido.
//   - Rate limit por IP / e-mail / CPF-CNPJ (Recanto_Checkout_Tentativas).
//   - O VALOR FINAL é calculado no servidor a partir de Recanto_Planos.
//   - Plano enterprise (self_service=false) é rejeitado.
//   - Cartão e CVV trafegam apenas browser → função → Asaas. NUNCA são salvos
//     no banco nem registrados em log.
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Constantes ────────────────────────────────────────────────────────────
const SECRETS_TABLE = 'Recanto_Integracao_Secrets';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const HCAPTCHA_SECRET = Deno.env.get('HCAPTCHA_SECRET') ?? '';
const ALLOWED_ORIGINS = (Deno.env.get('CHECKOUT_ALLOWED_ORIGINS') ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

const ASAAS_TIMEOUT_MS = 20000;

const RATE_LIMIT_IP = 8;
const RATE_LIMIT_EMAIL = 4;
const RATE_LIMIT_CPF_CNPJ = 4;

const MODULES = [
  'DASHBOARD', 'RESIDENTS', 'RESIDENT_DETAIL', 'AGENDA', 'NUTRITION', 'TEAM',
  'FINANCE', 'STOCK', 'REPORTS', 'USERS', 'ROOMS', 'SETTINGS',
];

const BILLING_TYPE: Record<string, string> = {
  cartao: 'CREDIT_CARD',
  pix: 'PIX',
  boleto: 'BOLETO',
};

const CYCLE: Record<string, string> = {
  mensal: 'MONTHLY',
  anual: 'YEARLY',
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const onlyDigits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const cleanText = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, ' ');
const cleanEmail = (s: unknown) => String(s ?? '').trim().toLowerCase();
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function corsHeaders(origin: string | null): Record<string, string> {
  let allow = '*';
  if (ALLOWED_ORIGINS.length > 0) {
    allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  } else if (origin) {
    allow = origin;
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function originAllowed(origin: string | null): boolean {
  if (ALLOWED_ORIGINS.length === 0) return true;
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function verifyCaptcha(token: string, ip: string | null): Promise<boolean> {
  if (!HCAPTCHA_SECRET) {
    console.warn('[asaas-create] HCAPTCHA_SECRET não definido — verificação de CAPTCHA ignorada.');
    return true;
  }
  if (!token) return false;
  try {
    const params = new URLSearchParams();
    params.set('secret', HCAPTCHA_SECRET);
    params.set('response', token);
    if (ip) params.set('remoteip', ip);
    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    return data?.success === true;
  } catch (err) {
    console.error('[asaas-create] Erro ao verificar CAPTCHA:', (err as Error).message);
    return false;
  }
}

async function loadAsaasConfig(admin: any): Promise<{ apiUrl: string; apiKey: string }> {
  let row: Record<string, string> = {};
  try {
    const { data, error } = await admin
      .from(SECRETS_TABLE)
      .select('chave, valor')
      .in('chave', ['ASAAS_API_KEY', 'ASAAS_API_URL']);
    if (error) {
      console.error('[asaas-create] Falha ao ler segredos do banco (PostgREST):', JSON.stringify({
        code: error.code, message: error.message, details: error.details, hint: error.hint,
      }));
    } else {
      row = Object.fromEntries((data ?? []).map((r: any) => [r.chave, r.valor]));
      console.log(`[asaas-create] Segredos lidos da tabela: [${Object.keys(row).join(', ') || 'nenhum'}].`);
    }
  } catch (err) {
    console.error('[asaas-create] Erro de conexão ao ler segredos do banco:', (err as Error).message);
  }
  const apiKey = (row['ASAAS_API_KEY'] ?? Deno.env.get('ASAAS_API_KEY') ?? '').trim();
  const apiUrl = (row['ASAAS_API_URL'] ?? Deno.env.get('ASAAS_API_URL') ?? 'https://api-sandbox.asaas.com/v3')
    .trim().replace(/\/+$/, '');
  const origem = row['ASAAS_API_KEY'] ? 'tabela' : (Deno.env.get('ASAAS_API_KEY') ? 'env' : 'nenhuma');
  console.log(`[asaas-create] Config Asaas: apiKey=${apiKey ? 'presente' : 'AUSENTE'} (origem: ${origem}), apiUrl=${apiUrl}.`);
  return { apiUrl, apiKey };
}

function makeAsaasFetch(apiUrl: string, apiKey: string) {
  return async (path: string, method: string, body?: unknown) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ASAAS_TIMEOUT_MS);
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey,
          'User-Agent': 'RecantoCare-Checkout',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timeout);
    }
  };
}

function asaasError(data: any): string {
  const first = data?.errors?.[0];
  return first?.description || data?.message || 'Falha na comunicação com o gateway de pagamento.';
}

// ─── Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405, origin);
  }
  if (!originAllowed(origin)) {
    return json({ error: 'Origem não autorizada.' }, 403, origin);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[asaas-create] Variáveis de ambiente do Supabase ausentes.');
    return json({ error: 'Serviço de pagamento indisponível no momento.' }, 500, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const ip = clientIp(req);

  // Carrega os segredos do Asaas apenas quando necessário (não-payLater)
  // Para evitar latência desnecessária no caminho do trial, carregamos após checar payLater.

  // Estado para rollback
  let empresaId: string | null = null;
  let assinaturaId: string | null = null;
  let authUserId: string | null = null;

  const rollback = async (motivo: string) => {
    try {
      if (assinaturaId) {
        await admin.from('Recanto_Assinaturas').update({
          status: 'erro_checkout',
          checkout_etapa: 'erro_checkout',
          motivo_cancelamento: motivo.slice(0, 280),
        }).eq('id', assinaturaId);
      }
      if (empresaId) {
        await admin.from('Recanto_Empresas').update({ status: 'cancelada' }).eq('empresa_id', empresaId);
      }
      if (authUserId) {
        try { await admin.from('Recanto_Usuarios').delete().eq('auth_user_id', authUserId); } catch { /* noop */ }
        try { await admin.auth.admin.deleteUser(authUserId); } catch { /* noop */ }
      }
    } catch (err) {
      console.error('[asaas-create] Falha no rollback:', (err as Error).message);
    }
  };

  try {
    // 1. Parse do payload
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'Payload inválido.' }, 400, origin);
    }

    const payLater = payload?.payLater === true;
    const rascunhoToken = String(payload?.rascunhoToken ?? '').trim();

    // Carrega dados do rascunho quando token fornecido
    let rascunho: any = null;
    if (rascunhoToken) {
      const { data: rd } = await admin
        .from('Recanto_Checkout_Rascunhos')
        .select('dados_empresa, dados_admin, dados_plano')
        .eq('rascunho_token', rascunhoToken)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      rascunho = rd;
    }

    // planoId e periodicidade: payload > rascunho
    const formaPagamento = String(payload?.formaPagamento ?? '');
    const periodicidade = String(
      payload?.periodicidade ?? rascunho?.dados_plano?.periodicidade ?? ''
    );
    const planoId = String(
      payload?.planoId ?? rascunho?.dados_plano?.planoId ?? ''
    );

    // 2. CAPTCHA
    const captchaOk = await verifyCaptcha(String(payload?.captchaToken ?? ''), ip);
    if (!captchaOk) {
      await admin.from('Recanto_Checkout_Tentativas').insert({
        ip, email: cleanEmail(payload?.admin?.email ?? rascunho?.dados_admin?.emailAdmin),
        cpf_cnpj: onlyDigits(payload?.customer?.cpfCnpj),
        plano_id: planoId, forma_pagamento: formaPagamento || 'trial', status: 'captcha_falha',
      });
      return json({ error: 'Falha na verificação de segurança (CAPTCHA). Recarregue e tente novamente.' }, 400, origin);
    }

    // 3. Extrai dados — payload direto tem prioridade, rascunho é fallback
    const empData = rascunho?.dados_empresa ?? {};
    const admData = rascunho?.dados_admin ?? {};

    const empresaNome = cleanText(payload?.empresa?.nome ?? empData.nomeInstituicao);
    const empresaEmail = cleanEmail(payload?.empresa?.email ?? empData.emailComercial);
    const empresaCnpj = onlyDigits(payload?.empresa?.cnpj ?? empData.cnpj);
    const empresaTelefone = onlyDigits(payload?.empresa?.telefone ?? empData.telefoneEmpresa);

    const adminNome = cleanText(payload?.admin?.nome ?? admData.nomeAdmin);
    const adminEmail = cleanEmail(payload?.admin?.email ?? admData.emailAdmin);
    const adminTelefone = onlyDigits(payload?.admin?.telefone ?? admData.telefoneAdmin);
    const adminSenha = String(payload?.senha ?? payload?.admin?.senha ?? '');

    const customerNome = cleanText(payload?.customer?.name);
    const customerCpfCnpj = onlyDigits(payload?.customer?.cpfCnpj);
    const customerEmail = cleanEmail(payload?.customer?.email) || adminEmail;
    const customerPhone = onlyDigits(payload?.customer?.phone) || adminTelefone || empresaTelefone;

    // 4. Validações (payment fields só validados quando !payLater)
    if (!['mensal', 'anual'].includes(periodicidade))
      return json({ error: 'Periodicidade inválida.' }, 400, origin);
    if (!planoId)
      return json({ error: 'Plano não informado.' }, 400, origin);
    if (!empresaNome) return json({ error: 'Nome da empresa é obrigatório.' }, 400, origin);
    if (!adminNome) return json({ error: 'Nome do responsável é obrigatório.' }, 400, origin);
    if (!isEmail(adminEmail)) return json({ error: 'E-mail do responsável inválido.' }, 400, origin);
    if (adminSenha.length < 8) return json({ error: 'A senha deve ter ao menos 8 caracteres.' }, 400, origin);

    if (!payLater) {
      if (!['cartao', 'pix', 'boleto'].includes(formaPagamento))
        return json({ error: 'Forma de pagamento inválida.' }, 400, origin);
      if (!customerNome) return json({ error: 'Nome do titular é obrigatório.' }, 400, origin);
      if (customerCpfCnpj.length !== 11 && customerCpfCnpj.length !== 14)
        return json({ error: 'CPF/CNPJ do titular inválido.' }, 400, origin);
      if (formaPagamento === 'cartao') {
        const c = payload?.card;
        if (!c || !c.number || !c.expiryMonth || !c.expiryYear || !c.ccv || !c.holderName)
          return json({ error: 'Dados do cartão incompletos.' }, 400, origin);
      }
    }

    // 5. Rate limit
    const { data: rl } = await admin.rpc('recanto_registrar_tentativa_checkout', {
      p_ip: ip, p_email: adminEmail, p_cpf_cnpj: customerCpfCnpj || '00000000000',
      p_plano_id: planoId, p_forma: formaPagamento || 'trial',
    });
    if (rl && (
      (rl.ip_count ?? 0) >= RATE_LIMIT_IP ||
      (rl.email_count ?? 0) >= RATE_LIMIT_EMAIL ||
      (!payLater && (rl.cpf_cnpj_count ?? 0) >= RATE_LIMIT_CPF_CNPJ)
    )) {
      return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, 429, origin);
    }

    // 6. Buscar plano em Recanto_Planos (fonte oficial do preço)
    const { data: plano, error: planoErr } = await admin
      .from('Recanto_Planos')
      .select('plano_id, plano_nome, preco_mensal, preco_anual_total, ativo, self_service')
      .eq('plano_id', planoId)
      .maybeSingle();

    if (planoErr || !plano)
      return json({ error: 'Plano não encontrado.' }, 400, origin);
    if (!plano.ativo)
      return json({ error: 'Plano indisponível.' }, 400, origin);
    if (!plano.self_service)
      return json({ error: 'Este plano não está disponível para contratação online. Fale com o nosso time comercial.' }, 400, origin);

    // 7. Calcular valor no servidor (necessário apenas para assinaturas pagas)
    const valor = periodicidade === 'anual' ? Number(plano.preco_anual_total) : Number(plano.preco_mensal);
    if (!payLater && (!valor || valor <= 0))
      return json({ error: 'Valor do plano indisponível. Fale com o comercial.' }, 400, origin);

    // 8. Dedupe por CNPJ
    if (empresaCnpj) {
      const { data: empExistente } = await admin
        .from('Recanto_Empresas')
        .select('empresa_id')
        .eq('cnpj', empresaCnpj)
        .maybeSingle();
      if (empExistente) {
        const { data: assEx } = await admin
          .from('Recanto_Assinaturas')
          .select('status, checkout_expira_em, gateway_pagamento')
          .eq('empresa_id', empExistente.empresa_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (assEx?.status === 'ativa')
          return json({ error: 'Já existe uma assinatura ativa para este CNPJ.' }, 409, origin);
        if (assEx?.status === 'em_trial')
          return json({ error: 'Já existe uma conta em período de teste para este CNPJ.' }, 409, origin);
        if (assEx?.status === 'pendente' &&
            (!assEx.checkout_expira_em || new Date(assEx.checkout_expira_em) > new Date()))
          return json({ error: 'Há um checkout pendente para este CNPJ. Conclua o pagamento já iniciado ou aguarde a expiração.' }, 409, origin);
      }
    }

    // 9. Dedupe por e-mail do admin
    const { data: userExistente } = await admin
      .from('Recanto_Usuarios')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle();
    if (userExistente)
      return json({ error: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' }, 409, origin);

    // 10. Criar empresa
    const hoje = new Date();
    empresaId = `emp_${ymd(hoje).replace(/-/g, '')}_${crypto.randomUUID().slice(0, 8)}`;

    const { error: empErr } = await admin.from('Recanto_Empresas').insert({
      empresa_id: empresaId,
      nome_instituicao: empresaNome,
      cnpj: empresaCnpj || null,
      telefone: empresaTelefone || null,
      email_comercial: empresaEmail || adminEmail,
      status: 'pendente',
    });
    if (empErr) {
      console.error('[asaas-create] Erro ao criar empresa:', empErr.message);
      empresaId = null;
      return json({ error: 'Não foi possível registrar a empresa.' }, 500, origin);
    }

    // 11. Criar assinatura local
    const trialExpiraEm = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const checkoutExpira = new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000);

    const assinaturaInsert: Record<string, unknown> = {
      empresa_id: empresaId,
      plano_id: plano.plano_id,
      plano_nome: plano.plano_nome,
      valor_mensal: valor || Number(plano.preco_mensal),
      periodicidade,
      data_inicio: ymd(hoje),
      checkout_etapa: 'empresa_criada',
    };

    if (payLater) {
      assinaturaInsert.gateway_pagamento = 'trial';
      assinaturaInsert.status = 'em_trial';
      assinaturaInsert.trial_expira_em = trialExpiraEm.toISOString();
    } else {
      assinaturaInsert.gateway_pagamento = 'asaas';
      assinaturaInsert.forma_pagamento = formaPagamento;
      assinaturaInsert.status = 'pendente';
      assinaturaInsert.checkout_expira_em = checkoutExpira.toISOString();
    }

    const { data: assData, error: assErr } = await admin.from('Recanto_Assinaturas')
      .insert(assinaturaInsert)
      .select('id')
      .single();

    if (assErr || !assData) {
      console.error('[asaas-create] Erro ao criar assinatura:', assErr?.message);
      await rollback('Falha ao criar assinatura local.');
      return json({ error: 'Não foi possível registrar a assinatura.' }, 500, origin);
    }
    assinaturaId = assData.id;

    // 12. Criar usuário admin no Supabase Auth
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminSenha,
      email_confirm: true,
      user_metadata: {
        name: adminNome,
        company_name: empresaNome,
        empresa_id: empresaId,
        profile_type: 'Administrador',
        celular: adminTelefone || null,
      },
    });
    if (createErr || !created?.user) {
      console.error('[asaas-create] Erro ao criar usuário admin:', createErr?.message);
      await rollback('Falha ao criar usuário administrador.');
      const msg = createErr?.message?.includes('already')
        ? 'Este e-mail já está cadastrado.'
        : 'Não foi possível criar o usuário administrador.';
      return json({ error: msg }, 409, origin);
    }
    authUserId = created.user.id;
    await admin.from('Recanto_Assinaturas').update({ checkout_etapa: 'usuario_criado' }).eq('id', assinaturaId);

    // 13. Garantir perfil Administrador + permissões + Recanto_Usuarios
    let profileId: string | null = null;
    const { data: perfilExistente } = await admin
      .from('Recanto_Perfis')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('type', 'Administrador')
      .maybeSingle();

    if (perfilExistente) {
      profileId = perfilExistente.id;
    } else {
      const { data: novoPerfil, error: perfilErr } = await admin
        .from('Recanto_Perfis')
        .insert({ name: 'Administrador', type: 'Administrador', is_editable: false, empresa_id: empresaId })
        .select('id')
        .single();
      if (perfilErr || !novoPerfil) {
        console.error('[asaas-create] Erro ao criar perfil:', perfilErr?.message);
        await rollback('Falha ao criar perfil administrador.');
        return json({ error: 'Não foi possível configurar o acesso do administrador.' }, 500, origin);
      }
      profileId = novoPerfil.id;
      await admin.from('Recanto_Permissoes').insert(
        MODULES.map((module) => ({ profile_id: profileId, module, actions: ['view', 'edit', 'create', 'delete'] })),
      );
    }

    await admin.from('Recanto_Usuarios').upsert({
      auth_user_id: authUserId,
      name: adminNome,
      email: adminEmail,
      profile_id: profileId,
      empresa_id: empresaId,
      celular: adminTelefone || null,
    }, { onConflict: 'auth_user_id' });

    // Marca rascunho como convertido (se houver)
    if (rascunhoToken) {
      try {
        await admin.from('Recanto_Checkout_Rascunhos')
          .update({ expires_at: new Date(0).toISOString() })
          .eq('rascunho_token', rascunhoToken);
      } catch { /* noop */ }
    }

    // ── Trial: retorna sem chamar Asaas ────────────────────────────────────
    if (payLater) {
      await admin.from('Recanto_Assinaturas').update({ checkout_etapa: 'trial_iniciado' }).eq('id', assinaturaId);
      await admin.from('Recanto_Logs_Empresa').insert({
        empresa_id: empresaId,
        tipo: 'empresa_criada',
        descricao: `Conta criada em período de trial — plano ${plano.plano_nome} (${periodicidade}). Trial expira em ${ymd(trialExpiraEm)}.`,
        metadata: { plano_id: plano.plano_id, periodicidade, gateway: 'trial', trial_expira_em: trialExpiraEm.toISOString() },
      });

      return json({
        success: true,
        assinaturaId,
        status: 'em_trial',
        trialExpiraEm: trialExpiraEm.toISOString(),
      }, 200, origin);
    }

    // ── Pagamento imediato: cria customer + subscription no Asaas ──────────
    const asaasCfg = await loadAsaasConfig(admin);
    if (!asaasCfg.apiKey) {
      console.error('[asaas-create] ASAAS_API_KEY ausente (tabela de segredos e env).');
      await rollback('ASAAS_API_KEY ausente.');
      return json({ error: 'Serviço de pagamento indisponível no momento.' }, 500, origin);
    }
    const asaasFetch = makeAsaasFetch(asaasCfg.apiUrl, asaasCfg.apiKey);

    // 14. Criar customer no Asaas
    const customerResp = await asaasFetch('/customers', 'POST', {
      name: customerNome,
      cpfCnpj: customerCpfCnpj,
      email: customerEmail,
      mobilePhone: customerPhone || undefined,
      externalReference: empresaId,
    });
    if (!customerResp.ok || !customerResp.data?.id) {
      console.error('[asaas-create] Erro ao criar customer Asaas:', customerResp.status);
      await rollback('Falha ao criar cliente no gateway.');
      return json({ error: asaasError(customerResp.data) }, 502, origin);
    }
    const customerId = customerResp.data.id as string;
    await admin.from('Recanto_Assinaturas').update({
      gateway_customer_id: customerId,
      checkout_etapa: 'asaas_customer_criado',
    }).eq('id', assinaturaId);

    // 15. Criar subscription no Asaas
    const nextDue = formaPagamento === 'boleto'
      ? new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000)
      : hoje;

    const subBody: Record<string, unknown> = {
      customer: customerId,
      billingType: BILLING_TYPE[formaPagamento],
      value: valor,
      cycle: CYCLE[periodicidade],
      nextDueDate: ymd(nextDue),
      description: `Assinatura RecantoCare — ${plano.plano_nome} (${periodicidade})`,
      externalReference: assinaturaId,
    };

    if (formaPagamento === 'cartao') {
      const c = payload.card;
      subBody.creditCard = {
        holderName: cleanText(c.holderName),
        number: onlyDigits(c.number),
        expiryMonth: String(c.expiryMonth).padStart(2, '0'),
        expiryYear: String(c.expiryYear),
        ccv: onlyDigits(c.ccv),
      };
      subBody.creditCardHolderInfo = {
        name: cleanText(c.holderInfo?.name) || customerNome,
        email: cleanEmail(c.holderInfo?.email) || customerEmail,
        cpfCnpj: onlyDigits(c.holderInfo?.cpfCnpj) || customerCpfCnpj,
        postalCode: onlyDigits(c.holderInfo?.postalCode),
        addressNumber: cleanText(c.holderInfo?.addressNumber) || 'S/N',
        phone: onlyDigits(c.holderInfo?.phone) || customerPhone || undefined,
      };
      subBody.remoteIp = ip || undefined;
    }

    const subResp = await asaasFetch('/subscriptions', 'POST', subBody);
    if (!subResp.ok || !subResp.data?.id) {
      console.error('[asaas-create] Erro ao criar subscription Asaas:', subResp.status);
      await rollback(`Falha ao criar assinatura no gateway. customer=${customerId}`);
      return json({ error: asaasError(subResp.data) }, 502, origin);
    }
    const subscriptionId = subResp.data.id as string;

    const safePayload = {
      subscription: {
        id: subResp.data.id,
        status: subResp.data.status,
        billingType: subResp.data.billingType,
        cycle: subResp.data.cycle,
        value: subResp.data.value,
        nextDueDate: subResp.data.nextDueDate,
      },
      customerId,
    };

    await admin.from('Recanto_Assinaturas').update({
      gateway_subscription_id: subscriptionId,
      asaas_payload: safePayload,
      checkout_etapa: 'asaas_subscription_criada',
    }).eq('id', assinaturaId);

    // 16. Buscar primeira cobrança (PIX/boleto/cartão) p/ payment id + URLs
    let firstPayment: any = null;
    const payList = await asaasFetch(`/payments?subscription=${subscriptionId}&limit=1`, 'GET');
    if (payList.ok && Array.isArray(payList.data?.data) && payList.data.data.length > 0) {
      firstPayment = payList.data.data[0];
    }

    const result: Record<string, unknown> = {
      success: true,
      assinaturaId,
      subscriptionId,
      status: 'pendente',
      formaPagamento,
    };

    if (firstPayment) {
      await admin.from('Recanto_Assinaturas').update({
        gateway_payment_id: firstPayment.id,
        asaas_invoice_url: firstPayment.invoiceUrl ?? null,
      }).eq('id', assinaturaId);

      let pixPayloadStr: string | null = null;
      if (formaPagamento === 'pix') {
        const qr = await asaasFetch(`/payments/${firstPayment.id}/pixQrCode`, 'GET');
        if (qr.ok && qr.data?.payload) {
          pixPayloadStr = qr.data.payload;
          result.pix = { encodedImage: qr.data.encodedImage, payload: qr.data.payload };
        }
      } else if (formaPagamento === 'boleto') {
        result.boleto = {
          invoiceUrl: firstPayment.invoiceUrl ?? undefined,
          bankSlipUrl: firstPayment.bankSlipUrl ?? undefined,
        };
      }

      await admin.from('Recanto_Assinatura_Pagamentos').upsert({
        empresa_id: empresaId,
        assinatura_id: assinaturaId,
        asaas_payment_id: firstPayment.id,
        asaas_subscription_id: subscriptionId,
        valor: firstPayment.value ?? valor,
        status: firstPayment.status ?? null,
        billing_type: firstPayment.billingType ?? BILLING_TYPE[formaPagamento],
        vencimento: firstPayment.dueDate ?? ymd(nextDue),
        invoice_url: firstPayment.invoiceUrl ?? null,
        bank_slip_url: firstPayment.bankSlipUrl ?? null,
        pix_payload: pixPayloadStr,
      }, { onConflict: 'asaas_payment_id' });
    }

    await admin.from('Recanto_Assinaturas').update({ checkout_etapa: 'aguardando_pagamento' }).eq('id', assinaturaId);

    await admin.from('Recanto_Logs_Empresa').insert({
      empresa_id: empresaId,
      tipo: 'empresa_criada',
      descricao: `Checkout iniciado — plano ${plano.plano_nome} (${periodicidade}), ${formaPagamento}. Aguardando pagamento.`,
      metadata: {
        plano_id: plano.plano_id, periodicidade, forma_pagamento: formaPagamento,
        gateway: 'asaas', subscription_id: subscriptionId,
      },
    });

    return json(result, 200, origin);
  } catch (err) {
    console.error('[asaas-create] Erro inesperado:', (err as Error).message);
    await rollback(`Erro inesperado: ${(err as Error).message}`);
    return json({ error: 'Erro ao processar o checkout. Tente novamente.' }, 500, origin);
  }
});
