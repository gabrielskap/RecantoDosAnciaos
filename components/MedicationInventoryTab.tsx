import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pill, Plus, X, Search, AlertTriangle, CheckCircle2, CalendarClock,
  History, ArrowDownCircle, ArrowUpCircle, PackageSearch, Trash2, Minus, Users,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { MedicamentoInventarioItem, MedicamentoForma, Resident, ViewState } from '../types';
import CustomSelect from './CustomSelect';
import MedicationAutocomplete from './MedicationAutocomplete';
import { residentAvatarSrc } from '../lib/avatar';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchInventario, addInventarioItem, registrarMovimentacao, deleteInventarioItem,
  fetchPrescricoesResidente, unidadesPorTomada, consumoDiario, diasCobertura,
  dataTerminoPrevista, isBaixoEstoque, isVencido, isVencendo, precisaReposicao,
  motivoReposicao, formatTomadasPorDia, LIMITE_DIAS_REPOSICAO, NovoInventarioInput,
  agruparPorMedicamento, chaveAgrupamento,
} from '../services/medicationInventoryService';
import { isBeforeToday, getTodayDateString } from '../utils/dateUtils';
import { systemDialog } from '../services/systemDialog';

interface Props {
  residents: Resident[];
}

const FORMA_OPTIONS: { value: MedicamentoForma; label: string }[] = [
  { value: 'comprimido', label: 'Comprimido' },
  { value: 'capsula', label: 'Cápsula' },
  { value: 'ml', label: 'Solução (ml)' },
  { value: 'gota', label: 'Gotas' },
  { value: 'ampola', label: 'Ampola' },
  { value: 'sache', label: 'Sachê' },
  { value: 'outro', label: 'Outro' },
];

const FORMA_UNIT: Record<MedicamentoForma, string> = {
  comprimido: 'comp.', capsula: 'cáps.', ml: 'ml', gota: 'gotas', ampola: 'ampolas', sache: 'sachês', outro: 'unid.',
};

const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const GROUPS_PER_PAGE = 6;

