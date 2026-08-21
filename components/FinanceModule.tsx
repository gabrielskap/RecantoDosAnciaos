import React, { useState, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FinancialRecord, Contract, Invoice, Resident, ViewState } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Plus, X, FileText, Calendar, CheckCircle2, AlertCircle, FileCheck, Wallet, Trash2, UploadCloud, ExternalLink, Loader2 } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { deleteContractDocument, getContractDocumentUrl, uploadContractDocument } from '../services/supabaseClient';
import { toast } from '../services/toast';
import { residentAvatarSrc } from '../lib/avatar';
import { isBeforeToday, getTodayDateString } from '../utils/dateUtils';

const LEGACY_FINANCE_DRAFT_STORAGE_KEYS = [
  'modal_finance_record_open',
  'modal_finance_contract_open',
  'modal_finance_new_record',
  'modal_finance_new_contract',
];

interface FinanceModuleProps {
  records: FinancialRecord[];
  contracts: Contract[];
  invoices: Invoice[];
  residents: Resident[];
  onAddRecord: (record: FinancialRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onAddContract: (contract: Contract) => Promise<void>;
  onUpdateContractFile: (contractId: string, fileUrl: string | null) => Promise<void>;
  onUpdateInvoice: (invoice: Invoice) => Promise<void>;
  onSelectResident?: (resident: Resident) => void;
}

const FinanceModule: React.FC<FinanceModuleProps> = ({
  records, contracts, invoices, residents,
  onAddRecord, onDeleteRecord, onAddContract, onUpdateContractFile, onUpdateInvoice,
  onSelectResident,
}) => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(ViewState.FINANCE, 'create');
  const canEdit   = hasPermission(ViewState.FINANCE, 'edit');
  const canDelete = hasPermission(ViewState.FINANCE, 'delete');

  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'invoices' | 'expenses'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') as 'overview' | 'contracts' | 'invoices' | 'expenses' | null;
    if (tabParam && ['overview', 'contracts', 'invoices', 'expenses'].includes(tabParam)) {
      return tabParam;
    }
    const saved = localStorage.getItem('recanto_finance_active_tab') as 'overview' | 'contracts' | 'invoices' | 'expenses' | null;
    return saved && ['overview', 'contracts', 'invoices', 'expenses'].includes(saved) ? saved : 'overview';
  });

  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    localStorage.setItem('recanto_finance_active_tab', activeTab);
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
    if (containerRef.current) {
      const scrollParent = containerRef.current.closest('.overflow-y-auto');
      if (scrollParent) {
        scrollParent.scrollTop = 0;
      }
    }
    window.scrollTo(0, 0);
  }, [activeTab]);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    type: 'despesa',
    description: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [newContract, setNewContract] = useState({
    residentId: '',
    monthlyValue: '',
    dueDay: '5',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploadingContractId, setUploadingContractId] = useState<string | null>(null);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const modalMouseDown = useRef(false);

  React.useEffect(() => {
    LEGACY_FINANCE_DRAFT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  const totalIncome = records.filter(r => r.type === 'receita').reduce((acc, cur) => acc + cur.amount, 0);
  const totalExpense = records.filter(r => r.type === 'despesa').reduce((acc, cur) => acc + cur.amount, 0);
  const balance = totalIncome - totalExpense;
  const overdueAmount = invoices.filter(i => i.status === 'Atrasado').reduce((acc, cur) => acc + cur.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'Pendente').reduce((acc, cur) => acc + cur.amount, 0);

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const monthRecords = records.filter(r => r.date?.startsWith(yearMonth));
      return {
        name: label.charAt(0).toUpperCase() + label.slice(1),
        Receita: monthRecords.filter(r => r.type === 'receita').reduce((s, r) => s + r.amount, 0),
        Despesa: monthRecords.filter(r => r.type === 'despesa').reduce((s, r) => s + r.amount, 0),
      };
    });
  }, [records]);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.description || !newRecord.amount) return;
    try {
      await onAddRecord({ id: Math.random().toString(36).substr(2, 9), type: newRecord.type as any, description: newRecord.description, category: newRecord.category, amount: parseFloat(newRecord.amount), date: newRecord.date, status: 'pago' });
      setNewRecord({ type: 'despesa', description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      // Mantém o formulário aberto e preenchido quando a escrita falhar.
      console.error('Erro ao registrar movimentação financeira:', error);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await onDeleteRecord(id);
    } catch (error) {
      console.error('Erro ao excluir movimentação financeira:', error);
    }
  };

  const handleInvoicePayment = async (invoice: Invoice) => {
    try {
      await onUpdateInvoice({ ...invoice, status: 'Pago', paidDate: new Date().toISOString() });
    } catch (error) {
      console.error('Erro ao confirmar mensalidade:', error);
    }
  };

  const validateContractFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Envie o contrato em PDF, JPG, PNG ou WEBP.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo do contrato deve ter no máximo 10 MB.');
      return false;
    }
    return true;
  };

  const openContract = async (fileUrl: string) => {
    const contractWindow = window.open('about:blank', '_blank');
    if (contractWindow) contractWindow.opener = null;
    try {
      const url = await getContractDocumentUrl(fileUrl);
      if (contractWindow) {
        contractWindow.location.href = url;
      } else {
        toast.error('Permita pop-ups no navegador para visualizar o contrato.');
      }
    } catch (error) {
      contractWindow?.close();
      console.error('Erro ao abrir contrato:', error);
      toast.error('Não foi possível abrir o contrato.');
    }
  };

  const handleContractFileUpload = async (contract: Contract, file: File) => {
    if (!validateContractFile(file)) return;
    setUploadingContractId(contract.id);
    try {
      const fileUrl = await uploadContractDocument(file, contract.residentId);
      await onUpdateContractFile(contract.id, fileUrl);
      toast.success('Contrato anexado com sucesso!');
    } catch (error) {
      console.error('Erro ao anexar contrato:', error);
      toast.error('Erro ao anexar o contrato. Tente novamente.');
    } finally {
      setUploadingContractId(null);
    }
  };

  const handleDeleteContractFile = async (contract: Contract) => {
    if (!contract.fileUrl || !window.confirm('Deseja excluir o contrato anexado?')) return;
    setUploadingContractId(contract.id);
    try {
      const fileUrl = contract.fileUrl;
      await onUpdateContractFile(contract.id, null);
      try {
        await deleteContractDocument(fileUrl);
      } catch (storageError) {
        // O vinculo ja foi removido. Uma eventual falha de limpeza do objeto
        // nao deve fazer o contrato reaparecer para o usuario.
        console.warn('Vínculo removido, mas o arquivo não pôde ser apagado do Storage:', storageError);
      }
      toast.success('Contrato anexado excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir contrato anexado:', error);
      toast.error('Erro ao excluir o contrato anexado. Tente novamente.');
    } finally {
      setUploadingContractId(null);
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.residentId || !newContract.monthlyValue) return;

    if (isBeforeToday(newContract.startDate)) {
      toast.error('A data de início do contrato não pode ser anterior à data atual.');
      return;
    }

    if (contractFile && !validateContractFile(contractFile)) return;
    setIsCreatingContract(true);
    try {
      const resident = residents.find(r => r.id === newContract.residentId);
      const fileUrl = contractFile
        ? await uploadContractDocument(contractFile, newContract.residentId)
        : undefined;
      await onAddContract({ id: Math.random().toString(36).substr(2, 9), residentId: newContract.residentId, residentName: resident?.name || 'Desconhecido', startDate: newContract.startDate, monthlyValue: parseFloat(newContract.monthlyValue), dueDay: parseInt(newContract.dueDay), status: 'Ativo', fileUrl });
      setNewContract({ residentId: '', monthlyValue: '', dueDay: '5', startDate: new Date().toISOString().split('T')[0] });
      setContractFile(null);
      setIsContractModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast.error('Não foi possível criar o contrato.');
    } finally {
      setIsCreatingContract(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const tabs = [
    { id: 'overview',  label: 'Visão Geral',  icon: TrendingUp },
    { id: 'contracts', label: 'Contratos',     icon: FileText },
    { id: 'invoices',  label: 'Mensalidades',  icon: Calendar },
    { id: 'expenses',  label: 'Despesas',      icon: DollarSign },
  ];

  return (
    <div className="space-y-6" ref={containerRef}>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financeiro e Contratos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Receitas, despesas e mensalidades</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {activeTab === 'contracts' && canCreate && (
            <button onClick={() => setIsContractModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Novo Contrato
            </button>
          )}
          {activeTab === 'expenses' && canCreate && (
            <button onClick={() => setIsRecordModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Plus className="h-4 w-4" /> Nova Despesa
            </button>
          )}

        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-1.5 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap min-w-[110px] ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Receitas', value: `R$ ${totalIncome.toLocaleString('pt-BR')}`, color: 'text-emerald-600', icon: TrendingUp, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
              { label: 'Despesas', value: `R$ ${totalExpense.toLocaleString('pt-BR')}`, color: 'text-rose-600', icon: TrendingDown, bg: 'bg-rose-50', ic: 'text-rose-600' },
              { label: 'Saldo Líquido', value: `R$ ${balance.toLocaleString('pt-BR')}`, color: balance >= 0 ? 'text-slate-800' : 'text-rose-600', icon: Wallet, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { label: 'Inadimplência', value: `R$ ${overdueAmount.toLocaleString('pt-BR')}`, color: 'text-rose-500', icon: AlertCircle, bg: 'bg-amber-50', ic: 'text-amber-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-slate-500">{k.label}</p>
                  <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center`}><k.icon className={`h-4 w-4 ${k.ic}`} /></div>
                </div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Demonstrativo de Resultados (DRE)</h3>
                <p className="text-xs text-slate-400">Últimos 4 meses</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height={288} minWidth={0}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v / 1000}k`} />
                  <Tooltip cursor={{ fill: '#f8f7ff' }} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Receita" fill="#10b981" radius={[6, 6, 0, 0]} barSize={36} />
                  <Bar dataKey="Despesa" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 sticky top-0 backdrop-blur z-10">
                <tr>{['Residente', 'Início', 'Valor Mensal', 'Vencimento', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contracts.map(c => {
                  const resident = residents.find(r => r.id === c.residentId || (c.residentName && r.name.toLowerCase() === c.residentName.toLowerCase()));
                  const photoSrc = residentAvatarSrc(c.residentName, resident?.photoUrl);
                  const residentHref = resident ? `/residents/${resident.id}` : '#';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {resident ? (
                            <a
                              href={residentHref}
                              onClick={(e) => {
                                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                                  e.preventDefault();
                                  if (onSelectResident) {
                                    onSelectResident(resident);
                                  } else {
                                    window.location.href = residentHref;
                                  }
                                }
                              }}
                              className="inline-flex items-center gap-3 font-semibold text-slate-800 hover:text-blue-600 group transition-colors"
                            >
                              <img
                                src={photoSrc}
                                alt={c.residentName}
                                className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-sm group-hover:ring-2 group-hover:ring-blue-400 transition-all"
                              />
                              <span className="group-hover:underline">{c.residentName}</span>
                            </a>
                          ) : (
                            <div className="inline-flex items-center gap-3 font-semibold text-slate-800">
                              <img
                                src={photoSrc}
                                alt={c.residentName}
                                className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-sm"
                              />
                              <span>{c.residentName}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(c.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">R$ {c.monthlyValue.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-slate-500">Dia {c.dueDay}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {c.fileUrl ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openContract(c.fileUrl!)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" /> Ver contrato
                          </button>
                          {canEdit && (
                            <>
                              <label className={`inline-flex items-center text-slate-500 hover:text-blue-700 cursor-pointer ${uploadingContractId === c.id ? 'pointer-events-none opacity-60' : ''}`} title="Substituir contrato">
                                {uploadingContractId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                                <span className="sr-only">Substituir contrato</span>
                                <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={uploadingContractId === c.id} onChange={e => { const file = e.target.files?.[0]; if (file) void handleContractFileUpload(c, file); e.currentTarget.value = ''; }} />
                              </label>
                              <button
                                type="button"
                                onClick={() => void handleDeleteContractFile(c)}
                                disabled={uploadingContractId === c.id}
                                className="inline-flex items-center text-slate-400 hover:text-rose-600 disabled:opacity-60 transition-colors"
                                title="Excluir contrato anexado"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Excluir contrato anexado</span>
                              </button>
                            </>
                          )}
                        </div>
                      ) : canEdit ? (
                        <label className={`inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${uploadingContractId === c.id ? 'pointer-events-none opacity-60' : ''}`}>
                          {uploadingContractId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                          {uploadingContractId === c.id ? 'Enviando...' : 'Anexar contrato'}
                          <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={uploadingContractId === c.id} onChange={e => { const file = e.target.files?.[0]; if (file) void handleContractFileUpload(c, file); e.currentTarget.value = ''; }} />
                        </label>
                      ) : (
                        <span className="text-xs text-slate-400">Sem anexo</span>
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

      {/* INVOICES */}
      {activeTab === 'invoices' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'A Receber', value: `R$ ${pendingAmount.toLocaleString('pt-BR')}`, icon: Calendar, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { label: 'Em Atraso', value: `R$ ${overdueAmount.toLocaleString('pt-BR')}`, icon: AlertCircle, bg: 'bg-rose-50', ic: 'text-rose-600' },
              { label: 'Faturas Geradas', value: String(invoices.length), icon: FileCheck, bg: 'bg-slate-100', ic: 'text-slate-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}><k.icon className={`h-5 w-5 ${k.ic}`} /></div>
                <div><p className="text-xs text-slate-500 font-medium">{k.label}</p><p className="text-xl font-bold text-slate-800 mt-0.5">{k.value}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Competência: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>{['Residente', 'Vencimento', 'Valor', 'Status', 'Ação'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.map(inv => {
                    const contract = contracts.find(c => c.id === inv.contractId);
                    const resident = residents.find(r => (contract && r.id === contract.residentId) || (inv.residentName && r.name.toLowerCase() === inv.residentName.toLowerCase()));
                    const photoSrc = residentAvatarSrc(inv.residentName, resident?.photoUrl);
                    const residentHref = resident ? `/residents/${resident.id}` : '#';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {resident ? (
                              <a
                                href={residentHref}
                                onClick={(e) => {
                                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                                    e.preventDefault();
                                    if (onSelectResident) {
                                      onSelectResident(resident);
                                    } else {
                                      window.location.href = residentHref;
                                    }
                                  }
                                }}
                                className="inline-flex items-center gap-3 font-semibold text-slate-800 hover:text-blue-600 group transition-colors"
                              >
                                <img
                                  src={photoSrc}
                                  alt={inv.residentName}
                                  className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-sm group-hover:ring-2 group-hover:ring-blue-400 transition-all"
                                />
                                <span className="group-hover:underline">{inv.residentName}</span>
                              </a>
                            ) : (
                              <div className="inline-flex items-center gap-3 font-semibold text-slate-800">
                                <img
                                  src={photoSrc}
                                  alt={inv.residentName}
                                  className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-sm"
                                />
                                <span>{inv.residentName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 font-semibold">R$ {inv.amount.toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        {inv.status === 'Pago' && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Pago</span>}
                        {inv.status === 'Pendente' && <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">Aguardando</span>}
                        {inv.status === 'Atrasado' && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full"><AlertCircle className="h-3 w-3" /> Atrasado</span>}
                      </td>
                      <td className="px-6 py-4">
                        {inv.status !== 'Pago'
                          ? canEdit
                            ? <button onClick={() => void handleInvoicePayment(inv)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">Confirmar</button>
                            : <span className="text-xs text-slate-400">Pendente</span>
                          : <span className="text-xs text-slate-400">Quitado</span>}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>{['Descrição', 'Categoria', 'Data', 'Valor', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.filter(r => r.type === 'despesa').map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{rec.description}</td>
                    <td className="px-6 py-4"><span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{rec.category}</span></td>
                    <td className="px-6 py-4 text-slate-500">{new Date(rec.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-semibold text-rose-600">- R$ {rec.amount.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4"><span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full capitalize">{rec.status}</span></td>
                    <td className="px-6 py-4">
                      {canDelete && (
                        <button
                          onClick={() => { if (window.confirm('Confirmar exclusão desta despesa?')) void handleDeleteRecord(rec.id); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Excluir despesa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isRecordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setIsRecordModalOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl shrink-0">
              <h3 className="font-bold text-slate-900">Nova Despesa Operacional</h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleRecordSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
                <input required placeholder="Ex: Conta de Luz" value={newRecord.description} onChange={e => setNewRecord({ ...newRecord, description: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor (R$)</label>
                  <input required type="number" placeholder="0.00" value={newRecord.amount} onChange={e => setNewRecord({ ...newRecord, amount: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data</label>
                  <input required type="date" value={newRecord.date} onChange={e => setNewRecord({ ...newRecord, date: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
                <CustomSelect
                  required
                  value={newRecord.category}
                  onChange={v => setNewRecord({ ...newRecord, category: v })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    { value: 'Alimentação', label: 'Alimentação' },
                    { value: 'Farmácia', label: 'Farmácia' },
                    { value: 'Manutenção', label: 'Manutenção' },
                    { value: 'Salários', label: 'Salários' },
                  ]}
                  placeholder="Selecione uma categoria..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsRecordModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isContractModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setIsContractModalOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl shrink-0">
              <h3 className="font-bold text-slate-900">Novo Contrato</h3>
              <button onClick={() => setIsContractModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleContractSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Residente</label>
                <CustomSelect
                  required
                  value={newContract.residentId}
                  onChange={v => setNewContract({ ...newContract, residentId: v })}
                  options={[
                    { value: '', label: 'Selecione o residente...' },
                    ...residents.map(r => ({ value: r.id, label: r.name, desc: `Quarto ${r.room}` }))
                  ]}
                  placeholder="Selecione o residente..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor Mensal (R$)</label>
                  <input required type="number" placeholder="3500" value={newContract.monthlyValue} onChange={e => setNewContract({ ...newContract, monthlyValue: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dia de Vencimento</label>
                  <input required type="number" min="1" max="31" value={newContract.dueDay} onChange={e => setNewContract({ ...newContract, dueDay: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Início</label>
                <input required type="date" min={getTodayDateString()} value={newContract.startDate} onChange={e => setNewContract({ ...newContract, startDate: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contrato do idoso</label>
                <label className="flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
                  <UploadCloud className="h-5 w-5 text-blue-500 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-700 truncate">{contractFile?.name || 'Selecionar contrato'}</span>
                    <span className="block text-xs text-slate-400">PDF ou imagem, até 10 MB</span>
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      if (!file || validateContractFile(file)) setContractFile(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" disabled={isCreatingContract} onClick={() => setIsContractModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60">Cancelar</button>
                <button type="submit" disabled={isCreatingContract} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60">
                  {isCreatingContract && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCreatingContract ? 'Salvando...' : 'Criar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;
