import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Package, Plus, Minus, X, History, ArrowDownCircle, ArrowUpCircle, PackageSearch, Search, User, ChevronRight } from 'lucide-react';
import { StockItem, Resident } from '../types';
import CustomSelect from './CustomSelect';
import { residentAvatarSrc } from '../lib/avatar';

interface StockModuleProps {
  items: StockItem[];
  residents: Resident[];
  onUpdateStock: (id: string, quantity: number) => void;
  onAddItem: (item: StockItem) => void;
}

const categoryConfig: Record<string, { bg: string; text: string; label: string }> = {
  medicamento: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Medicamento' },
  insumo:      { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Insumo' },
  alimento:    { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Alimento' },
};

const careLevelConfig = {
  I: { label: 'Grau I', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  II: { label: 'Grau II', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  III: { label: 'Grau III', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
};

const StockModule: React.FC<StockModuleProps> = ({ items, residents = [], onUpdateStock, onAddItem }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'residents'>('general');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [residentSearch, setResidentSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return localStorage.getItem('modal_stock_item_open') === 'true';
  });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockItem | null>(() => {
    const saved = localStorage.getItem('modal_stock_history_item');
    return saved ? JSON.parse(saved) : null;
  });
  const [newItem, setNewItem] = useState(() => {
    const saved = localStorage.getItem('modal_stock_new_item');
    return saved ? JSON.parse(saved) : { name: '', category: 'medicamento', quantity: '', unit: '', minThreshold: '10', expirationDate: '', residentId: undefined };
  });

  React.useEffect(() => {
    if (isModalOpen) {
      localStorage.setItem('modal_stock_item_open', 'true');
      localStorage.setItem('modal_stock_new_item', JSON.stringify(newItem));
    } else {
      localStorage.removeItem('modal_stock_item_open');
      localStorage.removeItem('modal_stock_new_item');
    }
  }, [isModalOpen, newItem]);

  React.useEffect(() => {
    if (selectedHistoryItem) {
      localStorage.setItem('modal_stock_history_item', JSON.stringify(selectedHistoryItem));
    } else {
      localStorage.removeItem('modal_stock_history_item');
    }
  }, [selectedHistoryItem]);

  const handleOpenModal = (resId?: string) => {
    setNewItem({
      name: '',
      category: 'medicamento',
      quantity: '',
      unit: '',
      minThreshold: '10',
      expirationDate: '',
      residentId: resId
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity) return;
    if (newItem.category === 'medicamento' && !newItem.expirationDate) return;
    onAddItem({
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      category: newItem.category as any,
      quantity: parseInt(newItem.quantity),
      unit: newItem.unit || 'unid',
      minThreshold: parseInt(newItem.minThreshold) || 10,
      expirationDate: newItem.category === 'medicamento' ? newItem.expirationDate : undefined,
      residentId: newItem.residentId,
      history: [],
    });
    setNewItem({ name: '', category: 'medicamento', quantity: '', unit: '', minThreshold: '10', expirationDate: '', residentId: undefined });
  };

  // Filter items for general stock (residentId is null or undefined)
  const generalItems = items.filter(item => !item.residentId);
  const generalLowCount = generalItems.filter(i => i.quantity < i.minThreshold).length;

  // Filter residents based on search input
  const filteredResidents = residents.filter(r =>
    r.name.toLowerCase().includes(residentSearch.toLowerCase()) ||
    r.room.toLowerCase().includes(residentSearch.toLowerCase())
  );

  // Helper to get critical items count for a specific resident
  const getResidentLowStockCount = (resId: string) => {
    return items
      .filter(item => item.residentId === resId)
      .filter(item => item.quantity < item.minThreshold).length;
  };

  // Selected resident stock items
  const residentItems = selectedResident ? items.filter(item => item.residentId === selectedResident.id) : [];
  const residentLowCount = residentItems.filter(i => i.quantity < i.minThreshold).length;

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Estoque e Insumos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerenciamento de insumos gerais e controle individual por residente</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center"> <Package className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-1.5 flex gap-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Package className="h-4 w-4" /> Estoque Geral
        </button>
        <button
          onClick={() => setActiveTab('residents')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'residents'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <User className="h-4 w-4" /> Estoque por Residente
        </button>
      </div>

      {/* GENERAL STOCK TAB */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Sub Header for General Stock */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-800 text-base">Insumos de Uso Geral</h2>
              <p className="text-slate-500 text-xs mt-0.5">{generalItems.length} itens cadastrados{generalLowCount > 0 ? ` · ${generalLowCount} em nível crítico` : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              {generalLowCount > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <AlertTriangle className="h-3.5 w-3.5" /> {generalLowCount} crítico{generalLowCount !== 1 ? 's' : ''}
                </div>
              )}
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
              >
                <Plus className="h-4 w-4" /> Novo Item Geral
              </button>
            </div>
          </div>

          {/* General Stock Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {generalItems.map(item => {
              const isLow = item.quantity < item.minThreshold;
              const cat = categoryConfig[item.category] ?? categoryConfig.insumo;
              return (
                <div key={item.id} className={`bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-4 ${isLow ? 'ring-1 ring-rose-200' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center shrink-0`}>
                        <Package className={`h-5 w-5 ${cat.text}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                        <span className={`text-xs font-semibold ${cat.bg} ${cat.text} px-2 py-0.5 rounded-full`}>{cat.label}</span>
                      </div>
                    </div>
                    {isLow
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> Repor</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Regular</span>}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Quantidade</p>
                      <p className={`text-2xl font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                        {item.quantity} <span className="text-sm text-slate-400 font-normal">{item.unit}</span>
                      </p>
                      <p className="text-xs text-slate-400">Mín: {item.minThreshold}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onUpdateStock(item.id, item.quantity - 1)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
                        <Minus className="h-4 w-4" />
                      </button>
                      <button onClick={() => onUpdateStock(item.id, item.quantity + 1)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setSelectedHistoryItem(item)} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-colors">
                    <History className="h-3.5 w-3.5" /> Ver Histórico
                  </button>
                </div>
              );
            })}
            {generalItems.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center flex flex-col items-center gap-3">
                <PackageSearch className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-400">Nenhum item geral no estoque.</p>
              </div>
            )}
          </div>

          {/* General Stock Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Item</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Categoria</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Quantidade</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Ajustar</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Histórico</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {generalItems.map(item => {
                  const isLow = item.quantity < item.minThreshold;
                  const cat = categoryConfig[item.category] ?? categoryConfig.insumo;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center`}>
                            <Package className={`h-4 w-4 ${cat.text}`} />
                          </div>
                          <span className="font-semibold text-slate-800">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>{item.quantity}</span>
                        <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                        <span className="text-xs text-slate-400 ml-2">/ mín {item.minThreshold}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => onUpdateStock(item.id, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                            <Minus className="h-3.5 w-3.5 text-slate-600" />
                          </button>
                          <button onClick={() => onUpdateStock(item.id, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                            <Plus className="h-3.5 w-3.5 text-blue-600" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setSelectedHistoryItem(item)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center mx-auto transition-colors">
                          <History className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isLow
                          ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> Repor</span>
                          : <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Regular</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {generalItems.length === 0 && (
              <div className="py-16 flex flex-col items-center gap-3 bg-white">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <PackageSearch className="h-7 w-7 text-blue-200" />
                </div>
                <p className="text-sm text-slate-400">Nenhum item geral no estoque.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESIDENTS STOCK TAB */}
      {activeTab === 'residents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Panel: Residents Search and List */}
          <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 p-4 space-y-4 lg:col-span-1">
            <h3 className="font-bold text-slate-800 text-sm">Pesquisa de Residentes</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar residente ou quarto..."
                value={residentSearch}
                onChange={e => setResidentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Scrollable Resident List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredResidents.map(resident => {
                const isSelected = selectedResident?.id === resident.id;
                const criticalCount = getResidentLowStockCount(resident.id);
                
                return (
                  <button
                    key={resident.id}
                    onClick={() => setSelectedResident(resident)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={residentAvatarSrc(resident.name, resident.photoUrl)}
                        alt=""
                        className={`w-10 h-10 rounded-xl object-cover shrink-0 border ${
                          isSelected ? 'border-blue-400' : 'border-slate-100'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {resident.name}
                        </p>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                          Quarto {resident.room}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {criticalCount > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 ${
                          isSelected ? 'bg-white text-rose-600' : 'bg-rose-50 border border-rose-100 text-rose-600'
                        }`}>
                          <AlertTriangle className="h-2.5 w-2.5" /> {criticalCount}
                        </span>
                      )}
                      <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
                        isSelected ? 'text-blue-200' : 'text-slate-400'
                      }`} />
                    </div>
                  </button>
                );
              })}

              {filteredResidents.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum residente encontrado.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Resident Stock Items */}
          <div className="lg:col-span-2 space-y-4">
            {selectedResident ? (
              <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 overflow-hidden">
                
                {/* Selected Resident Mini Profile & Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={residentAvatarSrc(selectedResident.name, selectedResident.photoUrl)}
                      alt={selectedResident.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{selectedResident.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-500 text-xs">Quarto {selectedResident.room} · {selectedResident.age} anos</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          careLevelConfig[selectedResident.careLevel]?.bg || 'bg-slate-50'
                        } ${
                          careLevelConfig[selectedResident.careLevel]?.text || 'text-slate-600'
                        }`}>
                          {careLevelConfig[selectedResident.careLevel]?.label || selectedResident.careLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenModal(selectedResident.id)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 self-start sm:self-center"
                  >
                    <Plus className="h-4 w-4" /> Adicionar Insumo
                  </button>
                </div>

                {/* Resident Stock List (Mobile) */}
                <div className="block md:hidden p-4 space-y-4">
                  {residentItems.map(item => {
                    const isLow = item.quantity < item.minThreshold;
                    const cat = categoryConfig[item.category] ?? categoryConfig.insumo;
                    return (
                      <div key={item.id} className={`bg-slate-50/50 rounded-2xl border border-slate-100 p-4 ${isLow ? 'ring-1 ring-rose-250 bg-rose-50/10' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center shrink-0`}>
                              <Package className={`h-4 w-4 ${cat.text}`} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                              <span className={`text-[10px] font-semibold ${cat.bg} ${cat.text} px-2 py-0.5 rounded-full`}>{cat.label}</span>
                            </div>
                          </div>
                          {isLow
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full"><AlertTriangle className="h-2.5 w-2.5" /> Repor</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-2.5 w-2.5" /> Regular</span>}
                        </div>

                        <div className="bg-white rounded-xl p-3 flex items-center justify-between mb-3 border border-slate-100">
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">Quantidade</p>
                            <p className={`text-xl font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                              {item.quantity} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                            </p>
                            <p className="text-[10px] text-slate-450">Limite crítico: {item.minThreshold}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => onUpdateStock(item.id, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 transition-colors shadow-sm">
                              <Minus className="h-4 w-4" />
                            </button>
                            <button onClick={() => onUpdateStock(item.id, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors shadow-sm">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <button onClick={() => setSelectedHistoryItem(item)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                          <History className="h-3.5 w-3.5 text-slate-400" /> Histórico de Uso
                        </button>
                      </div>
                    );
                  })}
                  {residentItems.length === 0 && (
                    <div className="py-12 text-center flex flex-col items-center gap-3">
                      <PackageSearch className="h-10 w-10 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-500">Nenhum insumo associado.</p>
                      <p className="text-xs text-slate-400 max-w-xs">Clique no botão superior "Adicionar Insumo" para registrar o primeiro suprimento deste residente.</p>
                    </div>
                  )}
                </div>

                {/* Resident Stock List (Desktop) */}
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Item</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Categoria</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Quantidade</th>
                        <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Ajustar</th>
                        <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Histórico</th>
                        <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {residentItems.map(item => {
                        const isLow = item.quantity < item.minThreshold;
                        const cat = categoryConfig[item.category] ?? categoryConfig.insumo;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center`}>
                                  <Package className={`h-4 w-4 ${cat.text}`} />
                                </div>
                                <span className="font-semibold text-slate-800">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-lg font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>{item.quantity}</span>
                              <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                              <span className="text-xs text-slate-400 ml-2">/ mín {item.minThreshold}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => onUpdateStock(item.id, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                  <Minus className="h-3.5 w-3.5 text-slate-650" />
                                </button>
                                <button onClick={() => onUpdateStock(item.id, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                                  <Plus className="h-3.5 w-3.5 text-blue-700" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => setSelectedHistoryItem(item)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center mx-auto transition-colors">
                                <History className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isLow
                                ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> Repor</span>
                                : <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Regular</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {residentItems.length === 0 && (
                    <div className="py-16 flex flex-col items-center gap-3 bg-white text-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <PackageSearch className="h-7 w-7 text-blue-200" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">Nenhum insumo associado.</p>
                      <p className="text-xs text-slate-400 max-w-sm">Clique no botão "Adicionar Insumo" no topo direito para vincular o primeiro insumo personalizado a este residente.</p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              // Empty State when no resident is selected
              <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 border border-slate-100 py-24 flex flex-col items-center justify-center gap-4 text-center p-6 h-full min-h-[350px]">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-400 animate-bounce">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Gerenciamento de Insumos Individuais</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                    Selecione um residente na lista ao lado para visualizar e gerenciar seu estoque pessoal de medicamentos, fraldas, dietas especiais ou outros insumos clínicos.
                  </p>
                </div>
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-slate-900">
                  {newItem.residentId ? 'Novo Insumo de Residente' : 'Novo Item de Estoque Geral'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {newItem.residentId
                    ? `Vincular suprimento a ${residents.find(r => r.id === newItem.residentId)?.name || 'Residente'}`
                    : 'Preencha as informações do item geral'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Item</label>
                <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className={inputClass} placeholder="Ex: Dipirona 500mg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
                <CustomSelect
                  value={newItem.category}
                  onChange={v => setNewItem({ ...newItem, category: v })}
                  options={[
                    { value: 'medicamento', label: 'Medicamento', badge: { label: 'Medicamento', bg: 'bg-blue-50', text: 'text-blue-700' } },
                    { value: 'insumo', label: 'Insumo', badge: { label: 'Insumo', bg: 'bg-blue-50', text: 'text-blue-700' } },
                    { value: 'alimento', label: 'Alimento', badge: { label: 'Alimento', bg: 'bg-amber-50', text: 'text-amber-700' } },
                  ]}
                />
              </div>
              {newItem.category === 'medicamento' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Validade</label>
                  <input
                    required
                    type="date"
                    value={newItem.expirationDate || ''}
                    onChange={e => setNewItem({ ...newItem, expirationDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantidade Inicial</label>
                  <input required type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className={inputClass} min="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidade</label>
                  <input type="text" placeholder="cx, un, kg" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alerta Mínimo (Gatilho Crítico)</label>
                <input type="number" placeholder="Notificar quando atingir..." value={newItem.minThreshold} onChange={e => setNewItem({ ...newItem, minThreshold: e.target.value })} className={inputClass} min="0" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-900">Histórico de Movimentações</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedHistoryItem.name}</p>
              </div>
              <button onClick={() => setSelectedHistoryItem(null)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedHistoryItem.history && selectedHistoryItem.history.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm shadow-slate-100/10">
                    <tr>
                      {['Data', 'Tipo', 'Qtd', 'Responsável'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedHistoryItem.history.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-xs text-slate-600">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3">
                          {log.type === 'entrada'
                            ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ArrowUpCircle className="h-3.5 w-3.5" /> Entrada</span>
                            : log.type === 'saida'
                            ? <span className="flex items-center gap-1 text-xs font-semibold text-rose-600"><ArrowDownCircle className="h-3.5 w-3.5" /> Saída</span>
                            : <span className="text-xs text-slate-500">Ajuste</span>}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-800">{log.quantity}</td>
                        <td className="px-5 py-3 text-xs text-slate-500">{log.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 flex flex-col items-center gap-3">
                  <History className="h-8 w-8 text-slate-250" />
                  <p className="text-sm text-slate-400">Nenhum histórico registrado.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setSelectedHistoryItem(null)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-650 hover:bg-slate-50 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockModule;
