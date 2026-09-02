import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPenLine,
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

type EvolutionArea =
  | 'enfermagem'
  | 'fisioterapia'
  | 'nutricao'
  | 'medicina'
  | 'fonoaudiologia'
  | 'terapia_ocupacional';

interface EvolutionRow {
  id: string;
  resident_id: string;
  user_id: string;
  user_name: string;
  area: EvolutionArea;
  detalhes: string;
  created_at: string;
  group_id: string;
}

interface EvolutionGroup {
  id: string;
  userId: string;
  userName: string;
  area: EvolutionArea;
  details: string;
  createdAt: string;
  residentIds: string[];
}

const EVOLUTION_AREAS: Array<{ id: EvolutionArea; label: string }> = [
  { id: 'enfermagem', label: 'Enfermagem' },
  { id: 'fisioterapia', label: 'Fisioterapia' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'medicina', label: 'Medicina' },
  { id: 'fonoaudiologia', label: 'Fonoaudiologia' },
  { id: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
];

const initialAreaForRole = (role?: string): EvolutionArea => {
  const normalized = (role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized.includes('ocupacional')) return 'terapia_ocupacional';
  if (normalized.includes('fisio')) return 'fisioterapia';
  if (normalized.includes('nutri')) return 'nutricao';
  if (normalized.includes('medic')) return 'medicina';
  if (normalized.includes('fono')) return 'fonoaudiologia';
  return 'enfermagem';
};

const formattedProfessionalName = (name: string, role?: string): string => {
  const normalized = (role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized.includes('enferm')) return `Enf. ${name}`;
  if (normalized.includes('medic')) return `Dr(a). ${name}`;
  if (normalized.includes('cuidad')) return `Cuid. ${name}`;
  if (normalized.includes('nutri')) return `Nutri. ${name}`;
  if (normalized.includes('fisio')) return `Fisio. ${name}`;
  if (normalized.includes('fono')) return `Fono. ${name}`;
  return name;
};

const newUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const GeneralEvolutionModule: React.FC<{ residents: Resident[] }> = ({ residents }) => {
  const { currentUser, hasPermission } = useAuth();
  const initialArea = initialAreaForRole(currentUser?.employeeRole || currentUser?.profile.type);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [area, setArea] = useState<EvolutionArea>(initialArea);
  const [details, setDetails] = useState('');
  const [residentSearch, setResidentSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<'all' | EvolutionArea>('all');
  const [rows, setRows] = useState<EvolutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const canCreate = hasPermission(ViewState.GENERAL_EVOLUTION, 'create');
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

  const loadEvolutions = async () => {
    if (!currentUser?.empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Recanto_Evolucoes')
        .select('id,resident_id,user_id,user_name,area,detalhes,created_at,group_id')
        .eq('empresa_id', currentUser.empresaId)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      setRows((data || []) as EvolutionRow[]);
    } catch (error) {
      console.error('Erro ao carregar evoluções gerais:', error);
      toast.error('Não foi possível carregar a listagem de evoluções.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvolutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.empresaId]);

  const groups = useMemo(() => {
    const grouped = new Map<string, EvolutionGroup>();
    for (const row of rows) {
      const groupId = row.group_id || row.id;
      const existing = grouped.get(groupId);
      if (existing) {
        if (!existing.residentIds.includes(row.resident_id)) existing.residentIds.push(row.resident_id);
        continue;
      }
      grouped.set(groupId, {
        id: groupId,
        userId: row.user_id,
        userName: row.user_name,
        area: row.area,
        details: row.detalhes,
        createdAt: row.created_at,
        residentIds: [row.resident_id],
      });
    }

    const query = normalizeSearch(historySearch);
    return Array.from(grouped.values()).filter(group => {
      if (areaFilter !== 'all' && group.area !== areaFilter) return false;
      if (!query) return true;
      const residentNames = group.residentIds
        .map(id => residentById.get(id)?.name || '')
        .join(' ');
      return normalizeSearch(`${group.userName} ${richTextToPlainText(group.details)} ${residentNames}`).includes(query);
    });
  }, [rows, historySearch, areaFilter, residentById]);

  const totalPages = Math.max(1, Math.ceil(groups.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const visibleGroups = groups.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => setPage(1), [historySearch, areaFilter]);

  const toggleResident = (residentId: string) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(residentId)) next.delete(residentId);
      else next.add(residentId);
      return next;
    });
  };

  const allFilteredSelected = filteredResidents.length > 0
    && filteredResidents.every(resident => selectedIds.has(resident.id));

  const toggleAllFiltered = () => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (allFilteredSelected) filteredResidents.forEach(resident => next.delete(resident.id));
      else filteredResidents.forEach(resident => next.add(resident.id));
      return next;
    });
  };

  const saveEvolution = async () => {
    if (!currentUser?.empresaId || !canCreate || saving) return;
    const cleanDetails = sanitizeRichText(details);
    if (selectedIds.size === 0) {
      toast.warning('Selecione pelo menos um residente.');
      return;
    }
    if (!richTextHasContent(cleanDetails)) {
      toast.warning('Informe o texto da evolução.');
      return;
    }

    setSaving(true);
    try {
      const groupId = newUuid();
      const createdAt = new Date().toISOString();
      const role = currentUser.employeeRole || currentUser.profile.type;
      const author = formattedProfessionalName(currentUser.name, role);
      const payload = Array.from(selectedIds).map(residentId => ({
        id: newUuid(),
        group_id: groupId,
        resident_id: residentId,
        empresa_id: currentUser.empresaId,
        user_id: currentUser.id,
        user_name: author,
        area,
        detalhes: cleanDetails,
        created_at: createdAt,
      }));

      const { error } = await supabase.from('Recanto_Evolucoes').insert(payload);
      if (error) throw error;

      setRows(previous => [...payload as EvolutionRow[], ...previous]);
      setDetails('');
      setSelectedIds(new Set());
      setResidentSearch('');
      setPage(1);
      toast.success(`Evolução registrada para ${payload.length} residente${payload.length === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Erro ao registrar evolução geral:', error);
      toast.error('Não foi possível registrar a evolução geral. Nenhum residente foi atualizado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardPenLine className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Evolução Geral</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Registre uma mesma evolução para um ou vários residentes em um único lançamento.
        </p>
      </div>

      {canCreate && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-800">Nova evolução</h2>
            <p className="mt-0.5 text-xs text-slate-500">Cada residente selecionado receberá este registro em seu prontuário.</p>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(360px,1.2fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-700">Residentes</label>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {selectedIds.size} selecionado{selectedIds.size === 1 ? '' : 's'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={residentSearch}
                      onChange={event => setResidentSearch(event.target.value)}
                      placeholder="Buscar por nome ou quarto..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleAllFiltered}
                    disabled={filteredResidents.length === 0}
                    className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-700 disabled:text-slate-400"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${allFilteredSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {allFilteredSelected && <Check className="h-3 w-3" />}
                    </span>
                    {allFilteredSelected ? 'Desmarcar residentes exibidos' : 'Selecionar residentes exibidos'}
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredResidents.length > 0 ? filteredResidents.map(resident => {
                    const selected = selectedIds.has(resident.id);
                    return (
                      <button
                        key={resident.id}
                        type="button"
                        onClick={() => toggleResident(resident.id)}
                        className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors last:mb-0 ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-700">{resident.name}</span>
                          <span className="block text-xs text-slate-400">Quarto {resident.room || 'não informado'}</span>
                        </span>
                      </button>
                    );
                  }) : (
                    <p className="px-3 py-8 text-center text-sm text-slate-400">Nenhum residente ativo encontrado.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="general-evolution-area" className="mb-1.5 block text-sm font-semibold text-slate-700">Área profissional</label>
                <select
                  id="general-evolution-area"
                  value={area}
                  onChange={event => setArea(event.target.value as EvolutionArea)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {EVOLUTION_AREAS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="general-evolution-details" className="text-sm font-semibold text-slate-700">Evolução</label>
                  <span className="text-xs text-slate-400">{richTextToPlainText(details).length} caracteres</span>
                </div>
                <RichTextEditor
                  id="general-evolution-details"
                  value={details}
                  onChange={setDetails}
                  placeholder="Descreva a evolução que será incluída no prontuário dos residentes selecionados..."
                />
              </div>
              <button
                type="button"
                onClick={saveEvolution}
                disabled={saving || selectedIds.size === 0 || !richTextHasContent(details)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? 'Salvando evoluções...' : `Registrar para ${selectedIds.size || 0} residente${selectedIds.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Histórico geral</h2>
            <p className="mt-0.5 text-xs text-slate-500">Lançamentos individuais e coletivos de todos os residentes.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={historySearch}
                onChange={event => setHistorySearch(event.target.value)}
                placeholder="Buscar no histórico..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-sm outline-none focus:border-blue-400 sm:w-64"
              />
              {historySearch && (
                <button type="button" onClick={() => setHistorySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={areaFilter}
              onChange={event => setAreaFilter(event.target.value as 'all' | EvolutionArea)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-blue-400"
            >
              <option value="all">Todas as áreas</option>
              {EVOLUTION_AREAS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Carregando evoluções...
            </div>
          ) : visibleGroups.length > 0 ? (
            <div className="space-y-3">
              {visibleGroups.map(group => {
                const residentNames = group.residentIds
                  .map(id => residentById.get(id)?.name || 'Residente não encontrado')
                  .sort((a, b) => a.localeCompare(b, 'pt-BR'));
                const areaLabel = EVOLUTION_AREAS.find(option => option.id === group.area)?.label || group.area;
                return (
                  <article key={group.id} className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-800">{group.userName}</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{areaLabel}</span>
                          {residentNames.length > 1 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <Users className="h-3 w-3" /> Evolução geral
                            </span>
                          )}
                        </div>
                        <time className="mt-1 block text-xs text-slate-400">
                          {new Date(group.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </time>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-slate-500">
                        {residentNames.length} residente{residentNames.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <RichTextContent value={group.details} className="mt-3 text-sm leading-relaxed text-slate-600" />
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                      {residentNames.map(name => (
                        <span key={name} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{name}</span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <ClipboardPenLine className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Nenhuma evolução encontrada</p>
              <p className="mt-1 text-xs text-slate-400">Os registros aparecerão aqui após o primeiro lançamento.</p>
            </div>
          )}

          {!loading && groups.length > 0 && (
            <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
              <span className="text-xs text-slate-500">
                Exibindo {(safePage - 1) * itemsPerPage + 1} a {Math.min(safePage * itemsPerPage, groups.length)} de {groups.length} lançamentos
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(previous => Math.max(1, previous - 1))}
                  disabled={safePage === 1}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-slate-600">Página {safePage} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage(previous => Math.min(totalPages, previous + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default GeneralEvolutionModule;