const emptyForm = {
  residentId: '' as string,
  medicacaoId: '' as string,
  nome: '',
  principioAtivo: '',
  forma: 'comprimido' as MedicamentoForma,
  concentracaoValor: '',
  concentracaoUnidade: 'mg',
  unidadesPorEmbalagem: '',
  estoqueMinimoUnidades: '',
  dosePorTomada: '',
  tomadasPorDia: '',
  periodicidade: 'diaria' as 'diaria' | 'semanal',
  validade: '',
  lote: '',
  embalagensIniciais: '1',
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
};
const round2 = (n?: number | null) => {
  if (n == null || !Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

// Chave única de status por item, reaproveitada tanto no filtro quanto no
// badge (mesma prioridade: Vencido > Repor > Vencendo > Regular).
const itemStatusKey = (i: MedicamentoInventarioItem): 'vencido' | 'repor' | 'vencendo' | 'regular' => {
  if (isVencido(i)) return 'vencido';
  if (isBaixoEstoque(i)) return 'repor';
  if (isVencendo(i)) return 'vencendo';
  return 'regular';
};
const STATUS_PRIORITY: Record<ReturnType<typeof itemStatusKey>, number> = { regular: 0, vencendo: 1, repor: 2, vencido: 3 };

const SORT_LABELS: Record<'nome' | 'saldo' | 'cobertura' | 'status' | 'validade', string> = {
  nome: 'Nome', saldo: 'Saldo', cobertura: 'Cobertura', status: 'Status', validade: 'Validade',
};

const MedicationInventoryTab: React.FC<Props> = ({ residents = [] }) => {
  const { currentUser, hasPermission } = useAuth();
  const canCreate = hasPermission(ViewState.STOCK, 'create');
  const canEdit = hasPermission(ViewState.STOCK, 'edit');
  const empresaId = currentUser?.empresaId;

  const [items, setItems] = useState<MedicamentoInventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'regular' | 'vencendo' | 'repor' | 'vencido'>('');
  const [vinculoFilter, setVinculoFilter] = useState<'' | 'residente' | 'geral'>('');
  const [sortBy, setSortBy] = useState<'nome' | 'saldo' | 'cobertura' | 'status' | 'validade'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [prescricoes, setPrescricoes] = useState<{ id: string; name: string; dosage: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [movTarget, setMovTarget] = useState<{ item: MedicamentoInventarioItem; tipo: 'administracao' | 'entrada' } | null>(null);
  const [movQty, setMovQty] = useState('');
  const [historyItem, setHistoryItem] = useState<MedicamentoInventarioItem | null>(null);
  const modalMouseDown = useRef(false);
  // Dispensa o banner de "próximos de acabar" só nesta montagem do componente —
  // não persiste em storage nenhum, então sair da aba/menu e voltar remonta o
  // componente e o alerta volta a aparecer normalmente, de propósito.
  const [alertDismissed, setAlertDismissed] = useState(false);

  const residentName = (id?: string) => residents.find(r => r.id === id)?.name;

  const load = async () => {
    // Ambiente demo (marketing) não tem empresaId — não consultar o Supabase.
    if (!empresaId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchInventario(empresaId);
      setItems(data);
    } catch (err) {
      console.error('Erro ao carregar inventário de medicamentos:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [empresaId]);

  useEffect(() => {
    if (!showSortMenu) return;
    const close = () => setShowSortMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showSortMenu]);

  // Carrega prescrições do residente selecionado no formulário (para vincular medicacao_id)
  useEffect(() => {
    if (!form.residentId) { setPrescricoes([]); return; }
    let active = true;
    fetchPrescricoesResidente(form.residentId)
      .then(list => { if (active) setPrescricoes(list.map(p => ({ id: p.id, name: p.name, dosage: p.dosage }))); })
      .catch(() => { if (active) setPrescricoes([]); });
    return () => { active = false; };
  }, [form.residentId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      const matchesSearch = !q ||
        i.nome.toLowerCase().includes(q) ||
        (i.principioAtivo || '').toLowerCase().includes(q) ||
        (residentName(i.residentId) || '').toLowerCase().includes(q);
      const matchesStatus = !statusFilter || itemStatusKey(i) === statusFilter;
      const matchesVinculo = !vinculoFilter || (vinculoFilter === 'residente' ? !!i.residentId : !i.residentId);
      return matchesSearch && matchesStatus && matchesVinculo;
    });
  }, [items, search, statusFilter, vinculoFilter, residents]);

  // Mesmo medicamento (nome + forma + concentração) usado por vários residentes
  // agrupado num card só, para não repetir o cabeçalho na lista.
  // A ordenação usa o pior/mais urgente item de cada grupo (menor saldo, menor
  // cobertura, status mais crítico, validade mais próxima) já que um grupo pode
  // ter vários residentes com situações diferentes.
  const groups = useMemo(() => {
    const base = agruparPorMedicamento(filtered, residentName);
    const groupValue = (group: MedicamentoInventarioItem[]): number | string => {
      switch (sortBy) {
        case 'nome': return group[0].nome.toLowerCase();
        case 'saldo': return Math.min(...group.map(i => i.saldoUnidades));
        case 'cobertura': return Math.min(...group.map(i => diasCobertura(i) ?? Infinity));
        case 'status': return Math.max(...group.map(i => STATUS_PRIORITY[itemStatusKey(i)]));
        case 'validade': return Math.min(...group.map(i => i.validade ? new Date(i.validade).getTime() : Infinity));
        default: return 0;
      }
    };
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      const va = groupValue(a);
      const vb = groupValue(b);
      const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : (va as number) - (vb as number);
      return cmp * dir;
    });
  }, [filtered, residents, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(groups.length / GROUPS_PER_PAGE));
  const paginatedGroups = useMemo(
    () => groups.slice((currentPage - 1) * GROUPS_PER_PAGE, currentPage * GROUPS_PER_PAGE),
    [groups, currentPage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, vinculoFilter, sortBy, sortOrder]);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const hasActiveFilters = !!search || !!statusFilter || !!vinculoFilter || sortBy !== 'nome' || sortOrder !== 'asc';
  const clearFilters = () => { setSearch(''); setStatusFilter(''); setVinculoFilter(''); setSortBy('nome'); setSortOrder('asc'); };

  const criticalCount = items.filter(i => isBaixoEstoque(i) || isVencido(i)).length;

  // Medicamentos próximos de acabar (esgotado, cobertura ≤ limiar, ou abaixo do mínimo),
  // agrupados por medicamento — o mesmo remédio usado por vários residentes vira uma
  // linha só no alerta em vez de repetir o cabeçalho por residente.
  const alertGroups = useMemo(() => {
    const withMotivo = items
      .filter(i => precisaReposicao(i))
      .map(i => ({ item: i, motivo: motivoReposicao(i)! }));
    const cmp = (a: typeof withMotivo[number], b: typeof withMotivo[number]) =>
      Number(b.motivo.critico) - Number(a.motivo.critico) || a.item.saldoUnidades - b.item.saldoUnidades;
    const byKey = new Map<string, typeof withMotivo>();
    for (const entry of withMotivo) {
      const key = chaveAgrupamento(entry.item);
      const list = byKey.get(key);
      if (list) list.push(entry);
      else byKey.set(key, [entry]);
    }
    return Array.from(byKey.values())
      .map(group => group.slice().sort(cmp))
      .sort((a, b) => cmp(a[0], b[0]));
  }, [items]);

  const openForm = () => { setForm({ ...emptyForm }); setPrescricoes([]); setIsFormOpen(true); };

  // Se o nome digitado já bate com um medicamento existente no inventário (outro
  // residente), pré-preenche forma/concentração/embalagem a partir dele — evita
  // que "Dipirona" vs "Dipirona 500mg" virem grupos diferentes por digitação
  // inconsistente. Só entra em ação se a concentração ainda não foi preenchida
  // manualmente (sinal de que o usuário ainda não customizou os campos).
  const applyPrefillFromExisting = (nome: string, current: typeof emptyForm): typeof emptyForm => {
    if (current.concentracaoValor) return current;
    const alvo = nome.trim().toLowerCase();
    if (!alvo) return current;
    const match = items.find(i => i.nome.trim().toLowerCase() === alvo);
    if (!match) return current;
    return {
      ...current,
      forma: match.forma,
      concentracaoValor: String(match.concentracaoValor),
      concentracaoUnidade: match.concentracaoUnidade,
      unidadesPorEmbalagem: match.unidadesPorEmbalagem != null ? String(match.unidadesPorEmbalagem) : current.unidadesPorEmbalagem,
    };
  };

  // Demo de marketing (sem empresa) — inventário indisponível
  if (!empresaId) {
    return (
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 py-16 flex flex-col items-center gap-3 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Pill className="h-7 w-7 text-blue-300" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Inventário de Medicamentos</p>
        <p className="text-xs text-slate-400 max-w-md">
          Disponível no ambiente da instituição. Cadastre medicamentos com concentração e posologia para calcular a duração e debitar o saldo a cada dose.
        </p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.concentracaoValor) return;

    if (form.validade && isBeforeToday(form.validade)) {
      await systemDialog.alert({
        title: 'Data de validade inválida',
        message: 'A data de validade não pode ser anterior à data atual.',
        tone: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const input: NovoInventarioInput = {
        residentId: form.residentId || undefined,
        medicacaoId: form.medicacaoId || undefined,
        nome: form.nome.trim(),
        principioAtivo: form.principioAtivo.trim() || undefined,
        forma: form.forma,
        concentracaoValor: parseFloat(form.concentracaoValor),
        concentracaoUnidade: form.concentracaoUnidade.trim() || 'mg',
        unidadesPorEmbalagem: form.unidadesPorEmbalagem ? parseFloat(form.unidadesPorEmbalagem) : undefined,
        estoqueMinimoUnidades: form.estoqueMinimoUnidades ? parseFloat(form.estoqueMinimoUnidades) : 0,
        dosePorTomada: form.dosePorTomada ? parseFloat(form.dosePorTomada) : undefined,
        tomadasPorDia: form.tomadasPorDia
          ? (form.periodicidade === 'semanal' ? parseFloat(form.tomadasPorDia) / 7 : parseFloat(form.tomadasPorDia))
          : undefined,
        validade: form.validade || undefined,
        lote: form.lote.trim() || undefined,
      };
      await addInventarioItem(input, form.embalagensIniciais ? parseFloat(form.embalagensIniciais) : 0, currentUser?.name);
      setIsFormOpen(false);
      await load();
    } catch (err) {
      console.error('Erro ao cadastrar medicamento:', err);
      await systemDialog.alert({
        title: 'Não foi possível cadastrar',
        message: 'Verifique os dados do medicamento e tente novamente.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const openMov = (item: MedicamentoInventarioItem, tipo: 'administracao' | 'entrada') => {
    setMovTarget({ item, tipo });
    if (tipo === 'administracao') {
      const upt = unidadesPorTomada(item);
      setMovQty(upt != null ? String(round2(upt)) : '1');
    } else {
      setMovQty(item.unidadesPorEmbalagem ? String(item.unidadesPorEmbalagem) : '');
    }
  };

  const handleMov = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movTarget) return;
    const qty = parseFloat(movQty);
    if (!qty || qty <= 0) return;
    setSaving(true);
    try {
      const notas = movTarget.tipo === 'administracao' ? 'Administração registrada manualmente' : 'Entrada manual';
      await registrarMovimentacao(movTarget.item.id, movTarget.tipo, qty, currentUser?.name, notas);
      setMovTarget(null);
      await load();
    } catch (err) {
      console.error('Erro ao registrar movimentação:', err);
      await systemDialog.alert({
        title: 'Movimentação não registrada',
        message: 'Não foi possível registrar a movimentação. Tente novamente.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MedicamentoInventarioItem) => {
    const confirmed = await systemDialog.confirm({
      title: 'Excluir medicamento do inventário?',
      message: `O medicamento “${item.nome}” e todo o seu histórico serão excluídos permanentemente.`,
      confirmLabel: 'Excluir medicamento',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteInventarioItem(item.id);
      await load();
    } catch (err) {
      console.error('Erro ao excluir medicamento:', err);
      await systemDialog.alert({
        title: 'Medicamento não excluído',
        message: 'Não foi possível excluir o medicamento. Tente novamente.',
        tone: 'error',
      });
    }
  };

  const statusBadge = (i: MedicamentoInventarioItem) => {
    if (isVencido(i)) return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> Vencido</span>;
    if (isBaixoEstoque(i)) return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> Repor</span>;
    if (isVencendo(i)) return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full"><CalendarClock className="h-3 w-3" /> Vencendo</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Regular</span>;
  };

  // Pior status entre os itens de um grupo (Vencido > Repor > Vencendo > Regular),
  // usado como badge único no cabeçalho do card agrupado.
  const statusPriority = (i: MedicamentoInventarioItem) => (isVencido(i) ? 3 : isBaixoEstoque(i) ? 2 : isVencendo(i) ? 1 : 0);
  const groupStatusBadge = (group: MedicamentoInventarioItem[]) =>
    statusBadge(group.reduce((worst, i) => (statusPriority(i) > statusPriority(worst) ? i : worst), group[0]));

  // Linha compacta de um residente dentro de um card agrupado — mesmas ações do
  // card individual (Registrar dose / Nova entrada / Histórico / Excluir), só
  // sem repetir o cabeçalho do medicamento (que fica uma vez só, no card pai).
  const renderGroupRow = (item: MedicamentoInventarioItem) => {
    const dias = diasCobertura(item);
    const unit = FORMA_UNIT[item.forma];
    const low = isBaixoEstoque(item) || isVencido(item);
    return (
      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-4 py-3">
        <div className="flex items-center gap-2 sm:w-40 shrink-0 min-w-0">
          {item.residentId ? (
            <img src={residentAvatarSrc(residentName(item.residentId) || '', undefined)} alt="" className="w-6 h-6 rounded-md object-cover border border-slate-100 shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-slate-400" />
            </div>
          )}
          <span className="text-sm font-semibold text-slate-700 truncate">{item.residentId ? (residentName(item.residentId) || 'Residente') : 'Uso geral'}</span>
        </div>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <p className={`text-sm font-bold shrink-0 ${low ? 'text-rose-600' : 'text-slate-800'}`}>
            {round2(item.saldoUnidades)} <span className="text-[10px] text-slate-400 font-normal">{unit}</span>
          </p>
          <p className="text-xs text-slate-500 shrink-0">
            {dias != null ? (dias > 36500 ? '>100 anos' : `${dias} dias`) : '—'}
          </p>
          <p className="hidden md:block text-xs text-slate-400 truncate">
            {item.dosePorTomada && item.tomadasPorDia
              ? `${round2(item.dosePorTomada)} ${item.concentracaoUnidade}/tomada · ${formatTomadasPorDia(item.tomadasPorDia)}`
              : 'Posologia não definida'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canEdit && (
            <>
              <button onClick={() => openMov(item, 'administracao')} className="w-8 h-8 rounded-lg hover:bg-rose-50 border border-slate-100 flex items-center justify-center transition-colors" title="Registrar dose">
                <Minus className="h-3.5 w-3.5 text-rose-600" />
              </button>
              <button onClick={() => openMov(item, 'entrada')} className="w-8 h-8 rounded-lg hover:bg-emerald-50 border border-slate-100 flex items-center justify-center transition-colors" title="Nova entrada">
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
              </button>
            </>
          )}
          <button onClick={() => setHistoryItem(item)} className="w-8 h-8 rounded-lg hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition-colors" title="Histórico">
            <History className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {canEdit && (
            <button onClick={() => handleDelete(item)} className="w-8 h-8 rounded-lg hover:bg-rose-50 border border-slate-100 flex items-center justify-center transition-colors" title="Excluir">
              <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub Header */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2"><Pill className="h-4 w-4 text-blue-600" /> Inventário de Medicamentos</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            {items.length} medicamento{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''}
            {criticalCount > 0 ? ` · ${criticalCount} em atenção` : ''} · baixa por posologia
          </p>
        </div>
        {canCreate && (
          <button onClick={openForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 whitespace-nowrap">
            <Plus className="h-4 w-4" /> Novo Medicamento
          </button>
        )}
      </div>

      {/* Busca + Filtros + Ordenação */}
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar medicamento ou residente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5 hidden sm:inline">Status:</span>
            {([['', 'Todos'], ['regular', 'Regular'], ['vencendo', 'Vencendo'], ['repor', 'Repor'], ['vencido', 'Vencido']] as const).map(([val, label]) => {
              const active = statusFilter === val;
              const colorMap: Record<string, string> = {
                '': active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                'regular': active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                'vencendo': active ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                'repor': active ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                'vencido': active ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
              };
              return (
                <button key={val} onClick={() => setStatusFilter(val)} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${colorMap[val]}`}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Filtro de vínculo */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5 hidden sm:inline">Vínculo:</span>
            {([['', 'Todos'], ['residente', 'Residente'], ['geral', 'Uso geral']] as const).map(([val, label]) => {
              const active = vinculoFilter === val;
              return (
                <button
                  key={val}
                  onClick={() => setVinculoFilter(val)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Ordenação */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowSortMenu(v => !v); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ordenar: </span>
              {SORT_LABELS[sortBy]}
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-100 rounded-xl shadow-lg py-1 min-w-[160px]">
                {(['nome', 'saldo', 'cobertura', 'status', 'validade'] as const).map(val => (
                  <button
                    key={val}
                    onClick={() => { setSortBy(val); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${sortBy === val ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {SORT_LABELS[val]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
          >
            {sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}</span>
          </button>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
            <span className="text-[11px] text-slate-400">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
            <button onClick={clearFilters} className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold transition-colors">
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Card de alerta: medicamentos próximos de acabar */}
      {!loading && !alertDismissed && alertGroups.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                {(() => {
                  const total = alertGroups.reduce((sum, g) => sum + g.length, 0);
                  return (
                    <h3 className="font-bold text-amber-900 text-sm">
                      {total} medicamento{total !== 1 ? 's' : ''} próximo{total !== 1 ? 's' : ''} de acabar
                    </h3>
                  );
                })()}
                <p className="text-[11px] text-amber-700/80">Cobertura de até {LIMITE_DIAS_REPOSICAO} dias, abaixo do mínimo ou esgotado — considere repor.</p>
              </div>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              className="w-8 h-8 shrink-0 rounded-lg hover:bg-amber-100 flex items-center justify-center transition-colors"
              title="Dispensar alerta (volta a aparecer se você sair desta aba e voltar)"
            >
              <X className="h-4 w-4 text-amber-700" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {alertGroups.map(group => {
              const { item, motivo } = group[0];
              const key = chaveAgrupamento(item);
              if (group.length === 1) {
                return (
                  <div key={key} className={`flex items-center justify-between gap-3 bg-white rounded-xl border px-3 py-2.5 ${motivo.critico ? 'border-rose-200' : 'border-amber-100'}`}>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {item.nome} <span className="text-xs text-slate-400 font-normal">{round2(item.concentracaoValor)}{item.concentracaoUnidade}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.residentId ? (residentName(item.residentId) || 'Residente') : 'Uso geral'} · saldo {round2(item.saldoUnidades)} {FORMA_UNIT[item.forma]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${motivo.critico ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                        {motivo.label}
                      </span>
                      {canEdit && (
                        <button onClick={() => openMov(item, 'entrada')} className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                          Repor
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              // Mais de um residente com o mesmo medicamento em falta: uma linha só,
              // sem atalho "Repor" (ambíguo pra qual residente) — o card agrupado na
              // lista principal tem o botão certo por residente.
              return (
                <div key={key} className={`flex items-center justify-between gap-3 bg-white rounded-xl border px-3 py-2.5 ${motivo.critico ? 'border-rose-200' : 'border-amber-100'}`}>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {item.nome} <span className="text-xs text-slate-400 font-normal">{round2(item.concentracaoValor)}{item.concentracaoUnidade}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {group.length} residentes com estoque baixo · pior: {item.residentId ? (residentName(item.residentId) || 'Residente') : 'Uso geral'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${motivo.critico ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                    {motivo.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Carregando inventário...</div>
      ) : groups.length === 0 && items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 py-16 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <PackageSearch className="h-7 w-7 text-blue-200" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Nenhum medicamento no inventário.</p>
          <p className="text-xs text-slate-400 max-w-md">
            Cadastre um medicamento com sua concentração (ex.: 10&nbsp;mg/comprimido), a embalagem (ex.: cartela de 12) e a posologia do residente. O sistema calcula a duração e debita o saldo a cada dose tomada.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 py-16 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
            <PackageSearch className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Nenhum medicamento encontrado com esses filtros.</p>
          <button onClick={clearFilters} className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[70vh] overflow-y-auto overscroll-contain pr-1" aria-label="Lista do inventário de medicamentos">
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {paginatedGroups.map(group => {
            // Um único residente nesse medicamento: card de sempre, sem chrome extra.
            if (group.length === 1) {
              const item = group[0];
              const upt = unidadesPorTomada(item);
              const cd = consumoDiario(item);
              const dias = diasCobertura(item);
              const termino = dataTerminoPrevista(item);
              const unit = FORMA_UNIT[item.forma];
              const low = isBaixoEstoque(item) || isVencido(item);
              return (
                <div key={item.id} className={`bg-white rounded-2xl shadow-sm shadow-blue-100/40 border p-4 ${low ? 'border-rose-200' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Pill className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{item.nome}</h3>
                        <p className="text-xs text-slate-500">
                          {round2(item.concentracaoValor)} {item.concentracaoUnidade}/{unit.replace('.', '')} · {FORMA_OPTIONS.find(f => f.value === item.forma)?.label}
                        </p>
                      </div>
                    </div>
                    {statusBadge(item)}
                  </div>

                  {/* Residente vinculado */}
                  {item.residentId && (
                    <div className="flex items-center gap-2 mb-3">
                      <img src={residentAvatarSrc(residentName(item.residentId) || '', undefined)} alt="" className="w-5 h-5 rounded-md object-cover border border-slate-100" />
                      <span className="text-xs text-slate-500">{residentName(item.residentId) || 'Residente'}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Saldo</p>
                      <p className={`text-2xl font-bold ${low ? 'text-rose-600' : 'text-slate-800'}`}>
                        {round2(item.saldoUnidades)} <span className="text-xs text-slate-400 font-normal">{unit}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Mín: {round2(item.estoqueMinimoUnidades)} {unit}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Cobertura</p>
                      {dias != null ? (
                        <>
                          <p className="text-2xl font-bold text-slate-800">
                            {dias > 36500 ? '>100 anos' : `${dias} dias`}
                          </p>
                          <p className="text-[10px] text-slate-400">Término prev.: {termino ? fmtDate(termino) : 'Longínquo'}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">Defina a posologia para calcular</p>
                      )}
                    </div>
                  </div>

                  {/* Posologia */}
                  <div className="bg-blue-50/50 border border-blue-100/60 rounded-xl px-3 py-2 mb-3">
                    {item.dosePorTomada && item.tomadasPorDia ? (
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Posologia:</span>{' '}
                        {round2(item.dosePorTomada)} {item.concentracaoUnidade}/tomada · {formatTomadasPorDia(item.tomadasPorDia)}
                        {upt != null && <span className="text-slate-400"> = {round2(upt)} {unit}/tomada · {cd != null ? round2(cd) : '—'} {unit}/dia</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Posologia não definida.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <>
                        <button onClick={() => openMov(item, 'administracao')} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-colors">
                          <Minus className="h-3.5 w-3.5" /> Registrar dose
                        </button>
                        <button onClick={() => openMov(item, 'entrada')} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-colors">
                          <Plus className="h-3.5 w-3.5" /> Nova entrada
                        </button>
                      </>
                    )}
                    <button onClick={() => setHistoryItem(item)} className="w-9 h-9 shrink-0 rounded-xl hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition-colors" title="Histórico">
                      <History className="h-4 w-4 text-slate-400" />
                    </button>
                    {canEdit && (
                      <button onClick={() => handleDelete(item)} className="w-9 h-9 shrink-0 rounded-xl hover:bg-rose-50 border border-slate-100 flex items-center justify-center transition-colors" title="Excluir">
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-rose-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // Vários residentes tomam o mesmo medicamento: um card só, cabeçalho
            // único, uma linha compacta por residente (cada um com seu próprio
            // saldo/posologia/ações).
            const key = chaveAgrupamento(group[0]);
            return (
              <div key={key} className={`bg-white rounded-2xl shadow-sm shadow-blue-100/40 border overflow-hidden ${group.some(i => isBaixoEstoque(i) || isVencido(i)) ? 'border-rose-200' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Pill className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{group[0].nome}</h3>
                      <p className="text-xs text-slate-500">
                        {round2(group[0].concentracaoValor)} {group[0].concentracaoUnidade}/{FORMA_UNIT[group[0].forma].replace('.', '')} · {FORMA_OPTIONS.find(f => f.value === group[0].forma)?.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full whitespace-nowrap">
                      <Users className="h-3 w-3" /> {group.length} residentes
                    </span>
                    {groupStatusBadge(group)}
                  </div>
                </div>
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {group.map(item => renderGroupRow(item))}
                </div>
              </div>
            );
          })}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm shadow-blue-100/40">
              <p className="text-xs text-slate-500">
                Exibindo {(currentPage - 1) * GROUPS_PER_PAGE + 1}–{Math.min(currentPage * GROUPS_PER_PAGE, groups.length)} de {groups.length} grupos
              </p>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </button>
                <span className="min-w-20 text-center text-xs font-semibold text-slate-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Novo Medicamento */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setIsFormOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden" onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-slate-900">Novo Medicamento</h3>
                <p className="text-xs text-slate-500 mt-0.5">Concentração, embalagem e posologia para o cálculo de duração</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Medicamento</label>
                  <MedicationAutocomplete
                    required
                    value={form.nome}
                    onChange={nome => setForm(current => applyPrefillFromExisting(nome, { ...current, nome }))}
                    onSelect={medication => setForm(current => applyPrefillFromExisting(medication.nomeProduto, {
                      ...current,
                      nome: medication.nomeProduto,
                      principioAtivo: medication.principioAtivo || current.principioAtivo,
                    }))}
                    placeholder="Busque pelo nome na ANVISA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Princípio ativo (opcional)</label>
                  <input type="text" value={form.principioAtivo} onChange={e => setForm({ ...form, principioAtivo: e.target.value })} className={inputClass} placeholder="Ex: Losartana potássica" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Forma farmacêutica</label>
                  <CustomSelect value={form.forma} onChange={v => setForm({ ...form, forma: v as MedicamentoForma })} options={FORMA_OPTIONS.map(f => ({ value: f.value, label: f.label }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Concentração por unidade</label>
                  <input required type="number" step="any" min="0" value={form.concentracaoValor} onChange={e => setForm({ ...form, concentracaoValor: e.target.value })} className={inputClass} placeholder="Ex: 10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidade da concentração</label>
                  <input type="text" value={form.concentracaoUnidade} onChange={e => setForm({ ...form, concentracaoUnidade: e.target.value })} className={inputClass} placeholder="mg, mcg, mg/ml" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidades por embalagem</label>
                  <input type="number" step="any" min="0" value={form.unidadesPorEmbalagem} onChange={e => setForm({ ...form, unidadesPorEmbalagem: e.target.value })} className={inputClass} placeholder="Ex: 12 (cartela)" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Embalagens iniciais (entrada)</label>
                  <input type="number" step="any" min="0" value={form.embalagensIniciais} onChange={e => setForm({ ...form, embalagensIniciais: e.target.value })} className={inputClass} placeholder="Ex: 1" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Residente (opcional — deixe vazio para uso geral)</label>
                  <CustomSelect
                    value={form.residentId}
                    onChange={v => setForm({ ...form, residentId: v, medicacaoId: '' })}
                    placeholder="Uso geral"
                    options={[{ value: '', label: 'Uso geral (sem residente)' }, ...residents.map(r => ({ value: r.id, label: `${r.name} · Quarto ${r.room}` }))]}
                  />
                </div>
                {form.residentId && prescricoes.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Vincular à prescrição (para baixa via boletim)</label>
                    <CustomSelect
                      value={form.medicacaoId}
                      onChange={v => setForm({ ...form, medicacaoId: v })}
                      placeholder="Sem vínculo"
                      options={[{ value: '', label: 'Sem vínculo' }, ...prescricoes.map(p => ({ value: p.id, label: `${p.name} · ${p.dosage}` }))]}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dose por tomada ({form.concentracaoUnidade || 'mg'})</label>
                  <input type="number" step="any" min="0" value={form.dosePorTomada} onChange={e => setForm({ ...form, dosePorTomada: e.target.value })} className={inputClass} placeholder="Ex: 20" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600">
                      Tomadas por {form.periodicidade === 'semanal' ? 'semana' : 'dia'}
                    </label>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, periodicidade: 'diaria' })}
                        className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${form.periodicidade === 'diaria' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        Dia
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, periodicidade: 'semanal' })}
                        className={`px-2 py-0.5 text-[10px] font-semibold transition-colors border-l border-slate-200 ${form.periodicidade === 'semanal' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        Semana
                      </button>
                    </div>
                  </div>
                  <input type="number" step="any" min="0" value={form.tomadasPorDia} onChange={e => setForm({ ...form, tomadasPorDia: e.target.value })} className={inputClass} placeholder="Ex: 1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estoque mínimo (unidades)</label>
                  <input type="number" step="any" min="0" value={form.estoqueMinimoUnidades} onChange={e => setForm({ ...form, estoqueMinimoUnidades: e.target.value })} className={inputClass} placeholder="Ex: 4" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Validade</label>
                  <input type="date" min={getTodayDateString()} value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Lote (opcional)</label>
                  <input type="text" value={form.lote} onChange={e => setForm({ ...form, lote: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors">{saving ? 'Salvando...' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Movimentação (administração / entrada) */}
      {movTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setMovTarget(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{movTarget.tipo === 'administracao' ? 'Registrar administração' : 'Nova entrada'}</h3>
              <button onClick={() => setMovTarget(null)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleMov} className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                {movTarget.item.nome} · saldo atual <span className="font-bold">{round2(movTarget.item.saldoUnidades)} {FORMA_UNIT[movTarget.item.forma]}</span>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {movTarget.tipo === 'administracao' ? 'Unidades a debitar' : 'Unidades a adicionar'} ({FORMA_UNIT[movTarget.item.forma]})
                </label>
                <input autoFocus required type="number" step="any" min="0" value={movQty} onChange={e => setMovQty(e.target.value)} className={inputClass} />
                {movTarget.tipo === 'administracao' && unidadesPorTomada(movTarget.item) != null && (
                  <p className="text-[11px] text-slate-400 mt-1">Sugerido: {round2(unidadesPorTomada(movTarget.item)!)} {FORMA_UNIT[movTarget.item.forma]} por tomada (posologia).</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setMovTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className={`flex-1 py-2.5 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${movTarget.tipo === 'administracao' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {saving ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Histórico */}
      {historyItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setHistoryItem(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden" onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-slate-900">Histórico de Movimentações</h3>
                <p className="text-xs text-slate-500 mt-0.5">{historyItem.nome}</p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {historyItem.movimentacoes && historyItem.movimentacoes.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-slate-100">
                    <tr>{['Data', 'Tipo', 'Qtd', 'Responsável'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {historyItem.movimentacoes.map(mov => (
                      <tr key={mov.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-xs text-slate-600">{new Date(mov.data).toLocaleString('pt-BR')}</td>
                        <td className="px-5 py-3">
                          {mov.tipo === 'entrada'
                            ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ArrowUpCircle className="h-3.5 w-3.5" /> Entrada</span>
                            : mov.tipo === 'administracao'
                            ? <span className="flex items-center gap-1 text-xs font-semibold text-rose-600"><ArrowDownCircle className="h-3.5 w-3.5" /> Administração</span>
                            : <span className="text-xs text-slate-500 capitalize">{mov.tipo}</span>}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-800">{round2(mov.quantidadeUnidades)} {FORMA_UNIT[historyItem.forma]}</td>
                        <td className="px-5 py-3 text-xs text-slate-500">{mov.userName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 flex flex-col items-center gap-3">
                  <History className="h-8 w-8 text-slate-200" />
                  <p className="text-sm text-slate-400">Nenhuma movimentação registrada.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setHistoryItem(null)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationInventoryTab;
