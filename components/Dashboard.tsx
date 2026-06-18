import React from 'react';
import {
  Users, AlertTriangle, TrendingUp, Calendar, Activity,
  PackageX, ShieldAlert
} from 'lucide-react';
import { Resident, FinancialRecord, StockItem, CalendarEvent } from '../types';

interface DashboardProps {
  residents: Resident[];
  financials: FinancialRecord[];
  events?: CalendarEvent[];
  stockAlerts?: StockItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ residents, financials, events = [], stockAlerts = [] }) => {

  const totalResidents = residents.length;
  const highCare = residents.filter(r => r.careLevel === 'III').length;
  const pendingBills = financials.filter(f => f.type === 'despesa' && f.status === 'pendente').length;
  const capacity = 40;
  const occupancyRate = Math.round((totalResidents / capacity) * 100);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.start?.startsWith(todayStr));
  const nextEvent = todayEvents[0];

  const kpis = [
    {
      label: 'Ocupação',
      value: `${totalResidents}/${capacity}`,
      sub: `${occupancyRate}% da capacidade`,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      progress: occupancyRate,
      progressColor: 'bg-blue-500',
    },
    {
      label: 'Alta Complexidade',
      value: String(highCare),
      sub: 'Residentes Grau III',
      icon: Activity,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
    },
    {
      label: 'Contas Pendentes',
      value: String(pendingBills),
      sub: 'Faturas a vencer',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Eventos Hoje',
      value: String(todayEvents.length),
      sub: nextEvent ? nextEvent.title : 'Nenhum evento hoje',
      icon: Calendar,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Painel de Controle</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Visão geral da unidade · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Stock alert banner */}
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
            <p className="text-rose-700 text-xs mt-1 mb-2">Itens essenciais abaixo do limite mínimo de segurança.</p>
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
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
              <div className={`w-9 h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`h-4.5 w-4.5 ${kpi.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            {kpi.progress !== undefined && (
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${kpi.progressColor}`} style={{ width: `${kpi.progress}%` }} />
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">{kpi.sub}</p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
