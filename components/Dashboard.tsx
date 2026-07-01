import React, { useMemo } from 'react';
import {
  Users, AlertTriangle, TrendingUp, Calendar, Activity,
  PackageX, ShieldAlert, Wallet, Package, BedDouble,
  UserCog, Cake, ChevronRight, ArrowUpRight, ArrowDownRight,
  Clock, HeartPulse, Stethoscope,
} from 'lucide-react';
import {
  Resident, FinancialRecord, StockItem, CalendarEvent,
  Invoice, Employee, ViewState,
} from '../types';

interface DashboardProps {
  residents: Resident[];
  financials: FinancialRecord[];
  events?: CalendarEvent[];
  stockAlerts?: StockItem[];
  invoices?: Invoice[];
  employees?: Employee[];
  onNavigate?: (view: ViewState, residentId?: string) => void;
  isAdmin?: boolean;
}

const fmtCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

const EVENT_TYPE: Record<string, { dot: string; label: string }> = {
  medico:    { dot: 'bg-blue-500',    label: 'Médico'     },
  visita:    { dot: 'bg-emerald-500', label: 'Visita'     },
  terapia:   { dot: 'bg-violet-500',  label: 'Terapia'    },
  atividade: { dot: 'bg-amber-500',   label: 'Atividade'  },
  reuniao:   { dot: 'bg-slate-400',   label: 'Reunião'    },
  outro:     { dot: 'bg-gray-400',    label: 'Outro'      },
};

