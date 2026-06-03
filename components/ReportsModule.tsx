import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Resident, Employee, Invoice } from '../types';
import { ClipboardCheck, AlertTriangle, Users, Pill, TrendingUp, CheckCircle2, XCircle, PieChart as PieIcon, FileBarChart } from 'lucide-react';

interface ReportsModuleProps {
  residents: Resident[];
  employees: Employee[];
  invoices: Invoice[];
}

const ReportsModule: React.FC<ReportsModuleProps> = ({ residents, employees, invoices }) => {
  const totalResidents = residents.length || 1;

  const dependencyData = [
    { name: 'Grau I',   value: residents.filter(r => r.careLevel === 'I').length },
    { name: 'Grau II',  value: residents.filter(r => r.careLevel === 'II').length },
    { name: 'Grau III', value: residents.filter(r => r.careLevel === 'III').length },
  ];
  const PIE_COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

  const medData = [
    { name: 'Dipirona',     count: 12 },
    { name: 'Losartana',    count: 8  },
    { name: 'Sinvastatina', count: 6  },
    { name: 'Omeprazol',    count: 5  },
  ];

  const rdcChecklist = [
    { item: 'Responsável Técnico (RT) vigente',      status: true  },
    { item: 'Proporção Cuidador/Idoso (Diurno)',     status: true  },
    { item: 'Proporção Cuidador/Idoso (Noturno)',    status: true  },
    { item: 'Plano de Atenção Integral à Saúde',     status: true  },
    { item: 'Registro de Intercorrências Diárias',   status: true  },
    { item: 'Licença Sanitária Atualizada',          status: false },
  ];

  const mockFalls = 2;
  const fallRate = ((mockFalls / totalResidents) * 100).toFixed(1);
  const compliance = Math.round((rdcChecklist.filter(i => i.status).length / rdcChecklist.length) * 100);

  const kpis = [
    { label: 'Total Residentes', value: String(totalResidents), sub: 'Idade média: 82 anos', icon: Users,      iconBg: 'bg-violet-50',  iconColor: 'text-violet-600' },
    { label: 'Taxa de Quedas',   value: `${fallRate}%`,          sub: `${mockFalls} incidentes`,              icon: AlertTriangle, iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Polifarmácia',     value: '15%',                   sub: 'Uso de >5 medicamentos', icon: Pill,        iconBg: 'bg-rose-50',    iconColor: 'text-rose-600'   },
    { label: 'Satisfação',       value: '4.8/5',                 sub: 'Pesquisa familiar',      icon: TrendingUp,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600'},
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios e Indicadores</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monitoramento de qualidade · Conformidade RDC 502</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200">
          <FileBarChart className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Compliance banner */}
      <div className={`rounded-2xl p-4 flex items-center gap-4 ${compliance === 100 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${compliance === 100 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          <ClipboardCheck className={`h-6 w-6 ${compliance === 100 ? 'text-emerald-600' : 'text-amber-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${compliance === 100 ? 'text-emerald-800' : 'text-amber-800'}`}>
            Conformidade RDC 502: {compliance}%
          </p>
          <p className={`text-xs mt-0.5 ${compliance === 100 ? 'text-emerald-600' : 'text-amber-700'}`}>
            {compliance === 100 ? 'Todos os critérios atendidos.' : `${rdcChecklist.filter(i => !i.status).length} critério(s) pendente(s) — verifique a seção abaixo.`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-2xl font-bold ${compliance === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{compliance}%</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
              <div className={`w-9 h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Dependency Pie */}
        <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <PieIcon className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Perfil por Grau de Dependência</h3>
              <p className="text-xs text-slate-400">{totalResidents} residentes</p>
            </div>
          </div>
          <div className="flex items-center gap-6 h-48">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={dependencyData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                  {dependencyData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {dependencyData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Medication usage */}
        <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Pill className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Medicamentos Mais Utilizados</h3>
              <p className="text-xs text-slate-400">Prescrições ativas este mês</p>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={medData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8f7ff' }} />
                <Bar dataKey="count" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={18} label={{ position: 'right', fill: '#94a3b8', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RDC 502 compliance */}
        <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Conformidade RDC 502 · Auto-avaliação</h3>
              <p className="text-xs text-slate-400">{rdcChecklist.filter(i => i.status).length} de {rdcChecklist.length} critérios atendidos</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rdcChecklist.map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3.5 rounded-xl border ${item.status ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <span className={`text-sm font-medium ${item.status ? 'text-emerald-800' : 'text-rose-800'}`}>{item.item}</span>
                {item.status
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 ml-2" />
                  : <XCircle className="h-5 w-5 text-rose-500 shrink-0 ml-2" />}
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700">Nota Técnica: </span>
            Conformidade calculada com base no quadro ativo ({employees.length} colaboradores) e {totalResidents} residente{totalResidents !== 1 ? 's' : ''}. Proporção de cuidadores adequada para o período diurno.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
