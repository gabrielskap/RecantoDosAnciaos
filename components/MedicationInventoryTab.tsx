import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pill, Plus, X, Search, AlertTriangle, CheckCircle2, CalendarClock,
  History, ArrowDownCircle, ArrowUpCircle, PackageSearch, Trash2, Minus,
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
  motivoReposicao, LIMITE_DIAS_REPOSICAO, NovoInventarioInput,
} from '../services/medicationInventoryService';

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
  validade: '',
  lote: '',
  embalagensIniciais: '1',
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '—');
const round2 = (n: number) => Math.round(n * 100) / 100;

const MedicationInventoryTab: React.FC<Props> = ({ residents = [] }) => {
  const { currentUser, hasPermission } = useAuth();
  const canCreate = hasPermission(ViewState.STOCK, 'create');
  const canEdit = hasPermission(ViewState.STOCK, 'edit');
  const empresaId = currentUser?.empresaId;

  const [items, setItems] = useState<MedicamentoInventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [prescricoes, setPrescricoes] = useState<{ id: string; name: string; dosage: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [movTarget, setMovTarget] = useState<{ item: MedicamentoInventarioItem; tipo: 'administracao' | 'entrada' } | null>(null);
  const [movQty, setMovQty] = useState('');
  const [historyItem, setHistoryItem] = useState<MedicamentoInventarioItem | null>(null);
  const modalMouseDown = useRef(false);

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
    if (!q) return items;
    return items.filter(i =>
      i.nome.toLowerCase().includes(q) ||
      (i.principioAtivo || '').toLowerCase().includes(q) ||
      (residentName(i.residentId) || '').toLowerCase().includes(q)
    );
  }, [items, search, residents]);

  const criticalCount = items.filter(i => isBaixoEstoque(i) || isVencido(i)).length;

  // Medicamentos próximos de acabar (esgotado, cobertura ≤ limiar, ou abaixo do mínimo)
  const alertItems = useMemo(
    () => items
      .filter(i => precisaReposicao(i))
      .map(i => ({ item: i, motivo: motivoReposicao(i)! }))
      .sort((a, b) => Number(b.motivo.critico) - Number(a.motivo.critico) || a.item.saldoUnidades - b.item.saldoUnidades),
    [items]
  );

  const openForm = () => { setForm({ ...emptyForm }); setPrescricoes([]); setIsFormOpen(true); };

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
        tomadasPorDia: form.tomadasPorDia ? parseFloat(form.tomadasPorDia) : undefined,
        validade: form.validade || undefined,
        lote: form.lote.trim() || undefined,
      };
      await addInventarioItem(input, form.embalagensIniciais ? parseFloat(form.embalagensIniciais) : 0, currentUser?.name);
      setIsFormOpen(false);
      await load();
    } catch (err) {
      console.error('Erro ao cadastrar medicamento:', err);
      alert('Não foi possível cadastrar o medicamento. Verifique os dados e tente novamente.');
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
      alert('Não foi possível registrar a movimentação.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MedicamentoInventarioItem) => {
    if (!confirm(`Excluir o medicamento "${item.nome}" e todo o seu histórico?`)) return;
    try {
      await deleteInventarioItem(item.id);
      await load();
    } catch (err) {
      console.error('Erro ao excluir medicamento:', err);
      alert('Não foi possível excluir o medicamento.');
    }
  };

  const statusBadge = (i: MedicamentoInventarioItem) => {
    if (isVencido(i)) return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> Vencido</span>;
    if (isBaixoEstoque(i)) return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> Repor</span>;
    if (isVencendo(i)) return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full"><CalendarClock className="h-3 w-3" /> Vencendo</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Regular</span>;
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
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar medicamento ou residente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {canCreate && (
            <button onClick={openForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 whitespace-nowrap">
              <Plus className="h-4 w-4" /> Novo Medicamento
            </button>
          )}
        </div>
      </div>

      {/* Card de alerta: medicamentos próximos de acabar */}
      {!loading && alertItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">
                {alertItems.length} medicamento{alertItems.length !== 1 ? 's' : ''} próximo{alertItems.length !== 1 ? 's' : ''} de acabar
              </h3>
              <p className="text-[11px] text-amber-700/80">Cobertura de até {LIMITE_DIAS_REPOSICAO} dias, abaixo do mínimo ou esgotado — considere repor.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {alertItems.map(({ item, motivo }) => (
              <div key={item.id} className={`flex items-center justify-between gap-3 bg-white rounded-xl border px-3 py-2.5 ${motivo.critico ? 'border-rose-200' : 'border-amber-100'}`}>
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
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Carregando inventário...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 py-16 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <PackageSearch className="h-7 w-7 text-blue-200" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Nenhum medicamento no inventário.</p>
          <p className="text-xs text-slate-400 max-w-md">
            Cadastre um medicamento com sua concentração (ex.: 10&nbsp;mg/comprimido), a embalagem (ex.: cartela de 12) e a posologia do residente. O sistema calcula a duração e debita o saldo a cada dose tomada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(item => {
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
                        <p className="text-2xl font-bold text-slate-800">{dias} <span className="text-xs text-slate-400 font-normal">dias</span></p>
                        <p className="text-[10px] text-slate-400">Término prev.: {fmtDate(termino)}</p>
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
                      {round2(item.dosePorTomada)} {item.concentracaoUnidade}/tomada · {round2(item.tomadasPorDia)}x/dia
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
          })}
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
                    onChange={nome => setForm(current => ({ ...current, nome }))}
                    onSelect={medication => setForm(current => ({
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tomadas por dia</label>
                  <input type="number" step="any" min="0" value={form.tomadasPorDia} onChange={e => setForm({ ...form, tomadasPorDia: e.target.value })} className={inputClass} placeholder="Ex: 1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estoque mínimo (unidades)</label>
                  <input type="number" step="any" min="0" value={form.estoqueMinimoUnidades} onChange={e => setForm({ ...form, estoqueMinimoUnidades: e.target.value })} className={inputClass} placeholder="Ex: 4" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Validade</label>
                  <input type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} className={inputClass} />
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
