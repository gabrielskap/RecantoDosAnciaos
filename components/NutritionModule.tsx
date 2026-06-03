import React, { useState } from 'react';
import { Utensils, AlertTriangle, CheckCircle, PieChart, FileText, Calendar, ChevronDown, ChevronUp, Droplet } from 'lucide-react';
import { Resident, DietPlan, MealTime, NutritionalLog } from '../types';
import { PieChart as RechartPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface NutritionModuleProps {
  residents: Resident[];
  onUpdateResident: (resident: Resident) => void;
}

const NutritionModule: React.FC<NutritionModuleProps> = ({ residents, onUpdateResident }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'plans'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMeal, setSelectedMeal] = useState<MealTime>('Almoço');

  // --- DASHBOARD DATA ---
  const dietsCount = residents.reduce((acc, r) => {
    const type = r.dietPlan?.type || 'Não Definido';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dietChartData = Object.entries(dietsCount).map(([name, value]) => ({ name, value }));
  const COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#8b5cf6'];

  const lowAcceptanceAlerts = residents.flatMap(r => {
    const recentLogs = r.nutritionalLogs?.filter(l => l.acceptance < 50 && l.date >= new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) || [];
    return recentLogs.map(log => ({ resident: r.name, ...log }));
  });

  // --- HANDLERS ---
  const handleBatchUpdate = (residentId: string, acceptance: number) => {
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;

    const existingLogIndex = resident.nutritionalLogs?.findIndex(l => l.date === selectedDate && l.meal === selectedMeal);
    let updatedLogs = [...(resident.nutritionalLogs || [])];

    if (existingLogIndex !== undefined && existingLogIndex > -1) {
      updatedLogs[existingLogIndex] = { ...updatedLogs[existingLogIndex], acceptance };
    } else {
      updatedLogs.push({
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDate,
        meal: selectedMeal,
        acceptance
      });
    }

    onUpdateResident({ ...resident, nutritionalLogs: updatedLogs });
  };

  const handleDietUpdate = (residentId: string, newPlan: Partial<DietPlan>) => {
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;

    const updatedPlan: DietPlan = {
      consistency: newPlan.consistency || resident.dietPlan?.consistency || 'Geral',
      type: newPlan.type || resident.dietPlan?.type || 'Livre',
      restrictions: resident.dietPlan?.restrictions || [],
      fluidRestriction: newPlan.fluidRestriction || resident.dietPlan?.fluidRestriction,
      observations: newPlan.observations || resident.dietPlan?.observations,
      updatedAt: new Date().toISOString()
    };

    onUpdateResident({ ...resident, dietPlan: updatedPlan });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alimentação e Nutrição</h1>
          <p className="text-slate-500">Controle de dietas, aceitação alimentar e relatórios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex overflow-x-auto scrollbar-none items-center gap-1">
        {[
          { id: 'dashboard', label: 'Visão Geral', icon: PieChart },
          { id: 'daily', label: 'Registro Diário', icon: Utensils },
          { id: 'plans', label: 'Planos Alimentares', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex-shrink-0 min-w-[130px] md:min-w-0 flex items-center justify-center py-3 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === tab.id
                ? 'bg-slate-100 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2 animate-pulse" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alerts Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-rose-500" /> Alertas de Baixa Aceitação (Últimos 3 dias)
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {lowAcceptanceAlerts.length > 0 ? (
                  lowAcceptanceAlerts.map((alert, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-rose-50 border border-rose-100 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{alert.resident}</p>
                        <p className="text-xs text-slate-500">{new Date(alert.date).toLocaleDateString()} - {alert.meal}</p>
                      </div>
                      <span className="font-bold text-rose-600 bg-white px-2 py-1 rounded border border-rose-200 text-xs">
                        {alert.acceptance}%
                      </span>
                    </div>
                  ))
                ) : (
                   <p className="text-sm text-slate-400 text-center py-4">Nenhum alerta recente.</p>
                )}
              </div>
            </div>

            {/* Diet Types Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-semibold text-slate-800 mb-4">Distribuição de Dietas</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <RechartPie width={400} height={400}>
                      <Pie
                        data={dietChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dietChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartPie>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* DAILY RECORD TAB */}
      {activeTab === 'daily' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
             <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
               <input 
                 type="date" 
                 value={selectedDate}
                 onChange={e => setSelectedDate(e.target.value)}
                 className="w-full sm:w-auto px-3 py-3 sm:py-2 border border-slate-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white min-h-[44px]"
               />
               <select 
                 value={selectedMeal}
                 onChange={e => setSelectedMeal(e.target.value as MealTime)}
                 className="w-full sm:w-auto px-3 py-3 sm:py-2 border border-slate-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white min-h-[44px]"
               >
                 {['Café da Manhã', 'Colação', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'].map(m => (
                   <option key={m} value={m}>{m}</option>
                 ))}
               </select>
             </div>
             <div className="text-sm text-slate-500 flex items-center">
                <Utensils className="h-4 w-4 mr-2 text-primary-500" /> Registro de aceitação em lote
             </div>
          </div>

          {/* Mobile Cards View (Hidden on medium screens and larger) */}
          <div className="block md:hidden divide-y divide-slate-100 p-4 space-y-4">
            {residents.map(resident => {
              const log = resident.nutritionalLogs?.find(l => l.date === selectedDate && l.meal === selectedMeal);
              const acceptance = log ? log.acceptance : -1;

              return (
                <div key={resident.id} className="pt-4 first:pt-0 pb-4 first:pb-4 space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{resident.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Quarto {resident.room}</p>
                    </div>
                    {acceptance !== -1 ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-full font-semibold">
                        <CheckCircle className="h-3.5 w-3.5" /> Salvo
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">Pendente</span>
                    )}
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-400 font-medium uppercase tracking-wider block mb-1">Dieta Prescrita</span>
                    {resident.dietPlan ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-700 text-sm">{resident.dietPlan.consistency}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-semibold">{resident.dietPlan.type}</span>
                        {resident.dietPlan.fluidRestriction && (
                          <div className="text-amber-600 flex items-center font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            <Droplet size={10} className="mr-0.5 text-amber-500" /> Restrição Hídrica
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Não definida</span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1.5">Nível de Aceitação</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 25, 50, 75, 100].map(val => (
                        <button
                          key={val}
                          onClick={() => handleBatchUpdate(resident.id, val)}
                          className={`min-h-[44px] py-1 transition-all rounded font-bold border flex flex-col items-center justify-center ${
                            acceptance === val 
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-200' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 active:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs">{val}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Hidden on mobile and smaller tablet screens) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Residente</th>
                  <th className="px-6 py-4">Dieta Prescrita</th>
                  <th className="px-6 py-4 w-64">Aceitação (%)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {residents.map(resident => {
                  const log = resident.nutritionalLogs?.find(l => l.date === selectedDate && l.meal === selectedMeal);
                  const acceptance = log ? log.acceptance : -1;

                  return (
                    <tr key={resident.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">{resident.name}</td>
                      <td className="px-6 py-4 text-sm">
                         {resident.dietPlan ? (
                           <div>
                             <span className="font-medium text-slate-700">{resident.dietPlan.consistency}</span>
                             <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-semibold">{resident.dietPlan.type}</span>
                             {resident.dietPlan.fluidRestriction && (
                               <div className="text-xs text-amber-600 flex items-center mt-1">
                                 <Droplet size={10} className="mr-1 text-amber-500" /> Restrição Hídrica
                               </div>
                             )}
                           </div>
                         ) : (
                           <span className="text-slate-400 italic">Não definida</span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {[0, 25, 50, 75, 100].map(val => (
                             <button
                               key={val}
                               onClick={() => handleBatchUpdate(resident.id, val)}
                               className={`min-h-[36px] px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                                 acceptance === val 
                                 ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-250' 
                                 : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                               }`}
                             >
                               {val}%
                             </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {acceptance !== -1 ? (
                           <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto animate-bounce-short" />
                        ) : (
                           <span className="text-xs text-slate-400">Pendente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIET PLANS TAB */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {residents.map(resident => (
             <div key={resident.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center">
                     <img src={resident.photoUrl} alt="" className="w-10 h-10 rounded-full mr-3" />
                     <div>
                       <h3 className="font-semibold text-slate-800">{resident.name}</h3>
                       <p className="text-xs text-slate-500">Quarto {resident.room}</p>
                     </div>
                   </div>
                   <button className="text-xs text-primary-600 hover:underline">Editar</button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-xs font-medium text-slate-500">Consistência</label>
                       <select 
                         value={resident.dietPlan?.consistency || 'Geral'} 
                         onChange={e => handleDietUpdate(resident.id, { consistency: e.target.value as any })}
                         className="w-full mt-1 text-sm border-slate-200 rounded-md focus:ring-primary-500 focus:border-primary-500"
                       >
                         <option>Geral</option>
                         <option>Branda</option>
                         <option>Pastosa</option>
                         <option>Líquida</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-medium text-slate-500">Tipo</label>
                       <select 
                         value={resident.dietPlan?.type || 'Livre'}
                         onChange={e => handleDietUpdate(resident.id, { type: e.target.value as any })}
                         className="w-full mt-1 text-sm border-slate-200 rounded-md focus:ring-primary-500 focus:border-primary-500"
                       >
                         <option>Livre</option>
                         <option>Hipossódica</option>
                         <option>Diabética</option>
                         <option>Hipolipídica</option>
                         <option>Hiperproteica</option>
                       </select>
                     </div>
                  </div>

                  {resident.dietPlan?.fluidRestriction && (
                     <div className="bg-amber-50 p-2 rounded text-xs text-amber-800 border border-amber-100 flex items-center">
                       <Droplet size={12} className="mr-1" />
                       Restrição Hídrica: {resident.dietPlan.fluidRestriction}
                     </div>
                  )}

                  <div>
                     <label className="text-xs font-medium text-slate-500">Alergias e Restrições</label>
                     <div className="flex flex-wrap gap-1 mt-1">
                       {resident.allergies.length > 0 || (resident.dietPlan?.restrictions?.length || 0) > 0 ? (
                         <>
                           {resident.allergies.map(a => (
                             <span key={a} className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs">{a}</span>
                           ))}
                           {resident.dietPlan?.restrictions?.map(r => (
                             <span key={r} className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">{r}</span>
                           ))}
                         </>
                       ) : (
                         <span className="text-sm text-slate-400">Nenhuma restrição conhecida.</span>
                       )}
                     </div>
                  </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default NutritionModule;