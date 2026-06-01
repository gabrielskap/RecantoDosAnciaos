import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FinancialRecord, Contract, Invoice, Resident } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Sparkles, Plus, X, FileText, Calendar, CheckCircle, AlertCircle, FileCheck } from 'lucide-react';
import { analyzeFinancialData } from '../services/geminiService';

interface FinanceModuleProps {
  records: FinancialRecord[];
  contracts: Contract[];
  invoices: Invoice[];
  residents: Resident[];
  onAddRecord: (record: FinancialRecord) => void;
  onAddContract: (contract: Contract) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
}

const FinanceModule: React.FC<FinanceModuleProps> = ({ 
  records, contracts, invoices, residents, 
  onAddRecord, onAddContract, onUpdateInvoice 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'invoices' | 'expenses'>('overview');
  const [aiInsight, setAiInsight] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  
  // States for new entries
  const [newRecord, setNewRecord] = useState({ type: 'despesa', description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [newContract, setNewContract] = useState({ residentId: '', monthlyValue: '', dueDay: '5', startDate: new Date().toISOString().split('T')[0] });

  // Calculations
  const totalIncome = records.filter(r => r.type === 'receita').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = records.filter(r => r.type === 'despesa').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;
  const overdueAmount = invoices.filter(i => i.status === 'Atrasado').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'Pendente').reduce((acc, curr) => acc + curr.amount, 0);

  // Mock data for chart - aggregating by month
  const chartData = [
    { name: 'Jan', Receita: 45000, Despesa: 38000 },
    { name: 'Fev', Receita: 46000, Despesa: 39500 },
    { name: 'Mar', Receita: 44500, Despesa: 41000 },
    { name: 'Abr', Receita: 48000, Despesa: 37000 },
  ];

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    const result = await analyzeFinancialData({ records, summary: { totalIncome, totalExpense, balance, overdueAmount } });
    setAiInsight(result);
    setAnalyzing(false);
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.description || !newRecord.amount) return;
    const record: FinancialRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type: newRecord.type as 'receita' | 'despesa',
      description: newRecord.description,
      category: newRecord.category,
      amount: parseFloat(newRecord.amount),
      date: newRecord.date,
      status: 'pago'
    };
    onAddRecord(record);
    setIsRecordModalOpen(false);
    setNewRecord({ type: 'despesa', description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.residentId || !newContract.monthlyValue) return;
    const resident = residents.find(r => r.id === newContract.residentId);
    
    const contract: Contract = {
      id: Math.random().toString(36).substr(2, 9),
      residentId: newContract.residentId,
      residentName: resident?.name || 'Desconhecido',
      startDate: newContract.startDate,
      monthlyValue: parseFloat(newContract.monthlyValue),
      dueDay: parseInt(newContract.dueDay),
      status: 'Ativo'
    };
    onAddContract(contract);
    setIsContractModalOpen(false);
    setNewContract({ residentId: '', monthlyValue: '', dueDay: '5', startDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Controle Financeiro & Contratos</h1>
           <p className="text-slate-500">Gestão de receitas, despesas e mensalidades</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           {activeTab === 'contracts' && (
             <button onClick={() => setIsContractModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">
               <Plus className="h-4 w-4" /> Novo Contrato
             </button>
           )}
           {activeTab === 'expenses' && (
             <button onClick={() => setIsRecordModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-700">
               <Plus className="h-4 w-4" /> Nova Despesa
             </button>
           )}
           {activeTab === 'overview' && (
             <button onClick={handleAIAnalysis} disabled={analyzing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70">
               <Sparkles className="h-4 w-4" /> {analyzing ? 'Analisando...' : 'Análise IA'}
             </button>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex overflow-x-auto">
        {[
          { id: 'overview', label: 'Visão Geral & DRE', icon: TrendingUp },
          { id: 'contracts', label: 'Contratos', icon: FileText },
          { id: 'invoices', label: 'Mensalidades (Faturamento)', icon: Calendar },
          { id: 'expenses', label: 'Despesas Operacionais', icon: DollarSign },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-100 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
           {aiInsight && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
              <h3 className="font-bold text-violet-900 mb-2 flex items-center"><Sparkles className="h-4 w-4 mr-2" /> Insights da IA</h3>
              <p className="text-violet-800 text-sm whitespace-pre-line leading-relaxed">{aiInsight}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <p className="text-sm text-slate-500 font-medium">Receitas (Mês)</p>
               <h3 className="text-2xl font-bold text-emerald-600">R$ {totalIncome.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <p className="text-sm text-slate-500 font-medium">Despesas (Mês)</p>
               <h3 className="text-2xl font-bold text-rose-600">R$ {totalExpense.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <p className="text-sm text-slate-500 font-medium">Saldo Líquido</p>
               <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                 R$ {balance.toLocaleString('pt-BR')}
               </h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <p className="text-sm text-slate-500 font-medium">Inadimplência Total</p>
               <h3 className="text-2xl font-bold text-rose-500">R$ {overdueAmount.toLocaleString('pt-BR')}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-semibold text-slate-800 mb-6">Demonstrativo de Resultados (DRE)</h3>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `k${val/1000}`} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="Despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {/* CONTRACTS TAB */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Residente</th>
                    <th className="px-6 py-4">Início</th>
                    <th className="px-6 py-4">Valor Mensal</th>
                    <th className="px-6 py-4">Vencimento</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {contracts.map(contract => (
                     <tr key={contract.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">{contract.residentName}</td>
                        <td className="px-6 py-4">{new Date(contract.startDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4">R$ {contract.monthlyValue.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4">Dia {contract.dueDay}</td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contract.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                             {contract.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <button className="text-primary-600 hover:text-primary-800 text-xs font-medium">Ver PDF</button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                 <div><p className="text-sm text-slate-500">A Receber (Pendente)</p><h3 className="text-xl font-bold text-slate-800">R$ {pendingAmount.toLocaleString('pt-BR')}</h3></div>
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Calendar className="h-5 w-5"/></div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                 <div><p className="text-sm text-slate-500">Em Atraso (Inadimplência)</p><h3 className="text-xl font-bold text-rose-600">R$ {overdueAmount.toLocaleString('pt-BR')}</h3></div>
                 <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><AlertCircle className="h-5 w-5"/></div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                 <div><p className="text-sm text-slate-500">Faturas Geradas</p><h3 className="text-xl font-bold text-slate-800">{invoices.length}</h3></div>
                 <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><FileCheck className="h-5 w-5"/></div>
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50">
               <h3 className="font-semibold text-slate-700">Competência: Maio/2024</h3>
             </div>
             <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white text-slate-800 font-semibold uppercase text-xs border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Residente</th>
                    <th className="px-6 py-4">Vencimento</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {invoices.map(inv => (
                     <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">{inv.residentName}</td>
                        <td className="px-6 py-4">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4">R$ {inv.amount.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4">
                           {inv.status === 'Pago' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle size={12} className="mr-1"/> Pago</span>}
                           {inv.status === 'Pendente' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Aguardando</span>}
                           {inv.status === 'Atrasado' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800"><AlertCircle size={12} className="mr-1"/> Atrasado</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                           {inv.status !== 'Pago' && (
                             <button 
                               onClick={() => onUpdateInvoice({...inv, status: 'Pago', paidDate: new Date().toISOString()})}
                               className="text-emerald-600 hover:text-emerald-800 text-xs font-medium border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50"
                             >
                               Confirmar Pagamento
                             </button>
                           )}
                           {inv.status === 'Pago' && <span className="text-xs text-slate-400">Quitado</span>}
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {records.filter(r => r.type === 'despesa').map(rec => (
                     <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">{rec.description}</td>
                        <td className="px-6 py-4">{rec.category}</td>
                        <td className="px-6 py-4">{new Date(rec.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-rose-600 font-medium">- R$ {rec.amount.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4 capitalize">{rec.status}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Modals */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black bg-opacity-65">
          <div className="bg-white rounded-none sm:rounded-xl shadow-lg max-w-md w-full h-full sm:h-auto overflow-y-auto flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="font-semibold text-slate-800">Nova Despesa Operacional</h3>
              <button 
                onClick={() => setIsRecordModalOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRecordSubmit} className="p-6 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input required placeholder="Ex: Conta de Luz" value={newRecord.description} onChange={e => setNewRecord({...newRecord, description: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input required type="number" placeholder="0.00" value={newRecord.amount} onChange={e => setNewRecord({...newRecord, amount: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input required type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <select required value={newRecord.category} onChange={e => setNewRecord({...newRecord, category: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white">
                  <option value="">Selecione...</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Farmácia">Farmácia</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Salários">Salários</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 pb-8 sm:pb-0">
                <button type="button" onClick={() => setIsRecordModalOpen(false)} className="flex-1 py-3 sm:py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 sm:py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-sm font-medium transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isContractModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black bg-opacity-65">
           <div className="bg-white rounded-none sm:rounded-xl shadow-lg max-w-md w-full h-full sm:h-auto overflow-y-auto flex flex-col">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
               <h3 className="font-semibold text-slate-800">Novo Contrato de Residente</h3>
               <button 
                 onClick={() => setIsContractModalOpen(false)}
                 className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
                 aria-label="Close"
               >
                 <X className="h-5 w-5" />
               </button>
             </div>
             <form onSubmit={handleContractSubmit} className="p-6 space-y-4 flex-1">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Residente</label>
                 <select required value={newContract.residentId} onChange={e => setNewContract({...newContract, residentId: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white">
                   <option value="">Selecione o Residente...</option>
                   {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                 </select>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Valor Mensal (R$)</label>
                   <input required type="number" placeholder="Ex: 3500" value={newContract.monthlyValue} onChange={e => setNewContract({...newContract, monthlyValue: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Dia de Vencimento</label>
                   <input required type="number" min="1" max="31" value={newContract.dueDay} onChange={e => setNewContract({...newContract, dueDay: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                 </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
                  <input required type="date" value={newContract.startDate} onChange={e => setNewContract({...newContract, startDate: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
               </div>
               <div className="flex gap-3 pt-4 pb-8 sm:pb-0">
                 <button type="button" onClick={() => setIsContractModalOpen(false)} className="flex-1 py-3 sm:py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
                 <button type="submit" className="flex-1 py-3 sm:py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white rounded-lg text-sm font-medium transition-all">Criar Contrato</button>
               </div>
             </form>
           </div>
         </div>
      )}
    </div>
  );
};

export default FinanceModule;