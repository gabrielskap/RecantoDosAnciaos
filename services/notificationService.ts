import { supabase } from './supabaseClient';
import type {
  NotificationTemplate,
  NotificationQueueItem,
  NotificationPreference,
  WhatsappInstance,
  NotificationChoice,
} from '../types';

// ===========================================================================
// Serviço do módulo de Notificações WhatsApp (UAZAPI / padrão Outbox).
// Mapeia snake_case (banco) ↔ camelCase (app), no mesmo estilo de dataService.
// ===========================================================================

const TEMPLATES = 'Recanto_Notificacao_Templates';
const FILA = 'Recanto_Notificacao_Fila';
const PREFS = 'Recanto_Notificacao_Preferencias';

// ─── Mappers ────────────────────────────────────────────────────────────────
const mapTemplate = (t: any): NotificationTemplate => ({
  id: t.id,
  empresaId: t.empresa_id ?? undefined,
  name: t.name,
  triggerEvent: t.trigger_event,
  messageType: t.message_type,
  messageText: t.message_text,
  footerText: t.footer_text ?? undefined,
  choices: (t.choices ?? undefined) as NotificationChoice[] | undefined,
  active: t.active,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

const mapQueueItem = (q: any): NotificationQueueItem => ({
  id: q.id,
  templateId: q.template_id ?? undefined,
  triggerEvent: q.trigger_event,
  messageType: q.message_type,
  recipientType: q.recipient_type,
  recipientName: q.recipient_name ?? undefined,
  recipientPhone: q.recipient_phone,
  messageText: q.message_text,
  status: q.status,
  attempts: q.attempts,
  maxAttempts: q.max_attempts,
  lastError: q.last_error ?? undefined,
  scheduledFor: q.scheduled_for,
  sentAt: q.sent_at ?? undefined,
  createdAt: q.created_at,
});

const mapPreference = (p: any): NotificationPreference => ({
  id: p.id,
  responsibleId: p.responsible_id,
  residentId: p.resident_id ?? undefined,
  whatsappEnabled: p.whatsapp_enabled,
  healthNotificationsEnabled: p.health_notifications_enabled,
  administrativeNotificationsEnabled: p.administrative_notifications_enabled,
  financialNotificationsEnabled: p.financial_notifications_enabled,
  consentSource: p.consent_source ?? undefined,
  consentedAt: p.consented_at ?? undefined,
  revokedAt: p.revoked_at ?? undefined,
});

// ─── Templates ──────────────────────────────────────────────────────────────
export async function fetchTemplates(empresaId: string): Promise<NotificationTemplate[]> {
  // Inclui templates globais (empresa_id NULL) + os da empresa.
  const { data, error } = await supabase
    .from(TEMPLATES)
    .select('*')
    .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTemplate);
}

export async function saveTemplate(
  empresaId: string,
  t: Partial<NotificationTemplate> & { id?: string },
): Promise<NotificationTemplate> {
  const row = {
    empresa_id: empresaId,
    name: t.name,
    trigger_event: t.triggerEvent ?? 'manual',
    message_type: t.messageType ?? 'text',
    message_text: t.messageText,
    footer_text: t.footerText ?? null,
    choices: t.choices ?? null,
    active: t.active ?? true,
  };

  if (t.id) {
    const { data, error } = await supabase.from(TEMPLATES).update(row).eq('id', t.id).select().single();
    if (error) throw error;
    return mapTemplate(data);
  }
  const { data, error } = await supabase.from(TEMPLATES).insert(row).select().single();
  if (error) throw error;
  return mapTemplate(data);
}

export async function toggleTemplate(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from(TEMPLATES).update({ active }).eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from(TEMPLATES).delete().eq('id', id);
  if (error) throw error;
}

// ─── Fila / Histórico ───────────────────────────────────────────────────────
export async function fetchQueue(empresaId: string, limit = 200): Promise<NotificationQueueItem[]> {
  const { data, error } = await supabase
    .from(FILA)
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapQueueItem);
}

export interface ManualRecipient {
  recipient_type?: 'responsible' | 'resident' | 'group' | 'manual_phone';
  recipient_id?: string;
  recipient_name?: string;
  recipient_phone: string;
  variables?: Record<string, string>;
}

export async function enqueueManual(args: {
  templateId?: string;
  messageText?: string;
  recipients: ManualRecipient[];
}): Promise<{ total: number; created: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('recanto_enqueue_manual_notification', {
    p_template_id: args.templateId ?? null,
    p_message_text: args.messageText ?? null,
    p_recipients: args.recipients,
    p_created_by: user?.id ?? null,
  });
  if (error) throw error;
  return data as { total: number; created: number };
}

