import type { CarePlanAdherence, DailyChecklist } from '../types';
import { supabase } from './supabaseClient';

type ChecklistShift = NonNullable<DailyChecklist['shift']>;

export type ChecklistHistoryItem = Pick<
  DailyChecklist,
  | 'date'
  | 'shift'
  | 'intercorrencia'
  | 'queixaDor'
  | 'alteracoesPele'
  | 'alimentacao'
  | 'estadoNeurologico'
>;

export interface FetchResidentChecklistHistoryPageOptions {
  residentId: string;
  page: number;
  pageSize: number;
}

export interface ResidentChecklistHistoryPage {
  checklists: ChecklistHistoryItem[];
  totalCount: number;
}

const CHECKLIST_HISTORY_SELECT = [
  'date',
  'shift',
  'intercorrencia',
  'queixa_dor',
  'alteracoes_pele',
  'alimentacao',
  'estado_neurologico',
].join(',');

const checklistHistoryRequests = new Map<string, Promise<ResidentChecklistHistoryPage>>();
const checklistDetailRequests = new Map<string, Promise<DailyChecklist | null>>();

function dedupeInFlight<T>(
  requests: Map<string, Promise<T>>,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const existing = requests.get(key);
  if (existing) return existing;

  const request = loader().then(
    value => {
      if (requests.get(key) === request) requests.delete(key);
      return value;
    },
    error => {
      if (requests.get(key) === request) requests.delete(key);
      throw error;
    },
  );

  requests.set(key, request);
  return request;
}

function normalizeResidentId(residentId: string): string {
  const normalized = residentId.trim();
  if (!normalized) throw new Error('O ID do residente e obrigatorio.');
  return normalized;
}

function normalizeShift(shift: DailyChecklist['shift']): ChecklistShift {
  if (shift == null) return 'diurno';
  if (shift === 'diurno' || shift === 'noturno' || shift === 'diario') return shift;
  throw new Error(`Turno de boletim invalido: ${String(shift)}`);
}

function getLocalDayBounds(date: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error('A data do boletim deve estar no formato AAAA-MM-DD.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(year, month - 1, day);

  if (
    start.getFullYear() !== year
    || start.getMonth() !== month - 1
    || start.getDate() !== day
  ) {
    throw new Error('A data do boletim e invalida.');
  }

  return {
    start,
    end: new Date(year, month - 1, day + 1),
  };
}

function mapChecklistHistoryItem(row: any): ChecklistHistoryItem {
  return {
    date: row.date,
    shift: normalizeShift(row.shift),
    intercorrencia: row.intercorrencia || undefined,
    queixaDor: row.queixa_dor || undefined,
    alteracoesPele: row.alteracoes_pele || undefined,
    alimentacao: row.alimentacao || undefined,
    estadoNeurologico: row.estado_neurologico || undefined,
  };
}

function mapCarePlanAdherence(row: any): CarePlanAdherence {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    carePlanId: row.care_plan_id,
    status: row.status,
    comment: row.comment || undefined,
  };
}

function vitalMatchesChecklist(
  vital: any,
  checklistDate: string,
  shift: ChecklistShift,
): boolean {
  const vitalDate = new Date(vital.timestamp);
  if (Number.isNaN(vitalDate.getTime())) return false;

  const year = vitalDate.getFullYear();
  const month = String(vitalDate.getMonth() + 1).padStart(2, '0');
  const day = String(vitalDate.getDate()).padStart(2, '0');
  if (`${year}-${month}-${day}` !== checklistDate) return false;

  const hour = vitalDate.getHours();
  if (shift === 'noturno') return hour >= 18 || hour < 6;

  // O mapeamento atual registra o modelo diario no horario diurno (10h),
  // portanto ele compartilha a mesma faixa usada pelo turno diurno.
  return hour >= 6 && hour < 18;
}

