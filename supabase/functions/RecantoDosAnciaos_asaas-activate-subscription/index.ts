// ===========================================================================
// Edge Function: RecantoDosAnciaos_asaas-activate-subscription
// ---------------------------------------------------------------------------
// Ativa o pagamento para usuários já cadastrados (em trial ou pendentes).
// Requer autenticação JWT — o chamador deve estar logado.
// Cria customer + subscription no Asaas para a empresa do usuário autenticado.
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
const RATE_LIMIT_EMAIL = 4;

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
  if (!HCAPTCHA_SECRET) return true;
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
  } catch {
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
    if (!error) {
      row = Object.fromEntries((data ?? []).map((r: any) => [r.chave, r.valor]));
    }
  } catch { /* fallback to env */ }
  const apiKey = (row['ASAAS_API_KEY'] ?? Deno.env.get('ASAAS_API_KEY') ?? '').trim();
  const apiUrl = (row['ASAAS_API_URL'] ?? Deno.env.get('ASAAS_API_URL') ?? 'https://api-sandbox.asaas.com/v3')
    .trim().replace(/\/+$/, '');
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
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'Serviço indisponível no momento.' }, 500, origin);
  }

  // Autenticação obrigatória
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Autenticação necessária.' }, 401, origin);
  }
  const jwt = authHeader.slice(7);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // Valida o JWT usando o cliente autenticado
  const userClient = createClient(SUPABASE_URL, jwt);
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return json({ error: 'Token inválido ou expirado.' }, 401, origin);
  }

  const ip = clientIp(req);

  try {
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'Payload inválido.' }, 400, origin);
    }

    const formaPagamento = String(payload?.formaPagamento ?? '');
    const periodicidade = String(payload?.periodicidade ?? '');
    const planoId = String(payload?.planoId ?? '');

    // CAPTCHA
    const captchaOk = await verifyCaptcha(String(payload?.captchaToken ?? ''), ip);
    if (!captchaOk) {
      return json({ error: 'Falha na verificação de segurança (CAPTCHA).' }, 400, origin);
    }

    // Validações de payload
    if (!['cartao', 'pix', 'boleto'].includes(formaPagamento))
      return json({ error: 'Forma de pagamento inválida.' }, 400, origin);
    if (!['mensal', 'anual'].includes(periodicidade))
      return json({ error: 'Periodicidade inválida.' }, 400, origin);
    if (!planoId)
      return json({ error: 'Plano não informado.' }, 400, origin);

    const customerNome = cleanText(payload?.customer?.name);
    const customerCpfCnpj = onlyDigits(payload?.customer?.cpfCnpj);
    const customerEmail = cleanEmail(payload?.customer?.email) || cleanEmail(user.email);
    const customerPhone = onlyDigits(payload?.customer?.phone);

    if (!customerNome) return json({ error: 'Nome do titular é obrigatório.' }, 400, origin);
    if (customerCpfCnpj.length !== 11 && customerCpfCnpj.length !== 14)
      return json({ error: 'CPF/CNPJ do titular inválido.' }, 400, origin);

    if (formaPagamento === 'cartao') {
      const c = payload?.card;
      if (!c || !c.number || !c.expiryMonth || !c.expiryYear || !c.ccv || !c.holderName)
        return json({ error: 'Dados do cartão incompletos.' }, 400, origin);
    }

    // Busca empresa_id do usuário autenticado
    const { data: usuarioData } = await admin
      .from('Recanto_Usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!usuarioData?.empresa_id) {
      return json({ error: 'Usuário sem empresa associada.' }, 400, origin);
    }
    const empresaId = usuarioData.empresa_id;

    // Verifica empresa tem status pendente
    const { data: empresa } = await admin
      .from('Recanto_Empresas')
      .select('status, nome_instituicao, email_comercial')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (!empresa) return json({ error: 'Empresa não encontrada.' }, 404, origin);
    if (empresa.status === 'ativa') return json({ error: 'Esta empresa já possui uma assinatura ativa.' }, 409, origin);
    if (empresa.status === 'bloqueada') return json({ error: 'Conta bloqueada. Entre em contato com o suporte.' }, 403, origin);

    // Busca assinatura mais recente
    const { data: assinatura } = await admin
      .from('Recanto_Assinaturas')
      .select('id, status, gateway_pagamento, trial_expira_em')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assinatura) return json({ error: 'Nenhuma assinatura encontrada para esta empresa.' }, 404, origin);
    if (!['em_trial', 'pendente', 'vencida'].includes(assinatura.status))
      return json({ error: 'Esta assinatura não pode ser ativada no momento.' }, 409, origin);

    // Rate limit por e-mail
    const adminEmail = cleanEmail(user.email);
    const { data: rl } = await admin.rpc('recanto_registrar_tentativa_checkout', {
      p_ip: ip, p_email: adminEmail, p_cpf_cnpj: customerCpfCnpj,
      p_plano_id: planoId, p_forma: formaPagamento,
    });
    if (rl && (rl.email_count ?? 0) >= RATE_LIMIT_EMAIL) {
      return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, 429, origin);
    }

    // Buscar plano
    const { data: plano, error: planoErr } = await admin
      .from('Recanto_Planos')
      .select('plano_id, plano_nome, preco_mensal, preco_anual_total, ativo, self_service')
      .eq('plano_id', planoId)
      .maybeSingle();

    if (planoErr || !plano) return json({ error: 'Plano não encontrado.' }, 400, origin);
    if (!plano.ativo) return json({ error: 'Plano indisponível.' }, 400, origin);
    if (!plano.self_service) return json({ error: 'Este plano não está disponível online. Fale com o comercial.' }, 400, origin);

    const valor = periodicidade === 'anual' ? Number(plano.preco_anual_total) : Number(plano.preco_mensal);
    if (!valor || valor <= 0) return json({ error: 'Valor do plano indisponível.' }, 400, origin);

    // Asaas
    const asaasCfg = await loadAsaasConfig(admin);
    if (!asaasCfg.apiKey) {
      return json({ error: 'Serviço de pagamento indisponível no momento.' }, 500, origin);
    }
    const asaasFetch = makeAsaasFetch(asaasCfg.apiUrl, asaasCfg.apiKey);

    // Criar customer no Asaas
    const customerResp = await asaasFetch('/customers', 'POST', {
      name: customerNome,
      cpfCnpj: customerCpfCnpj,
      email: customerEmail,
      mobilePhone: customerPhone || undefined,
      externalReference: empresaId,
    });
    if (!customerResp.ok || !customerResp.data?.id) {
      console.error('[asaas-activate] Erro ao criar customer Asaas:', customerResp.status);
      return json({ error: asaasError(customerResp.data) }, 502, origin);
    }
    const customerId = customerResp.data.id as string;

    // Criar subscription no Asaas
    const hoje = new Date();
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
      externalReference: assinatura.id,
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
      console.error('[asaas-activate] Erro ao criar subscription Asaas:', subResp.status);
      return json({ error: asaasError(subResp.data) }, 502, origin);
    }
    const subscriptionId = subResp.data.id as string;

    // Atualiza a assinatura existente com dados do Asaas
    await admin.from('Recanto_Assinaturas').update({
      plano_id: plano.plano_id,
      plano_nome: plano.plano_nome,
      valor_mensal: valor,
      periodicidade,
      gateway_pagamento: 'asaas',
      gateway_customer_id: customerId,
      gateway_subscription_id: subscriptionId,
      forma_pagamento: formaPagamento,
      status: 'pendente',
      trial_expira_em: null,
      checkout_etapa: 'aguardando_pagamento',
      asaas_payload: {
        subscription: {
          id: subResp.data.id, status: subResp.data.status,
          billingType: subResp.data.billingType, cycle: subResp.data.cycle,
          value: subResp.data.value, nextDueDate: subResp.data.nextDueDate,
        },
        customerId,
      },
    }).eq('id', assinatura.id);

    // Buscar primeira cobrança
    const result: Record<string, unknown> = {
      success: true,
      assinaturaId: assinatura.id,
      subscriptionId,
      status: 'pendente',
      formaPagamento,
    };

    const payList = await asaasFetch(`/payments?subscription=${subscriptionId}&limit=1`, 'GET');
    if (payList.ok && Array.isArray(payList.data?.data) && payList.data.data.length > 0) {
      const firstPayment = payList.data.data[0];

      await admin.from('Recanto_Assinaturas').update({
        gateway_payment_id: firstPayment.id,
        asaas_invoice_url: firstPayment.invoiceUrl ?? null,
      }).eq('id', assinatura.id);

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
        assinatura_id: assinatura.id,
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

    await admin.from('Recanto_Logs_Empresa').insert({
      empresa_id: empresaId,
      tipo: 'pagamento_aprovado',
      descricao: `Assinatura ativada pelo usuário — plano ${plano.plano_nome} (${periodicidade}), ${formaPagamento}.`,
      metadata: { plano_id: plano.plano_id, periodicidade, forma_pagamento: formaPagamento, subscription_id: subscriptionId },
    });

    return json(result, 200, origin);
  } catch (err) {
    console.error('[asaas-activate] Erro inesperado:', (err as Error).message);
    return json({ error: 'Erro ao processar o pagamento. Tente novamente.' }, 500, origin);
  }
});