export async function resendQueueItem(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('recanto_resend_notification', { p_id: id });
  if (error) throw error;
  return Boolean(data);
}

export async function cancelQueueItem(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('recanto_cancel_notification', { p_id: id });
  if (error) throw error;
  return Boolean(data);
}

// ─── Responsáveis legais (para consentimento e seleção de destinatário) ─────
export interface ResponsibleContact {
  id: string;
  residentId: string;
  residentName: string;
  name: string;
  phone: string;
  isPrimary: boolean;
}

export async function fetchResponsibles(_empresaId: string): Promise<ResponsibleContact[]> {
  // RLS isola por empresa; o join traz o nome do residente.
  const { data, error } = await supabase
    .from('Recanto_ResponsaveisLegais')
    .select('id, resident_id, name, phone, is_primary, resident:Recanto_Residentes(name)')
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    residentId: r.resident_id,
    residentName: (Array.isArray(r.resident) ? r.resident[0]?.name : r.resident?.name) ?? 'Residente',
    name: r.name,
    phone: r.phone ?? '',
    isPrimary: r.is_primary ?? false,
  }));
}

// ─── Preferências / Consentimento ───────────────────────────────────────────
// Mapa indexado por `${responsibleId}:${residentId ?? ''}` (usado pela UI).
export type NotificationPreferenceMap = Record<string, NotificationPreference>;

export async function fetchPreferences(empresaId: string): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from(PREFS)
    .select('*')
    .eq('empresa_id', empresaId);
  if (error) throw error;
  return (data || []).map(mapPreference);
}

export async function savePreference(
  empresaId: string,
  pref: NotificationPreference,
): Promise<NotificationPreference> {
  const row = {
    empresa_id: empresaId,
    responsible_id: pref.responsibleId,
    resident_id: pref.residentId ?? null,
    whatsapp_enabled: pref.whatsappEnabled,
    health_notifications_enabled: pref.healthNotificationsEnabled,
    administrative_notifications_enabled: pref.administrativeNotificationsEnabled,
    financial_notifications_enabled: pref.financialNotificationsEnabled,
    consent_source: pref.consentSource ?? 'cadastro',
    consented_at: pref.whatsappEnabled ? (pref.consentedAt ?? new Date().toISOString()) : pref.consentedAt ?? null,
    revoked_at: pref.whatsappEnabled ? null : new Date().toISOString(),
  };

  // Sem upsert (índice único é parcial/expressão): busca por (responsável, residente).
  let query = supabase.from(PREFS).select('id').eq('responsible_id', pref.responsibleId);
  query = pref.residentId ? query.eq('resident_id', pref.residentId) : query.is('resident_id', null);
  const { data: existing } = await query.maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase.from(PREFS).update(row).eq('id', existing.id).select().single();
    if (error) throw error;
    return mapPreference(data);
  }
  const { data, error } = await supabase.from(PREFS).insert(row).select().single();
  if (error) throw error;
  return mapPreference(data);
}

// ─── Instância WhatsApp (conexão/QR) ────────────────────────────────────────
const mapInstance = (d: any): WhatsappInstance => ({
  instanceName: d?.instance_name ?? undefined,
  status: d?.status ?? 'not_configured',
  connected: Boolean(d?.connected),
  phoneNumber: d?.phone_number ?? undefined,
  hasToken: d?.has_token ?? undefined,
  connectedAt: d?.connected_at ?? undefined,
  qrcode: d?.qrcode ?? undefined,
});

export async function getWhatsappInstance(): Promise<WhatsappInstance> {
  const { data, error } = await supabase.rpc('recanto_get_whatsapp_instance');
  if (error) throw error;
  return mapInstance(data);
}

async function invokeInstance(action: 'connect' | 'status' | 'disconnect'): Promise<WhatsappInstance> {
  const { data, error } = await supabase.functions.invoke('RecantoDosAnciaos_whatsapp-instance', { body: { action } });
  if (error) {
    // FunctionsHttpError: o corpo (com a mensagem real do 500) fica em error.context.
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      }
    } catch { /* ignora — mantém a mensagem genérica */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return mapInstance(data);
}

export const connectWhatsapp = () => invokeInstance('connect');
export const refreshWhatsappStatus = () => invokeInstance('status');
export const disconnectWhatsapp = () => invokeInstance('disconnect');