const CARE_GRADE = {
  I:   { label: 'Grau I — Independente',    bar: 'bg-blue-500',  badge: 'bg-blue-50 text-blue-700'  },
  II:  { label: 'Grau II — Semi-dependente', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700' },
  III: { label: 'Grau III — Dependente',    bar: 'bg-rose-500',  badge: 'bg-rose-50 text-rose-700'  },
};

const Dashboard: React.FC<DashboardProps> = ({
  residents, financials, events = [], stockAlerts = [],
  invoices = [], employees = [], onNavigate, isAdmin = false,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalResidents = residents.length;
  const capacity = 40;
  const occupancyRate = Math.round((totalResidents / capacity) * 100);
  const highCare = residents.filter(r => r.careLevel === 'III').length;
  const todayEvents = events.filter(e => e.start?.startsWith(todayStr));

  const monthlyRevenue = financials
    .filter(f => { const d = new Date(f.date); return f.type === 'receita' && d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
    .reduce((s, f) => s + f.amount, 0);

  const monthlyExpenses = financials
    .filter(f => { const d = new Date(f.date); return f.type === 'despesa' && d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
    .reduce((s, f) => s + f.amount, 0);

  const balance = monthlyRevenue - monthlyExpenses;
  const overdueCount = invoices.filter(inv => inv.status === 'Atrasado').length;
  const pendingCount = invoices.filter(inv => inv.status === 'Pendente').length;
  const overdueAmount = invoices.filter(inv => inv.status === 'Atrasado').reduce((s, inv) => s + inv.amount, 0);

  // ── Care distribution ──────────────────────────────────────────────────────
  const gradeI   = residents.filter(r => r.careLevel === 'I').length;
  const gradeII  = residents.filter(r => r.careLevel === 'II').length;
  const gradeIII = residents.filter(r => r.careLevel === 'III').length;
  const careTotal = Math.max(totalResidents, 1);

  // ── Upcoming events ────────────────────────────────────────────────────────
  const upcomingEvents = useMemo(() =>
    events
      .filter(e => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 6),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [events]);

  // ── Birthdays in next 30 days ──────────────────────────────────────────────
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    return residents
      .filter(r => r.birthDate)
      .map(r => {
        const bd = new Date(r.birthDate!);
        const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const days = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
        return { resident: r, days };
      })
      .filter(x => x.days <= 30)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [residents]);

  // ── Recent admissions ──────────────────────────────────────────────────────
  const recentResidents = useMemo(() =>
    [...residents]
      .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
      .slice(0, 4),
  [residents]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.floor((d.getTime() - now.getTime()) / 86_400_000);
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diff === 0) return `Hoje · ${time}`;
    if (diff === 1) return `Amanhã · ${time}`;
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) + ' · ' + time;
  };

  const admissionAgo = (iso: string) => {
    const d = new Date(iso);
    const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 30) return `Há ${days} dias`;
    const months = Math.floor(days / 30);
    return months === 1 ? 'Há 1 mês' : `Há ${months} meses`;
  };

  const nav = (view: ViewState, residentId?: string) => onNavigate?.(view, residentId);

  const allKpis = [
    {
      label: 'Ocupação',
      value: `${totalResidents}/${capacity}`,
      sub: `${occupancyRate}% da capacidade`,
      icon: Users,
      accent: 'bg-blue-50 text-blue-600',
      ring: 'border-blue-100',
      progress: occupancyRate,
      progressColor: 'bg-blue-500',
      adminOnly: false,
    },
    {
      label: 'Alta Complexidade',
      value: String(highCare),
      sub: 'Residentes Grau III',
      icon: Activity,
      accent: 'bg-rose-50 text-rose-500',
      ring: 'border-rose-100',
      adminOnly: false,
    },
    {
      label: 'Receita do Mês',
      value: fmtCurrency(monthlyRevenue),
      sub: balance >= 0 ? `Saldo +${fmtCurrency(balance)}` : `Saldo ${fmtCurrency(balance)}`,
      subColor: balance >= 0 ? 'text-emerald-600' : 'text-rose-500',
      icon: Wallet,
      accent: 'bg-emerald-50 text-emerald-600',
      ring: 'border-emerald-100',
      adminOnly: true,
    },
    {
      label: 'Eventos Hoje',
      value: String(todayEvents.length),
      sub: todayEvents[0]?.title ?? 'Nenhum evento hoje',
      icon: Calendar,
      accent: 'bg-violet-50 text-violet-600',
      ring: 'border-violet-100',
      adminOnly: false,
    },
  ];

  const kpis = allKpis.filter(k => !k.adminOnly || isAdmin);

  const quickActions = [
    { label: 'Residentes',  icon: Users,       view: ViewState.RESIDENTS, color: 'hover:bg-blue-50   hover:text-blue-700   hover:border-blue-200'   },
    { label: 'Agenda',      icon: Calendar,    view: ViewState.AGENDA,    color: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200' },
    { label: 'Financeiro',  icon: Wallet,      view: ViewState.FINANCE,   color: 'hover:bg-violet-50  hover:text-violet-700  hover:border-violet-200'  },
    { label: 'Equipe',      icon: UserCog,     view: ViewState.TEAM,      color: 'hover:bg-amber-50   hover:text-amber-700   hover:border-amber-200'   },
    { label: 'Estoque',     icon: Package,     view: ViewState.STOCK,     color: 'hover:bg-rose-50    hover:text-rose-700    hover:border-rose-200'    },
    { label: 'Quartos',     icon: BedDouble,   view: ViewState.ROOMS,     color: 'hover:bg-cyan-50    hover:text-cyan-700    hover:border-cyan-200'    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Painel de Controle</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Visão geral da unidade · {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {employees.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-slate-600">{employees.filter(e => e.status === 'Ativo').length} colaboradores ativos</span>
              </div>
            )}
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stock alert ───────────────────────────────────────────────── */}
      {stockAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-rose-800 text-sm">Estoque Crítico</h3>
              <span className="text-xs font-semibold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">{stockAlerts.length} itens</span>
            </div>
            <p className="text-rose-700 text-xs mt-1 mb-2">Itens abaixo do limite mínimo de segurança.</p>
            <div className="flex flex-wrap gap-2">
              {stockAlerts.slice(0, 3).map(item => (
                <span key={item.id} className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                  <PackageX className="h-3 w-3" />
                  {item.name}: {item.quantity} {item.unit}
                </span>
              ))}
              {stockAlerts.length > 3 && (
                <span className="text-xs text-rose-600 font-medium self-center">+{stockAlerts.length - 3} outros</span>
              )}
            </div>
          </div>
          {onNavigate && (
            <button onClick={() => nav(ViewState.STOCK)} className="shrink-0 text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1">
              Ver tudo <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-2xl border shadow-sm p-5 ${kpi.ring}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.accent}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 leading-none">{kpi.value}</p>
            {kpi.progress !== undefined && (
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${kpi.progressColor}`} style={{ width: `${kpi.progress}%` }} />
              </div>
            )}
            <p className={`text-xs mt-2 ${kpi.subColor ?? 'text-slate-400'}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Inadimplência alert ───────────────────────────────────────── */}
      {overdueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">{overdueCount} {overdueCount === 1 ? 'mensalidade em atraso' : 'mensalidades em atraso'}</span>
              {overdueAmount > 0 && <span className="ml-1 font-normal">· {fmtCurrency(overdueAmount)} a receber</span>}
              {pendingCount > 0 && <span className="ml-2 text-amber-600">+ {pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>}
            </p>
          </div>
          {onNavigate && (
            <button onClick={() => nav(ViewState.FINANCE)} className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 whitespace-nowrap">
              Ver cobranças <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      {onNavigate && isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Acesso Rápido</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => nav(action.view)}
                className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border border-transparent text-slate-500 transition-all cursor-pointer ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs font-medium leading-none">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Middle row: Care Distribution + Upcoming Events ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Care distribution */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-slate-800">Distribuição por Grau de Cuidado</p>
            {onNavigate && (
              <button onClick={() => nav(ViewState.RESIDENTS)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {([['I', gradeI], ['II', gradeII], ['III', gradeIII]] as [keyof typeof CARE_GRADE, number][]).map(([grade, count]) => {
              const pct = careTotal > 0 ? Math.round((count / careTotal) * 100) : 0;
              const cfg = CARE_GRADE[grade];
              return (
                <div key={grade}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600">{cfg.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{pct}%</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cfg.bar}`}
                      style={{ width: pct > 0 ? `${pct}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini stats row */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">{totalResidents}</p>
              <p className="text-xs text-slate-400 mt-0.5">Internados</p>
            </div>
            <div className="text-center border-x border-slate-100">
              <p className="text-lg font-bold text-slate-800">{capacity - totalResidents}</p>
              <p className="text-xs text-slate-400 mt-0.5">Vagas livres</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">{occupancyRate}%</p>
              <p className="text-xs text-slate-400 mt-0.5">Ocupação</p>
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-slate-800">Próximos Eventos</p>
            {onNavigate && (
              <button onClick={() => nav(ViewState.AGENDA)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium">
                Agenda <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <Calendar className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Nenhum evento agendado</p>
              <p className="text-xs text-slate-300 mt-0.5">nos próximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(ev => {
                const cfg = EVENT_TYPE[ev.type] ?? EVENT_TYPE.outro;
                return (
                  <div key={ev.id} className="flex items-start gap-3 group">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 truncate">{ev.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatEventDate(ev.start)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: Financial + Birthdays ────────────────────────── */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-5' : ''} gap-5`}>

        {/* Financial summary — admin only */}
        {isAdmin && <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-slate-800">Resumo Financeiro — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            {onNavigate && (
              <button onClick={() => nav(ViewState.FINANCE)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium">
                Detalhes <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Revenue */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-slate-600">Receitas</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">{fmtCurrency(monthlyRevenue)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: monthlyRevenue + monthlyExpenses > 0 ? `${(monthlyRevenue / (monthlyRevenue + monthlyExpenses)) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Expenses */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-xs font-medium text-slate-600">Despesas</span>
                </div>
                <span className="text-sm font-bold text-rose-500">{fmtCurrency(monthlyExpenses)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full"
                  style={{ width: monthlyRevenue + monthlyExpenses > 0 ? `${(monthlyExpenses / (monthlyRevenue + monthlyExpenses)) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className={`mt-4 pt-4 border-t border-slate-100 flex items-center justify-between`}>
            <span className="text-sm font-semibold text-slate-600">Saldo do mês</span>
            <div className={`flex items-center gap-1.5 font-bold text-base ${balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {balance >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {fmtCurrency(Math.abs(balance))}
            </div>
          </div>

          {financials.length === 0 && (
            <p className="text-xs text-slate-300 text-center mt-4">Nenhum lançamento registrado este mês</p>
          )}
        </div>}

        {/* Upcoming birthdays */}
        <div className={`${isAdmin ? 'lg:col-span-2' : ''} bg-white rounded-2xl border border-slate-100 shadow-sm p-5`}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-slate-800">Aniversários Próximos</p>
            <Cake className="h-4 w-4 text-slate-300" />
          </div>

          {upcomingBirthdays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <Cake className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Nenhum aniversário</p>
              <p className="text-xs text-slate-300 mt-0.5">nos próximos 30 dias</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBirthdays.map(({ resident, days }) => (
                <div key={resident.id} className="flex items-center gap-3">
                  {resident.photoUrl ? (
                    <img src={resident.photoUrl} alt={resident.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-violet-600">{resident.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => nav(ViewState.RESIDENT_DETAIL, resident.id)}
                      className="text-xs font-semibold text-slate-700 hover:text-blue-600 hover:underline truncate block text-left w-full"
                    >
                      {resident.name}
                    </button>
                    <p className="text-xs text-slate-400">{resident.age + 1} anos em breve</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    days === 0 ? 'bg-violet-100 text-violet-700' :
                    days <= 3 ? 'bg-rose-50 text-rose-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {days === 0 ? 'Hoje!' : `${days}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Admissions ─────────────────────────────────────────── */}
      {recentResidents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">Internações Recentes</p>
            {onNavigate && (
              <button onClick={() => nav(ViewState.RESIDENTS)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentResidents.map(r => {
              const gradeCfg = CARE_GRADE[r.careLevel];
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt={r.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-blue-600">{r.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => nav(ViewState.RESIDENT_DETAIL, r.id)}
                      className="text-xs font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate block text-left w-full"
                    >
                      {r.name}
                    </button>
                    <p className="text-xs text-slate-400 truncate">Quarto {r.room}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${gradeCfg.badge}`}>
                        Grau {r.careLevel}
                      </span>
                      <span className="text-xs text-slate-400">{admissionAgo(r.admissionDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
