import React, { useState, useEffect } from 'react';
import { Utensils, AlertTriangle, CheckCircle2, PieChart as PieIcon, FileText, Droplets, Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import { Resident, DietPlan, DietConsistency, DietType, MealTime, NutritionalLog, ViewState } from '../types';
import { PieChart as RechartPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { residentAvatarSrc } from '../lib/avatar';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../services/toast';

interface NutritionModuleProps {
  residents: Resident[];
  onUpdateResident: (resident: Resident) => Promise<void> | void;
}

const LEGACY_NUTRITION_PLAN_DRAFT_KEYS = [
  'recanto_nutrition_show_modal',
  'recanto_nutrition_new_plan_resident_id',
  'recanto_nutrition_new_plan_consistency',
  'recanto_nutrition_new_plan_type',
  'recanto_nutrition_new_plan_fluid_restriction',
  'recanto_nutrition_new_plan_restrictions',
  'recanto_nutrition_new_plan_restriction_input',
  'recanto_nutrition_new_plan_observations',
];

const NutritionModule: React.FC<NutritionModuleProps> = ({ residents, onUpdateResident }) => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(ViewState.NUTRITION, 'create');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'plans'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') as 'dashboard' | 'daily' | 'plans' | null;
    if (tabParam && ['dashboard', 'daily', 'plans'].includes(tabParam)) {
      return tabParam;
    }
    return (localStorage.getItem('recanto_nutrition_active_tab') as any) || 'dashboard';
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    return localStorage.getItem('recanto_nutrition_selected_date') || new Date().toISOString().split('T')[0];
  });
  const [selectedMeal, setSelectedMeal] = useState<MealTime>(() => {
    return (localStorage.getItem('recanto_nutrition_selected_meal') as MealTime) || 'Almoço';
  });
  const [dailyGroup, setDailyGroup] = useState<'all' | 'general' | 'sarcopenia'>(() => {
    const saved = localStorage.getItem('recanto_nutrition_daily_group');
    return saved === 'general' || saved === 'sarcopenia' || saved === 'all' ? saved : 'all';
  });

  // New plan modal state
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [newPlanResidentId, setNewPlanResidentId] = useState('');
  const [newPlanConsistency, setNewPlanConsistency] = useState<DietConsistency>('Geral');
  const [newPlanType, setNewPlanType] = useState<DietType>('Livre');
  const [newPlanFluidRestriction, setNewPlanFluidRestriction] = useState('');
  const [newPlanRestrictions, setNewPlanRestrictions] = useState<string[]>([]);
  const [newPlanRestrictionInput, setNewPlanRestrictionInput] = useState('');
  const [newPlanObservations, setNewPlanObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null);
  const [deletingResident, setDeletingResident] = useState<Resident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [planSearchQuery, setPlanSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('recanto_nutrition_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('recanto_nutrition_selected_date', selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem('recanto_nutrition_selected_meal', selectedMeal);
  }, [selectedMeal]);

  useEffect(() => {
    localStorage.setItem('recanto_nutrition_daily_group', dailyGroup);
  }, [dailyGroup]);

  // Rascunhos nutricionais contêm restrições e observações clínicas. A partir
  // daqui eles ficam só no state até o plano ser confirmado no banco.
  useEffect(() => {
    LEGACY_NUTRITION_PLAN_DRAFT_KEYS.forEach(key => localStorage.removeItem(key));
  }, []);

  const clearNewPlanForm = () => {
    LEGACY_NUTRITION_PLAN_DRAFT_KEYS.forEach(key => localStorage.removeItem(key));

    setShowNewPlanModal(false);
    setEditingResidentId(null);
    setNewPlanResidentId('');
    setNewPlanConsistency('Geral');
    setNewPlanType('Livre');
    setNewPlanFluidRestriction('');
    setNewPlanRestrictions([]);
    setNewPlanRestrictionInput('');
    setNewPlanObservations('');
  };

  const openEditPlanModal = (resident: Resident) => {
    setEditingResidentId(resident.id);
    setNewPlanResidentId(resident.id);
    setNewPlanConsistency(resident.dietPlan?.consistency || 'Geral');
    setNewPlanType(resident.dietPlan?.type || 'Livre');
    setNewPlanFluidRestriction(resident.dietPlan?.fluidRestriction || '');
    setNewPlanRestrictions(resident.dietPlan?.restrictions || []);
    setNewPlanObservations(resident.dietPlan?.observations || '');
    setShowNewPlanModal(true);
  };

  const dietsCount = residents.reduce((acc, r) => {
    const type = r.dietPlan?.type || 'Não Definido';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dietChartData = Object.entries(dietsCount).map(([name, value]) => ({ name, value }));
  const COLORS = ['#1d4ed8', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

  const lowAcceptanceAlerts = residents.flatMap(r => {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return (r.nutritionalLogs?.filter(l => l.acceptance < 50 && l.date >= cutoff) || []).map(log => ({ resident: r.name, ...log }));
  });

  const handleBatchUpdate = (residentId: string, acceptance: number) => {
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;
    const idx = resident.nutritionalLogs?.findIndex(l => l.date === selectedDate && l.meal === selectedMeal);
    let logs = [...(resident.nutritionalLogs || [])];
    if (idx !== undefined && idx > -1) {
      logs[idx] = { ...logs[idx], acceptance };
    } else {
      logs.push({ id: Math.random().toString(36).substr(2, 9), date: selectedDate, meal: selectedMeal, acceptance });
    }
    onUpdateResident({ ...resident, nutritionalLogs: logs });
  };

  const handleCreatePlan = async () => {
    if (!newPlanResidentId || isSaving) return;
    const resident = residents.find(r => r.id === newPlanResidentId);
    if (!resident) return;
    setIsSaving(true);
    try {
      const plan: DietPlan = {
        consistency: newPlanConsistency,
        type: newPlanType,
        restrictions: newPlanRestrictions,
        fluidRestriction: newPlanFluidRestriction || undefined,
        observations: newPlanObservations || undefined,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateResident({ ...resident, dietPlan: plan });
      clearNewPlanForm();
      toast.success('Plano alimentar salvo com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar plano alimentar:', err);
      toast.error(err?.message || 'Erro ao salvar plano alimentar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDietUpdate = async (residentId: string, newPlan: Partial<DietPlan>) => {
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;
    const updated: DietPlan = {
      consistency: newPlan.consistency || resident.dietPlan?.consistency || 'Geral',
      type: newPlan.type || resident.dietPlan?.type || 'Livre',
      restrictions: resident.dietPlan?.restrictions || [],
      fluidRestriction: newPlan.fluidRestriction || resident.dietPlan?.fluidRestriction,
      observations: newPlan.observations || resident.dietPlan?.observations,
      updatedAt: new Date().toISOString(),
    };
    try {
      await onUpdateResident({ ...resident, dietPlan: updated });
      toast.success('Plano alimentar atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar plano alimentar:', err);
      toast.error(err?.message || 'Erro ao atualizar plano alimentar.');
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingResident || isDeleting) return;
    setIsDeleting(true);
    try {
      await onUpdateResident({ ...deletingResident, dietPlan: null as any });
      toast.success(`Plano alimentar de ${deletingResident.name} apagado com sucesso.`);
      setDeletingResident(null);
    } catch (err: any) {
      console.error('Erro ao apagar plano alimentar:', err);
      toast.error(err?.message || 'Erro ao apagar plano alimentar.');
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const tabs = [
    { id: 'dashboard', label: 'Visão Geral',    icon: PieIcon   },
    { id: 'daily',     label: 'Registro Diário', icon: Utensils  },
    { id: 'plans',     label: 'Planos Alimentares', icon: FileText },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Alimentação e Nutrição</h1>
          <p className="text-slate-500 text-sm mt-0.5">Dietas, aceitação alimentar e relatórios</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center"> <Utensils className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-1.5 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Low acceptance alerts */}
          <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Alertas de Baixa Aceitação</h3>
                <p className="text-xs text-slate-400">Últimos 3 dias — abaixo de 50%</p>
              </div>
            </div>
            <div className="px-5 pb-5 space-y-2.5 max-h-64 overflow-y-auto">
              {lowAcceptanceAlerts.length > 0 ? lowAcceptanceAlerts.map((a, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{a.resident}</p>
                    <p className="text-xs text-slate-500">{new Date(a.date).toLocaleDateString('pt-BR')} · {a.meal}</p>
                  </div>
                  <span className="font-bold text-rose-600 bg-white px-3 py-1 rounded-lg border border-rose-200 text-sm">{a.acceptance}%</span>
                </div>
              )) : (
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  <p className="text-sm text-slate-400">Nenhum alerta de baixa aceitação.</p>
                </div>
              )}
            </div>
          </div>

          {/* Diet distribution pie */}
          <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <PieIcon className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Distribuição de Dietas</h3>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height={208} minWidth={0}>
                <RechartPie>
                  <Pie data={dietChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                    {dietChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RechartPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* DAILY RECORD */}
      {activeTab === 'daily' && (() => {
        const sarcopeniaResidents = residents.filter(r => r.sarcopenia === 'sim');
        const generalResidents = residents.filter(r => r.sarcopenia !== 'sim');
        const displayedResidents = dailyGroup === 'sarcopenia'
          ? sarcopeniaResidents
          : dailyGroup === 'general'
            ? generalResidents
            : residents;
        const groupLabel = dailyGroup === 'sarcopenia'
          ? 'Sarcopenia'
          : dailyGroup === 'general'
            ? 'Alimentação geral'
            : 'Todos os residentes';

        return (
          <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-3 flex-wrap items-center">
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={inputClass + ' w-auto'} />
                <select value={selectedMeal} onChange={e => setSelectedMeal(e.target.value as MealTime)} className={inputClass + ' w-auto'}>
                  {['Café da Manhã', 'Colação', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={dailyGroup}
                  onChange={e => setDailyGroup(e.target.value as 'all' | 'general' | 'sarcopenia')}
                  className={inputClass + ' w-auto'}
                  aria-label="Grupo de residentes"
                >
                  <option value="all">Todos os residentes ({residents.length})</option>
                  <option value="general">Alimentação geral ({generalResidents.length})</option>
                  <option value="sarcopenia">Sarcopenia ({sarcopeniaResidents.length})</option>
                </select>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5 text-blue-400" /> Registro em lote · {groupLabel}</p>
            </div>

            {displayedResidents.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Utensils className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Nenhum residente neste grupo</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  Não há residentes cadastrados em “{groupLabel}” no momento.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="block md:hidden divide-y divide-slate-50 p-4 space-y-4">
                  {displayedResidents.map(r => {
                    const log = r.nutritionalLogs?.find(l => l.date === selectedDate && l.meal === selectedMeal);
                    const acceptance = log ? log.acceptance : -1;
                    return (
                      <div key={r.id} className="bg-slate-50/60 rounded-2xl border border-slate-100 p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{r.name}</h4>
                            <p className="text-xs text-slate-400">Quarto {r.room}</p>
                            <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.sarcopenia === 'sim' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {r.sarcopenia === 'sim' ? 'Sarcopenia' : 'Alimentação geral'}
                            </span>
                          </div>
                          {acceptance !== -1
                            ? <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Salvo</span>
                            : <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">Pendente</span>}
                        </div>
                        {r.dietPlan && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.dietPlan.consistency}</span>
                            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.dietPlan.type}</span>
                            {r.dietPlan.fluidRestriction && <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Droplets className="h-3 w-3" /> Restrição Hídrica</span>}
                          </div>
                        )}
                        <div className="grid grid-cols-5 gap-1.5">
                          {[0, 25, 50, 75, 100].map(val => (
                            <button key={val} onClick={() => handleBatchUpdate(r.id, val)} className={`min-h-[44px] rounded-xl text-xs font-bold border transition-all ${acceptance === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                              {val}%
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100">
                      <tr>{['Residente', 'Dieta Prescrita', 'Aceitação (%)', 'Status'].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayedResidents.map(r => {
                        const log = r.nutritionalLogs?.find(l => l.date === selectedDate && l.meal === selectedMeal);
                        const acceptance = log ? log.acceptance : -1;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-800">{r.name}</p>
                              <p className={`text-[11px] mt-0.5 font-medium ${r.sarcopenia === 'sim' ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {r.sarcopenia === 'sim' ? 'Sarcopenia' : 'Alimentação geral'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              {r.dietPlan ? (
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.dietPlan.consistency}</span>
                                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.dietPlan.type}</span>
                                  {r.dietPlan.fluidRestriction && <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Droplets className="h-3 w-3" /> Restrição</span>}
                                </div>
                              ) : <span className="text-slate-400 italic text-xs">Não definida</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1.5">
                                {[0, 25, 50, 75, 100].map(val => (
                                  <button key={val} onClick={() => handleBatchUpdate(r.id, val)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${acceptance === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                                    {val}%
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {acceptance !== -1
                                ? <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Registrado</span>
                                : <span className="text-xs text-slate-400">Pendente</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* DIET PLANS */}
      {activeTab === 'plans' && (() => {
        const filteredResidents = residents.filter(r => {
          if (!planSearchQuery.trim()) return true;
          const query = planSearchQuery.toLowerCase().trim();
          return r.name.toLowerCase().includes(query) || (r.room && String(r.room).toLowerCase().includes(query));
        });

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar residente por nome ou quarto..."
                  value={planSearchQuery}
                  onChange={e => setPlanSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                {planSearchQuery && (
                  <button
                    onClick={() => setPlanSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {canCreate && (
                <button
                  onClick={() => setShowNewPlanModal(true)}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> Novo Plano Alimentar
                </button>
              )}
            </div>

            {filteredResidents.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm shadow-blue-100/40">
                <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">Nenhum residente encontrado</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
                  Não encontramos nenhum residente correspondente a "{planSearchQuery}".
                </p>
                <button
                  onClick={() => setPlanSearchQuery('')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredResidents.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={residentAvatarSrc(r.name, r.photoUrl)} alt="" className="w-10 h-10 rounded-xl object-cover border-2 border-blue-100 flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-800 text-sm truncate">{r.name}</h3>
                          <p className="text-xs text-slate-400">Quarto {r.room}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditPlanModal(r)}
                          title="Editar Plano Alimentar"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {r.dietPlan && (
                          <button
                            onClick={() => setDeletingResident(r)}
                            title="Apagar Plano Alimentar"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Consistência</label>
                        <select value={r.dietPlan?.consistency || 'Geral'} onChange={e => handleDietUpdate(r.id, { consistency: e.target.value as any })} className={inputClass}>
                          {['Geral', 'Branda', 'Pastosa', 'Líquida', 'Líquida-Pastosa'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Tipo</label>
                        <select value={r.dietPlan?.type || 'Livre'} onChange={e => handleDietUpdate(r.id, { type: e.target.value as any })} className={inputClass}>
                          {['Livre', 'Hipossódica', 'Diabética', 'Hipolipídica', 'Hiperproteica'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    {r.dietPlan?.fluidRestriction && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3 flex items-center gap-2 text-xs text-amber-800 font-medium">
                        <Droplets className="h-3.5 w-3.5 text-amber-500" /> {r.dietPlan.fluidRestriction}
                      </div>
                    )}

                    {r.dietPlan?.observations && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-3 text-xs text-slate-600 italic">
                        "{r.dietPlan.observations}"
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-2 block">Alergias e Restrições</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[...r.allergies, ...(r.dietPlan?.restrictions || [])].length > 0
                          ? [...r.allergies.map(a => ({ label: a, cls: 'bg-rose-50 text-rose-700' })), ...(r.dietPlan?.restrictions || []).map(x => ({ label: x, cls: 'bg-orange-50 text-orange-700' }))].map((tag, i) => (
                            <span key={i} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tag.cls}`}>{tag.label}</span>
                          ))
                          : <span className="text-xs text-slate-400 italic">Nenhuma restrição.</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* NEW PLAN MODAL */}
      {showNewPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">
                    {editingResidentId ? 'Editar Plano Alimentar' : 'Novo Plano Alimentar'}
                  </h2>
                  <p className="text-xs text-slate-400">Preencha os dados e vincule a um residente</p>
                </div>
              </div>
              <button onClick={clearNewPlanForm} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Residente *</label>
                <select
                  value={newPlanResidentId}
                  onChange={e => setNewPlanResidentId(e.target.value)}
                  disabled={!!editingResidentId}
                  className={inputClass + (editingResidentId ? ' bg-slate-100 cursor-not-allowed text-slate-600' : '')}
                >
                  <option value="">Selecione um residente...</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.id}>{r.name} — Quarto {r.room}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Consistência</label>
                  <select value={newPlanConsistency} onChange={e => setNewPlanConsistency(e.target.value as DietConsistency)} className={inputClass}>
                    {(['Geral', 'Branda', 'Pastosa', 'Líquida', 'Líquida-Pastosa'] as DietConsistency[]).map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tipo de Dieta</label>
                  <select value={newPlanType} onChange={e => setNewPlanType(e.target.value as DietType)} className={inputClass}>
                    {(['Livre', 'Hipossódica', 'Diabética', 'Hipolipídica', 'Hiperproteica'] as DietType[]).map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Restrição Hídrica</label>
                <input
                  type="text"
                  placeholder="Ex: 1500ml/dia"
                  value={newPlanFluidRestriction}
                  onChange={e => setNewPlanFluidRestriction(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Restrições Alimentares</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar restrição..."
                    value={newPlanRestrictionInput}
                    onChange={e => setNewPlanRestrictionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newPlanRestrictionInput.trim()) {
                        setNewPlanRestrictions(prev => [...prev, newPlanRestrictionInput.trim()]);
                        setNewPlanRestrictionInput('');
                        e.preventDefault();
                      }
                    }}
                    className={inputClass + ' flex-1'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPlanRestrictionInput.trim()) {
                        setNewPlanRestrictions(prev => [...prev, newPlanRestrictionInput.trim()]);
                        setNewPlanRestrictionInput('');
                      }
                    }}
                    className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {newPlanRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {newPlanRestrictions.map((item, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                        {item}
                        <button onClick={() => setNewPlanRestrictions(prev => prev.filter((_, j) => j !== i))} className="hover:text-orange-900 ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Observações</label>
                <textarea
                  rows={3}
                  placeholder="Observações nutricionais relevantes..."
                  value={newPlanObservations}
                  onChange={e => setNewPlanObservations(e.target.value)}
                  className={inputClass + ' resize-none'}
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={clearNewPlanForm}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePlan}
                disabled={!newPlanResidentId || isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? 'Salvando...' : 'Salvar Plano'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Apagar Plano Alimentar</h3>
            </div>

            <p className="text-sm text-slate-600">
              Tem certeza que deseja apagar o plano alimentar do residente <strong>{deletingResident.name}</strong>? Esta ação removerá a consistência, tipo de dieta, restrições e observações cadastradas.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingResident(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Apagando...' : 'Apagar Plano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionModule;
