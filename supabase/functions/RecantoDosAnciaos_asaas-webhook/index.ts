// ===========================================================================
// Edge Function: RecantoDosAnciaos_asaas-webhook
// ---------------------------------------------------------------------------
// Recebe os eventos de cobrança do Asaas e sincroniza o status da assinatura/
// empresa. O webhook é a ÚNICA origem autorizada a ativar empresa e assinatura.
//
// Segurança / robustez:
//   - Apenas POST; valida o header `asaas-access-token` contra ASAAS_WEBHOOK_TOKEN.
//   - Persiste o payload bruto em Recanto_Asaas_Eventos (auditoria/reprocesso).
//   - Idempotente: captura atômica via recanto_claim_asaas_event (anti-duplicação,
//     inclusive em concorrência).
//   - Só marca o evento como 'processado' após concluir todas as atualizações.
//   - Retorna 200 para eventos já processados/ignorados; 500 para erro recuperável.
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// O token do webhook vive na tabela Recanto_Integracao_Secrets (fallback: env).
const SECRETS_TABLE = 'Recanto_Integracao_Secrets';
async function loadWebhookToken(admin: any): Promise<string> {
  try {
    const { data } = await admin
      .from(SECRETS_TABLE)
      .select('valor')
      .eq('chave', 'ASAAS_WEBHOOK_TOKEN')
      .maybeSingle();
    if (data?.valor) return String(data.valor).trim();
  } catch (err) {
    console.error('[RecantoDosAnciaos_asaas-webhook] Erro ao ler token do banco:', (err as Error).message);
  }
  return (Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '').trim();
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Eventos que confirmam recebimento do pagamento → ativam a empresa/assinatura.
function addInterval(from: Date, periodicidade: string): string {
  const d = new Date(from.getTime());
  if (periodicidade === 'anual') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return ok({ error: 'Método não permitido.' }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[RecantoDosAnciaos_asaas-webhook] Variáveis de ambiente do Supabase ausentes.');
    return ok({ error: 'Configuração ausente.' }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Validação do token do webhook (carregado da tabela de segredos)
  const webhookToken = await loadWebhookToken(admin);
  const token = req.headers.get('asaas-access-token');
  if (!webhookToken || token !== webhookToken) {
    return ok({ error: 'Unauthorized' }, 401);
  }

  // 2. Parse + exigências mínimas do payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return ok({ error: 'Payload inválido.' }, 400);
  }

  const eventId: string | undefined = body?.id;
  const eventType: string | undefined = body?.event;
  const payment = body?.payment;

  if (!eventId || !eventType) {
    return ok({ error: 'Evento sem id/event.' }, 400);
  }

  // 3. Persiste o evento bruto (idempotente por asaas_event_id)
  await admin.from('Recanto_Asaas_Eventos').insert({
    asaas_event_id: eventId,
    event_type: eventType,
    payment_id: payment?.id ?? null,
    subscription_id: payment?.subscription ?? null,
    payload: body,
    status_processamento: 'recebido',
  }).then(() => {}, () => {}); // on conflict (unique) ignorado silenciosamente

  const markErro = (msg: string) =>
    admin.from('Recanto_Asaas_Eventos').update({
      status_processamento: 'erro', erro: msg.slice(0, 500),
    }).eq('asaas_event_id', eventId);

  const markIgnorado = (msg?: string) =>
    admin.from('Recanto_Asaas_Eventos').update({
      status_processamento: 'ignorado', erro: msg?.slice(0, 500) ?? null,
      processado_em: new Date().toISOString(),
    }).eq('asaas_event_id', eventId);

  const markProcessado = () =>
    admin.from('Recanto_Asaas_Eventos').update({
      status_processamento: 'processado', processado_em: new Date().toISOString(),
    }).eq('asaas_event_id', eventId);

  // 4. Captura atômica — garante processamento único mesmo em concorrência
  const { data: claimed, error: claimErr } = await admin.rpc('recanto_claim_asaas_event', {
    p_asaas_event_id: eventId,
  });
  if (claimErr) {
    console.error('[RecantoDosAnciaos_asaas-webhook] Erro no claim:', claimErr.message);
    return ok({ error: 'Erro ao processar evento.' }, 500);
  }
  if (!claimed || !claimed.id) {
    // Outro processo já assumiu/concluiu, ou já estava processado/ignorado.
    return ok({ received: true, duplicate: true }, 200);
  }

  try {
    // 5. Eventos desconhecidos (sem cobrança) → ignorado + 200
    if (!payment || !payment.id) {
      await markIgnorado('Evento sem objeto de cobrança.');
      return ok({ received: true, ignored: true }, 200);
    }

    // 6. Localiza a assinatura (subscription → payment → externalReference)
    let assinatura: any = null;
    if (payment.subscription) {
      const { data } = await admin.from('Recanto_Assinaturas')
        .select('id, empresa_id, periodicidade, status, ativada_em')
        .eq('gateway_subscription_id', payment.subscription).maybeSingle();
      assinatura = data;
    }
    if (!assinatura && payment.id) {
      const { data } = await admin.from('Recanto_Assinaturas')
        .select('id, empresa_id, periodicidade, status, ativada_em')
        .eq('gateway_payment_id', payment.id).maybeSingle();
      assinatura = data;
    }
    if (!assinatura && payment.externalReference) {
      const { data } = await admin.from('Recanto_Assinaturas')
        .select('id, empresa_id, periodicidade, status, ativada_em')
        .eq('id', payment.externalReference).maybeSingle();
      assinatura = data;
    }

    if (!assinatura) {
      // Cobrança não pertence a uma assinatura criada pelo sistema → ignorar.
      await markIgnorado(`Assinatura não encontrada para payment=${payment.id}.`);
      return ok({ received: true, ignored: true }, 200);
    }

    const now = new Date();
    const logEmpresa = (tipo: string, descricao: string, statusPag: string) =>
      admin.from('Recanto_Logs_Empresa').insert({
        empresa_id: assinatura.empresa_id, tipo, descricao,
        metadata: {
          gateway: 'asaas', event: eventType,
          payment_id: payment.id, subscription_id: payment.subscription ?? null,
          status_pagamento: statusPag,
        },
      });

    // Upsert idempotente da cobrança no histórico.
    const upsertPagamento = (statusInterno: string, extra: Record<string, unknown> = {}) =>
      admin.from('Recanto_Assinatura_Pagamentos').upsert({
        empresa_id: assinatura.empresa_id,
        assinatura_id: assinatura.id,
        asaas_payment_id: payment.id,
        asaas_subscription_id: payment.subscription ?? null,
        valor: payment.value ?? null,
        status: statusInterno,
        billing_type: payment.billingType ?? null,
        vencimento: payment.dueDate ?? null,
        invoice_url: payment.invoiceUrl ?? null,
        bank_slip_url: payment.bankSlipUrl ?? null,
        payload: payment,
        ...extra,
      }, { onConflict: 'asaas_payment_id' });

    const ativar = async () => {
      const vencimento = addInterval(now, assinatura.periodicidade || 'mensal');
      await admin.from('Recanto_Assinaturas').update({
        status: 'ativa',
        ativada_em: assinatura.ativada_em ?? now.toISOString(),
        data_vencimento: vencimento,
        gateway_payment_id: payment.id,
        checkout_etapa: 'ativo',
      }).eq('id', assinatura.id);
      await admin.from('Recanto_Empresas').update({ status: 'ativa' }).eq('empresa_id', assinatura.empresa_id);
      return vencimento;
    };

    // 7. Mapeamento de eventos
    switch (eventType) {
      case 'PAYMENT_CREATED': {
        await admin.from('Recanto_Assinaturas').update({
          gateway_payment_id: payment.id,
          asaas_invoice_url: payment.invoiceUrl ?? null,
        }).eq('id', assinatura.id);
        await upsertPagamento('criado');
        await logEmpresa('cobranca_criada', `Cobrança gerada (${payment.billingType ?? '—'}).`, 'criado');
        break;
      }

      case 'PAYMENT_AWAITING_RISK_ANALYSIS': {
        await upsertPagamento('em_analise');
        await logEmpresa('pagamento_em_analise', 'Pagamento em análise de risco.', 'em_analise');
        break;
      }

      case 'PAYMENT_CONFIRMED': {
        const venc = await ativar();
        await upsertPagamento('confirmado', { pago_em: payment.confirmedDate ?? now.toISOString() });
        await logEmpresa('pagamento_confirmado', `Pagamento confirmado. Próximo vencimento: ${venc}.`, 'confirmado');
        break;
      }

      case 'PAYMENT_RECEIVED': {
        const venc = await ativar();
        await upsertPagamento('recebido', { pago_em: payment.paymentDate ?? payment.clientPaymentDate ?? now.toISOString() });
        await logEmpresa('pagamento_recebido', `Pagamento recebido. Próximo vencimento: ${venc}.`, 'recebido');
        break;
      }

      case 'PAYMENT_OVERDUE': {
        // Nesta entrega 'vencida' NÃO bloqueia o acesso — apenas sincroniza status.
        await admin.from('Recanto_Assinaturas').update({ status: 'vencida' }).eq('id', assinatura.id);
        await upsertPagamento('vencido');
        await logEmpresa('pagamento_vencido', 'Cobrança vencida.', 'vencido');
        break;
      }

      case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED': {
        await admin.from('Recanto_Assinaturas').update({ status: 'pendente' }).eq('id', assinatura.id);
        await upsertPagamento('recusado');
        await logEmpresa('pagamento_recusado', 'Captura do cartão recusada.', 'recusado');
        break;
      }

      case 'PAYMENT_REPROVED_BY_RISK_ANALYSIS': {
        await admin.from('Recanto_Assinaturas').update({ status: 'pendente' }).eq('id', assinatura.id);
        await upsertPagamento('reprovado_risco');
        await logEmpresa('pagamento_reprovado_risco', 'Pagamento reprovado pela análise de risco.', 'reprovado_risco');
        break;
      }

      case 'PAYMENT_REFUNDED': {
        await admin.from('Recanto_Assinaturas').update({
          status: 'cancelada',
          cancelada_em: now.toISOString(),
          motivo_cancelamento: 'Pagamento estornado (refund).',
        }).eq('id', assinatura.id);
        await upsertPagamento('estornado');
        await logEmpresa('pagamento_estornado', 'Pagamento estornado.', 'estornado');
        break;
      }

      case 'PAYMENT_DELETED': {
        await upsertPagamento('removido');
        // Se for a cobrança principal da assinatura, cancela a assinatura.
        const isPrincipal = !assinatura.ativada_em;
        if (isPrincipal) {
          await admin.from('Recanto_Assinaturas').update({
            status: 'cancelada', cancelada_em: now.toISOString(),
            motivo_cancelamento: 'Cobrança principal removida no gateway.',
          }).eq('id', assinatura.id);
        }
        await logEmpresa('cobranca_removida', 'Cobrança removida no gateway.', 'removido');
        break;
      }

      default: {
        if (eventType.includes('CHARGEBACK')) {
          await upsertPagamento('chargeback');
          await logEmpresa('chargeback', `Chargeback recebido (${eventType}). Avaliar manualmente.`, 'chargeback');
          break;
        }
        // Evento desconhecido → ignorado + 200 (payload já persistido).
        await markIgnorado(`Evento não tratado: ${eventType}.`);
        return ok({ received: true, ignored: true }, 200);
      }
    }

    await markProcessado();
    return ok({ received: true }, 200);
  } catch (err) {
    const msg = (err as Error).message ?? 'Erro desconhecido';
    console.error('[RecantoDosAnciaos_asaas-webhook] Erro ao processar evento:', msg);
    await markErro(msg);
    return ok({ error: 'Erro recuperável ao processar evento.' }, 500);
  }
});
