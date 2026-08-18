import { DailyChecklist } from '../types';
import { supabase } from './supabaseClient';

const TABLE = 'Recanto_ChecklistRascunhos';
const pendingDraftRequests = new Map<string, Promise<DailyChecklist | null>>();

export type ChecklistShift = 'diurno' | 'noturno' | 'diario';

export interface ChecklistDraftKey {
  empresaId: string;
  authUserId: string;
  residentId: string;
  date: string;
  shift: ChecklistShift;
}

export function fetchChecklistDraft(key: ChecklistDraftKey): Promise<DailyChecklist | null> {
  const requestKey = [key.empresaId, key.authUserId, key.residentId, key.date, key.shift].join(':');
  const pendingRequest = pendingDraftRequests.get(requestKey);
  if (pendingRequest) return pendingRequest;

  const request = (async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('dados')
      .eq('empresa_id', key.empresaId)
      .eq('auth_user_id', key.authUserId)
      .eq('resident_id', key.residentId)
      .eq('data', key.date)
      .eq('turno', key.shift)
      .maybeSingle();

    if (error) throw error;
    return (data?.dados as DailyChecklist | undefined) ?? null;
  })();

  pendingDraftRequests.set(requestKey, request);
  void request.then(
    () => {
      if (pendingDraftRequests.get(requestKey) === request) pendingDraftRequests.delete(requestKey);
    },
    () => {
      if (pendingDraftRequests.get(requestKey) === request) pendingDraftRequests.delete(requestKey);
    }
  );

  return request;
}

export async function saveChecklistDraft(
  key: ChecklistDraftKey,
  draft: DailyChecklist,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      empresa_id: key.empresaId,
      auth_user_id: key.authUserId,
      resident_id: key.residentId,
      data: key.date,
      turno: key.shift,
      dados: draft,
    }, { onConflict: 'empresa_id,resident_id,auth_user_id,data,turno' });

  if (error) throw error;
}

export async function removeChecklistDraft(key: ChecklistDraftKey): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('empresa_id', key.empresaId)
    .eq('auth_user_id', key.authUserId)
    .eq('resident_id', key.residentId)
    .eq('data', key.date)
    .eq('turno', key.shift);

  if (error) throw error;
}