function mapChecklistDetail(
  row: any,
  vitals: any[],
  adherenceRows: any[],
): DailyChecklist {
  const shift = normalizeShift(row.shift);
  const matchingVital = vitals.find(vital => vitalMatchesChecklist(vital, row.date, shift));

  return {
    date: row.date,
    shift,
    hygiene: row.hygiene,
    oralCare: row.oral_care,
    feeding: row.feeding,
    hydration: row.hydration,
    mobility: row.mobility,
    dressings: row.dressings,
    leisure: row.leisure,
    queixaDor: row.queixa_dor || undefined,
    queixaDorDesc: row.queixa_dor_desc || undefined,
    estadoNeurologico: row.estado_neurologico || undefined,
    arAmbiente: row.ar_ambiente !== null ? row.ar_ambiente : undefined,
    alimentacao: row.alimentacao || undefined,
    alimentacaoDesc: row.alimentacao_desc || undefined,
    agitado: row.agitado !== null ? row.agitado : undefined,
    prostrado: row.prostrado !== null ? row.prostrado : undefined,
    sonolento: row.sonolento !== null ? row.sonolento : undefined,
    eliminacaoEvacuacao: row.eliminacao_evacuacao || undefined,
    eliminacaoEvacuacaoDias: row.eliminacao_evacuacao_dias || undefined,
    aspectoEvacuacoes: row.aspecto_evacuacoes || undefined,
    diurese: row.diurese || undefined,
    diureseAspecto: row.diurese_aspecto || undefined,
    usoFraldas: row.uso_fraldas || undefined,
    mobilidadeSet: row.mobilidade_set || undefined,
    higieneCorporal: row.higiene_corporal || undefined,
    higieneOralVestir: row.higiene_oral_vestir || undefined,
    alteracoesPele: row.alteracoes_pele || undefined,
    alteracoesPeleDesc: row.alteracoes_pele_desc || undefined,
    sono: row.sono || undefined,
    sonoDesc: row.sono_desc || undefined,
    medicacoesAdministradas: row.medicacoes_administradas || undefined,
    atividadesConsulta: row.atividades_consulta || undefined,
    intercorrencia: row.intercorrencia || undefined,
    intercorrenciaDesc: row.intercorrencia_desc || undefined,
    photoUrls: Array.isArray(row.photo_urls) && row.photo_urls.length > 0
      ? row.photo_urls
      : (row.photo_url ? [row.photo_url] : []),
    signedBy: row.signed_by || undefined,
    signedAt: row.signed_at || undefined,
    signatureInfo: row.signature_info || undefined,
    frequenciaCardiaca: matchingVital?.hr ? String(matchingVital.hr) : undefined,
    pressaoArterial: matchingVital?.bp || undefined,
    saturacao: matchingVital?.spo2 ? String(matchingVital.spo2) : undefined,
    temperatura: matchingVital?.temp ? String(matchingVital.temp) : undefined,
    carePlanAdherence: adherenceRows.map(mapCarePlanAdherence),
  };
}

export function fetchResidentChecklistHistoryPage(
  options: FetchResidentChecklistHistoryPageOptions,
): Promise<ResidentChecklistHistoryPage> {
  const residentId = normalizeResidentId(options.residentId);
  const page = Math.max(1, Math.trunc(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.trunc(options.pageSize) || 5));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const requestKey = JSON.stringify([residentId, page, pageSize]);

  return dedupeInFlight(checklistHistoryRequests, requestKey, async () => {
    const { data, count, error } = await supabase
      .from('Recanto_ChecklistDiario')
      .select(CHECKLIST_HISTORY_SELECT, { count: 'exact' })
      .eq('resident_id', residentId)
      .order('date', { ascending: false })
      .order('shift', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      checklists: (data || []).map(mapChecklistHistoryItem),
      totalCount: count ?? 0,
    };
  });
}

export function fetchResidentChecklistDetail(
  residentId: string,
  date: string,
  shift: DailyChecklist['shift'],
): Promise<DailyChecklist | null> {
  const normalizedResidentId = normalizeResidentId(residentId);
  const normalizedShift = normalizeShift(shift);
  const { start, end } = getLocalDayBounds(date);
  const requestKey = JSON.stringify([normalizedResidentId, date, normalizedShift]);

  return dedupeInFlight(checklistDetailRequests, requestKey, async () => {
    const { data: checklistRow, error: checklistError } = await supabase
      .from('Recanto_ChecklistDiario')
      .select('*')
      .eq('resident_id', normalizedResidentId)
      .eq('date', date)
      .eq('shift', normalizedShift)
      .maybeSingle();

    if (checklistError) throw checklistError;
    if (!checklistRow) return null;

    const [adherenceResult, vitalsResult] = await Promise.all([
      supabase
        .from('Recanto_AcompanhamentoPlano')
        .select('id,checklist_id,care_plan_id,status,comment')
        .eq('checklist_id', checklistRow.id),
      supabase
        .from('Recanto_SinaisVitais')
        .select('timestamp,bp,hr,temp,spo2')
        .eq('resident_id', normalizedResidentId)
        .gte('timestamp', start.toISOString())
        .lt('timestamp', end.toISOString()),
    ]);

    if (adherenceResult.error) throw adherenceResult.error;
    if (vitalsResult.error) throw vitalsResult.error;

    return mapChecklistDetail(
      checklistRow,
      vitalsResult.data || [],
      adherenceResult.data || [],
    );
  });
}
