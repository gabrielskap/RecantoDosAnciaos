import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { Users, Activity, Wallet, AlertTriangle, Package, Calendar, ChevronRight } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import { PageHeader, SectionCard, Badge, type Tone } from '../components/ui';
import {
  DEMO_KPIS, DEMO_STOCK_ALERTS, DEMO_OCCUPANCY, DEMO_CARE_DISTRIBUTION,
  DEMO_TODAY_EVENTS, formatBRL, type EventType,
} from '../../../data/demoData';
import type { DemoScreen } from '../types';

const eventTone: Record<EventType, Tone> = {
  medico: 'rose', visita: 'blue', terapia: 'blue', atividade: 'green', reuniao: 'amber',
};
const eventLabel: Record<EventType, string> = {
  medico: 'Médico', visita: 'Visita', terapia: 'Terapia', atividade: 'Atividade', reuniao: 'Reunião',
};

const DemoDashboard: React.FC<{ onNavigate: (s: DemoScreen) => void }> = ({ onNavigate }) => {
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <PageHeader title="Painel Geral" subtitle={today.charAt(0).toUpperCase() + today.slice(1)} />

      {/* Alerta de estoque crítico */}
      <button
        onClick={() => onNavigate('notifications')}
        className="w-full text-left bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 flex items-start gap-3 hover:bg-rose-100/60 transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-rose-800 text-sm">Estoque crítico — {DEMO_STOCK_ALERTS.length} itens abaixo do mínimo</p>
          <p className="text-sm text-rose-600 truncate">
            {DEMO_STOCK_ALERTS.map(s => s.name).join(' · ')}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-rose-400 flex-shrink-0" />
      </button>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Users} label="Residentes ativos" value={String(DEMO_KPIS.residentes)} sub={`${DEMO_KPIS.capacidade} vagas totais`} iconClass="bg-blue-50 text-blue-600" />
        <KpiCard icon={Activity} label="Taxa de ocupação" value={`${DEMO_KPIS.ocupacao}%`} trend={{ dir: 'up', text: '+2% no mês' }} iconClass="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={Wallet} label="Receita do mês" value={formatBRL(DEMO_KPIS.receitaMes)} trend={{ dir: 'up', text: '+1,4%' }} iconClass="bg-violet-50 text-violet-600" />
        <KpiCard icon={AlertTriangle} label="Inadimplência" value={String(DEMO_KPIS.inadimplenciaQtd)} sub={formatBRL(DEMO_KPIS.inadimplenciaValor)} iconClass="bg-amber-50 text-amber-600" />
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <SectionCard title="Ocupação (últimos 6 meses)" className="lg:col-span-2">
          <div className="p-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMO_OCCUPANCY} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Ocupação']} />
                <Area type="monotone" dataKey="ocupacao" stroke="#2563eb" strokeWidth={2} fill="url(#occ)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Por grau de dependência">
          <div className="p-5 h-64 flex flex-col">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie data={DEMO_CARE_DISTRIBUTION} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {DEMO_CARE_DISTRIBUTION.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [`${v} residentes`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-1">
              {DEMO_CARE_DISTRIBUTION.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Agenda de hoje */}
      <SectionCard
        title="Agenda de hoje"
        action={<button onClick={() => onNavigate('reports')} className="text-xs font-semibold text-blue-600 hover:underline">Ver relatórios</button>}
      >
        <ul className="divide-y divide-slate-50">
          {DEMO_TODAY_EVENTS.map(ev => (
            <li key={ev.id} className="px-5 py-3.5 flex items-center gap-4">
              <span className="text-sm font-bold text-slate-700 w-12 tabular-nums">{ev.time}</span>
              <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-slate-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
                {ev.resident && <p className="text-xs text-slate-400 truncate">{ev.resident}</p>}
              </div>
              <Badge tone={eventTone[ev.type]}>{eventLabel[ev.type]}</Badge>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
};

export default DemoDashboard;
