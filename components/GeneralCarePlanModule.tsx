import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileHeart,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import { Resident, ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { toast } from '../services/toast';
import RichTextEditor from './RichTextEditor';
import RichTextContent from './RichTextContent';
import { richTextHasContent, richTextToPlainText, sanitizeRichText } from '../lib/richText';

type FrequencyDay = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
type FrequencyState = Record<FrequencyDay, { checked: boolean; times: number }>;

interface CarePlanRow {
  id: string;
  resident_id: string;
  title: string;
  description: string;
  frequency: string;
  assigned_to: string;
  status: 'ativo' | 'concluido' | 'suspenso';
  created_at: string;
  group_id: string;
}

interface CarePlanGroup {
  id: string;
  title: string;
  description: string;
  frequency: string;
  assignedTo: string;
  createdAt: string;
  residentIds: string[];
  statuses: CarePlanRow['status'][];
}

const DAYS: Array<{ id: FrequencyDay; short: string; label: string }> = [
  { id: 'segunda', short: 'Seg', label: 'Segunda' },
  { id: 'terca', short: 'Ter', label: 'Terça' },
  { id: 'quarta', short: 'Qua', label: 'Quarta' },
  { id: 'quinta', short: 'Qui', label: 'Quinta' },
  { id: 'sexta', short: 'Sex', label: 'Sexta' },
  { id: 'sabado', short: 'Sáb', label: 'Sábado' },
  { id: 'domingo', short: 'Dom', label: 'Domingo' },
];

const emptyFrequency = (): FrequencyState => ({
  segunda: { checked: false, times: 1 },
  terca: { checked: false, times: 1 },
  quarta: { checked: false, times: 1 },
  quinta: { checked: false, times: 1 },
  sexta: { checked: false, times: 1 },
  sabado: { checked: false, times: 1 },
  domingo: { checked: false, times: 1 },
});

const newUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const formatFrequency = (frequency: string): string => {
  try {
    const parsed = JSON.parse(frequency) as Record<string, number>;
    const selected = DAYS
      .filter(day => Number(parsed[day.id] || 0) > 0)
      .map(day => `${day.short} ${parsed[day.id]}x`);
    return selected.length > 0 ? selected.join(' · ') : 'Sem frequência definida';
  } catch {
    return frequency || 'Sem frequência definida';
  }
};

const GeneralCarePlanModule: React.FC<{ residents: Resident[] }> = ({ residents }) => {
  const { currentUser, hasPermission } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [residentSearch, setResidentSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<FrequencyState>(emptyFrequency);
  const [rows, setRows] = useState<CarePlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const canCreate = hasPermission(ViewState.GENERAL_CARE_PLAN, 'create')
    || hasPermission(ViewState.GENERAL_CARE_PLAN, 'edit');
  const activeResidents = useMemo(
    () => residents.filter(resident => resident.status !== 'inativo'),
    [residents],
  );
  const residentById = useMemo(
    () => new Map(residents.map(resident => [resident.id, resident])),
    [residents],
  );

  const filteredResidents = useMemo(() => {
    const query = normalizeSearch(residentSearch);
    if (!query) return activeResidents;
    return activeResidents.filter(resident =>
      normalizeSearch(`${resident.name} ${resident.room || ''}`).includes(query),
    );
  }, [activeResidents, residentSearch]);

  const loadPlans = async () => {
    if (!currentUser?.empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Recanto_PlanosAssistencia')
        .select('id,resident_id,title,description,frequency,assigned_to,status,created_at,group_id')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      setRows((data || []) as CarePlanRow[]);
    } catch (error) {
      console.error('Erro ao carregar planos evolutivos gerais:', error);
      toast.error('Não foi possível carregar os planos evolutivos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.empresaId]);

  const groups = useMemo(() => {
    const grouped = new Map<string, CarePlanGroup>();
    for (const row of rows) {
      const groupId = row.group_id || row.id;
      const existing = grouped.get(groupId);
      if (existing) {
        if (!existing.residentIds.includes(row.resident_id)) existing.residentIds.push(row.resident_id);
        existing.statuses.push(row.status);
      } else {
        grouped.set(groupId, {
          id: groupId,
          title: row.title,
          description: row.description || '',
          frequency: row.frequency || '',
          assignedTo: row.assigned_to || '',
          createdAt: row.created_at,
          residentIds: [row.resident_id],
          statuses: [row.status],
        });
      }
    }

    const query = normalizeSearch(historySearch);
    return Array.from(grouped.values()).filter(group => {
      if (!query) return true;
      const names = group.residentIds.map(id => residentById.get(id)?.name || '').join(' ');
      return normalizeSearch(`${group.title} ${richTextToPlainText(group.description)} ${group.assignedTo} ${names}`).includes(query);
    });
  }, [rows, historySearch, residentById]);

  useEffect(() => setPage(1), [historySearch]);

  const totalPages = Math.max(1, Math.ceil(groups.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const visibleGroups = groups.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const allFilteredSelected = filteredResidents.length > 0
    && filteredResidents.every(resident => selectedIds.has(resident.id));

  const toggleResident = (residentId: string) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(residentId)) next.delete(residentId);
      else next.add(residentId);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (allFilteredSelected) filteredResidents.forEach(resident => next.delete(resident.id));
      else filteredResidents.forEach(resident => next.add(resident.id));
      return next;
    });
  };

  const updateDay = (day: FrequencyDay, update: Partial<FrequencyState[FrequencyDay]>) => {
    setFrequency(previous => ({
      ...previous,
      [day]: { ...previous[day], ...update },
    }));
  };

  const savePlan = async () => {
    if (!currentUser?.empresaId || !canCreate || saving) return;
    const cleanTitle = title.trim();
    const cleanDescription = sanitizeRichText(description);
    const frequencyObject = Object.fromEntries(
      DAYS.map(day => [day.id, frequency[day.id].checked ? frequency[day.id].times : 0]),
    );

    if (selectedIds.size === 0) return void toast.warning('Selecione pelo menos um residente.');
    if (!cleanTitle) return void toast.warning('Informe o título ou meta do plano.');
    if (!richTextHasContent(cleanDescription)) return void toast.warning('Informe a descrição do plano.');
    if (!Object.values(frequencyObject).some(times => times > 0)) {
      return void toast.warning('Selecione pelo menos um dia da semana.');
    }

    setSaving(true);
    try {
      const groupId = newUuid();
      const createdAt = new Date().toISOString();
      const responsible = `${currentUser.employeeRole || currentUser.profile.type || 'Profissional'}: ${currentUser.name}`;
      const serializedFrequency = JSON.stringify(frequencyObject);
      const payload: CarePlanRow[] = Array.from(selectedIds).map(residentId => ({
        id: newUuid(),
        group_id: groupId,
        resident_id: residentId,
        title: cleanTitle,
        description: cleanDescription,
        frequency: serializedFrequency,
        assigned_to: responsible,
        status: 'ativo',
        created_at: createdAt,
      }));

      const { error } = await supabase.from('Recanto_PlanosAssistencia').insert(payload);
      if (error) throw error;

      // Mantém a auditoria equivalente ao cadastro feito dentro do prontuário.
      const auditPayload = payload.map(plan => ({
        id: newUuid(),
        resident_id: plan.resident_id,
        timestamp: createdAt,
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: 'Plano de Cuidado',
        details: `Criou plano: ${cleanTitle}`,
        dados: {
          id: plan.id,
          title: cleanTitle,
          description: cleanDescription,
          frequency: serializedFrequency,
          assignedTo: responsible,
          status: 'ativo',
          createdAt,
          groupId,
        },
      }));
      const { error: auditError } = await supabase.from('Recanto_LogsAuditoria').insert(auditPayload);
      if (auditError) console.warn('Plano salvo, mas não foi possível registrar a auditoria:', auditError);

      setRows(previous => [...payload, ...previous]);
      setSelectedIds(new Set());
      setResidentSearch('');
      setTitle('');
      setDescription('');
      setFrequency(emptyFrequency());
      setPage(1);
      toast.success(`Plano criado para ${payload.length} residente${payload.length === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Erro ao criar plano evolutivo geral:', error);
      toast.error('Não foi possível criar o plano evolutivo geral.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileHeart className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Plano Evolutivo Geral</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Crie o mesmo plano individual de cuidados para vários residentes.</p>
      </div>

      {canCreate && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-800">Novo plano evolutivo</h2>
            <p className="mt-0.5 text-xs text-slate-500">O plano ficará disponível no prontuário e no boletim de cada residente selecionado.</p>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(280px,0.75fr)_minmax(440px,1.25fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-700">Residentes</label>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{selectedIds.size} selecionado{selectedIds.size === 1 ? '' : 's'}</span>
              </div>
              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={residentSearch} onChange={event => setResidentSearch(event.target.value)} placeholder="Buscar por nome ou quarto..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <button type="button" onClick={toggleAllFiltered} disabled={filteredResidents.length === 0} className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-700 disabled:text-slate-400">
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${allFilteredSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>{allFilteredSelected && <Check className="h-3 w-3" />}</span>
                    {allFilteredSelected ? 'Desmarcar residentes exibidos' : 'Selecionar residentes exibidos'}
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredResidents.length > 0 ? filteredResidents.map(resident => {
                    const selected = selectedIds.has(resident.id);
                    return (
                      <button key={resident.id} type="button" onClick={() => toggleResident(resident.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left last:mb-0 ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-700">{resident.name}</span><span className="block text-xs text-slate-400">Quarto {resident.room || 'não informado'}</span></span>
                      </button>
                    );
                  }) : <p className="px-3 py-8 text-center text-sm text-slate-400">Nenhum residente ativo encontrado.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="general-care-plan-title" className="mb-1.5 block text-sm font-semibold text-slate-700">Título / Meta</label>
                <input id="general-care-plan-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Prevenção de quedas" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between"><label className="text-sm font-semibold text-slate-700">Descrição / Intervenção</label><span className="text-xs text-slate-400">{richTextToPlainText(description).length} caracteres</span></div>
                <RichTextEditor value={description} onChange={setDescription} minHeightClassName="min-h-32" placeholder="Descreva as ações necessárias..." />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Frequência semanal</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                  {DAYS.map(day => {
                    const state = frequency[day.id];
                    return (
                      <div key={day.id} className={`rounded-xl border p-2 text-center ${state.checked ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                        <button type="button" onClick={() => updateDay(day.id, { checked: !state.checked })} className="flex w-full items-center justify-between gap-1 text-xs font-bold text-slate-700">
                          {day.short}<span className={`flex h-4 w-4 items-center justify-center rounded border ${state.checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>{state.checked && <Check className="h-3 w-3" />}</span>
                        </button>
                        {state.checked && (
                          <div className="mt-2 flex items-center justify-center gap-1">
                            <button type="button" onClick={() => state.times > 1 ? updateDay(day.id, { times: state.times - 1 }) : updateDay(day.id, { checked: false })} className="h-6 w-6 rounded border border-slate-300 bg-white text-xs font-bold">−</button>
                            <span className="w-5 text-xs font-bold">{state.times}x</span>
                            <button type="button" onClick={() => updateDay(day.id, { times: state.times + 1 })} className="h-6 w-6 rounded border border-slate-300 bg-white text-xs font-bold">+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500"><span className="font-semibold text-slate-700">Responsável:</span> {currentUser?.employeeRole || currentUser?.profile.type}: {currentUser?.name}</div>
              <button type="button" onClick={savePlan} disabled={saving || selectedIds.size === 0 || !title.trim() || !richTextHasContent(description)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? 'Criando planos...' : `Criar para ${selectedIds.size} residente${selectedIds.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-800">Histórico geral de planos</h2><p className="mt-0.5 text-xs text-slate-500">Planos individuais e coletivos de todos os residentes.</p></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Buscar planos..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-sm outline-none focus:border-blue-400 sm:w-72" />{historySearch && <button type="button" onClick={() => setHistorySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}</div>
        </div>
        <div className="p-5">
          {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Carregando planos...</div> : visibleGroups.length > 0 ? (
            <div className="space-y-3">
              {visibleGroups.map(group => {
                const names = group.residentIds.map(id => residentById.get(id)?.name || 'Residente não encontrado').sort((a, b) => a.localeCompare(b, 'pt-BR'));
                const activeCount = group.statuses.filter(status => status === 'ativo').length;
                return (
                  <article key={group.id} className="rounded-xl border border-slate-200 p-4 hover:shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-800">{group.title}</h3>{names.length > 1 && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"><Users className="h-3 w-3" /> Plano geral</span>}<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{activeCount} ativo{activeCount === 1 ? '' : 's'}</span></div><p className="mt-1 text-xs text-slate-400">{new Date(group.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {group.assignedTo}</p></div>
                      <span className="shrink-0 text-xs font-semibold text-slate-500">{names.length} residente{names.length === 1 ? '' : 's'}</span>
                    </div>
                    <RichTextContent value={group.description} className="mt-3 text-sm leading-relaxed text-slate-600" />
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{formatFrequency(group.frequency)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">{names.map((name, index) => <span key={`${name}-${index}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{name}</span>)}</div>
                  </article>
                );
              })}
            </div>
          ) : <div className="py-16 text-center"><FileHeart className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Nenhum plano encontrado</p></div>}

          {!loading && groups.length > 0 && <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row"><span className="text-xs text-slate-500">Exibindo {(safePage - 1) * itemsPerPage + 1} a {Math.min(safePage * itemsPerPage, groups.length)} de {groups.length} planos</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={safePage === 1} className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs font-semibold text-slate-600">Página {safePage} de {totalPages}</span><button type="button" onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={safePage === totalPages} className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
        </div>
      </section>
    </div>
  );
};

export default GeneralCarePlanModule;
