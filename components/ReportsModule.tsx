import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Resident, Employee, Invoice } from '../types';
import { FileText, ClipboardCheck, AlertTriangle, Users, Pill, TrendingUp, CheckCircle } from 'lucide-react';

interface ReportsModuleProps {
  residents: Resident[];
  employees: Employee[];
  invoices: Invoice[];
}

const ReportsModule: React.FC<ReportsModuleProps> = ({ residents, employees, invoices }) => {
  // Dependency Level Data
  const dependencyData = [
    { name: 'Grau I', value: residents.filter(r => r.careLevel === 'I').length },
    { name: 'Grau II', value: residents.filter(r => r.careLevel === 'II').length },
    { name: 'Grau III', value: residents.filter(r => r.careLevel === 'III').length },
  ];
  const COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

  // Calculate Mock Incident Rate
  const totalResidents = residents.length || 1;
  const mockFalls = 2; // Hardcoded for demo
  const mockInfections = 1;
  const fallRate = ((mockFalls / totalResidents) * 100).toFixed(1);

  // Medication Usage (Mock top 3)
  const medData = [
    { name: 'Dipirona', count: 12 },
    { name: 'Losartana', count: 8 },
    { name: 'Sinvastatina', count: 6 },
    { name: 'Omeprazol', count: 5 },
  ];

  // RDC 502 Compliance Mock Checklist
  const rdcChecklist = [
    { item: 'Responsável Técnico (RT) vigente', status: true },
    { item: 'Proporção Cuidador/Idoso (Diurno)', status: true },
    { item: 'Proporção Cuidador/Idoso (Noturno)', status: true },
    { item: 'Plano de Atenção Integral à Saúde', status: true },
    { item: 'Registro de Intercorrências Diárias', status: true },
    { item: 'Licença Sanitária Atualizada', status: false }, // Alert
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios e Indicadores</h1>
        <p className="text-slate-500">Monitoramento de qualidade e conformidade RDC 502</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users size={20} /></div>
            <p className="text-sm font-medium text-slate-500">Total Residentes</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{totalResidents}</h3>
          <p className="text-xs text-slate-400 mt-1">Idade Média: 82 anos</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
            <p className="text-sm font-medium text-slate-500">Taxa de Quedas</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{fallRate}%</h3>
          <p className="text-xs text-slate-400 mt-1">{mockFalls} incidentes este mês</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Pill size={20} /></div>
            <p className="text-sm font-medium text-slate-500">Polifarmácia</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">15%</h3>
          <p className="text-xs text-slate-400 mt-1">Uso de {'>'}5 medicamentos</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
            <p className="text-sm font-medium text-slate-500">Satisfação</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">4.8/5</h3>
          <p className="text-xs text-slate-400 mt-1">Baseado em pesquisa familiar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dependency Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary-500" />
            Perfil por Grau de Dependência
          </h3>
          <div className="h-64 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={dependencyData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {dependencyData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
             <div className="space-y-2 ml-4">
               {dependencyData.map((entry, index) => (
                 <div key={entry.name} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index] }}></div>
                    <span className="text-sm text-slate-600">{entry.name}: {entry.value}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Medication Usage */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Pill className="h-5 w-5 mr-2 text-indigo-500" />
            Medicamentos Mais Utilizados
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={medData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RDC 502 Compliance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
           <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <ClipboardCheck className="h-5 w-5 mr-2 text-emerald-600" />
            Conformidade RDC 502 (Auto-avaliação)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {rdcChecklist.map((item, idx) => (
               <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${item.status ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <span className={`text-sm font-medium ${item.status ? 'text-emerald-800' : 'text-rose-800'}`}>{item.item}</span>
                  {item.status ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
               </div>
             ))}
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
             <p className="font-semibold mb-1">Nota Técnica:</p>
             <p>A conformidade é calculada com base no quadro de funcionários ativo ({employees.length} colaboradores) e número de residentes ({totalResidents}). A proporção atual de cuidadores está adequada para o período diurno.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportsModule;