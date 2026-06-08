import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Package, Plus, Minus, X, History, ArrowDownCircle, ArrowUpCircle, PackageSearch } from 'lucide-react';
import { StockItem } from '../types';
import CustomSelect from './CustomSelect';

interface StockModuleProps {
  items: StockItem[];
  onUpdateStock: (id: string, quantity: number) => void;
  onAddItem: (item: StockItem) => void;
}

const categoryConfig: Record<string, { bg: string; text: string; label: string }> = {
  medicamento: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Medicamento' },
  insumo:      { bg: 'bg-violet-50', text: 'text-violet-700', label: 'Insumo' },
  alimento:    { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Alimento' },
};

const StockModule: React.FC<StockModuleProps> = ({ items, onUpdateStock, onAddItem }) => {
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return sessionStorage.getItem('modal_stock_item_open') === 'true';
  });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockItem | null>(() => {
    const saved = sessionStorage.getItem('modal_stock_history_item');
    return saved ? JSON.parse(saved) : null;
  });
  const [newItem, setNewItem] = useState(() => {
    const saved = sessionStorage.getItem('modal_stock_new_item');
    return saved ? JSON.parse(saved) : { name: '', category: 'medicamento', quantity: '', unit: '', minThreshold: '' };
  });

  React.useEffect(() => {
    if (isModalOpen) {
      sessionStorage.setItem('modal_stock_item_open', 'true');
      sessionStorage.setItem('modal_stock_new_item', JSON.stringify(newItem));
    } else {
      sessionStorage.removeItem('modal_stock_item_open');
      sessionStorage.removeItem('modal_stock_new_item');
    }
  }, [isModalOpen, newItem]);

  React.useEffect(() => {
    if (selectedHistoryItem) {
      sessionStorage.setItem('modal_stock_history_item', JSON.stringify(selectedHistoryItem));
    } else {
      sessionStorage.removeItem('modal_stock_history_item');
    }
  }, [selectedHistoryItem]);

  const lowCount = items.filter(i => i.quantity < i.minThreshold).length;
  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity) return;
    onAddItem({
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      category: newItem.category as any,
      quantity: parseInt(newItem.quantity),
      unit: newItem.unit || 'unid',
      minThreshold: parseInt(newItem.minThreshold) || 10,
      history: [],
    });
    setIsModalOpen(false);
    setNewItem({ name: '', category: 'medicamento', quantity: '', unit: '', minThreshold: '' });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque e Insumos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{items.length} itens cadastrados{lowCount > 0 ? ` · ${lowCount} em nível crítico` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {lowCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              <AlertTriangle className="h-3.5 w-3.5" /> {lowCount} crítico{lowCount !== 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200"
          >
            <Plus className="h-4 w-4" /> Novo Item
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {items.map(item => {
          const isLow = item.quantity < item.minThreshold;
          const cat = categoryConfig[item.category] ?? categoryConfig.insumo;
          return (
            <div key={item.id} className={`bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-4 ${isLow ? 'ring-1 ring-rose-200' : ''}`}>
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
                  <button onClick={() => onUpdateStock(item.id, item.quantity + 1)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-violet-600 hover:bg-violet-100 transition-colors shadow-sm">
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
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Item</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Categoria</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Quantidade</th>
              <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Ajustar</th>
              <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Histórico</th>
              <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map(item => {
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
                      <button onClick={() => onUpdateStock(item.id, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-violet-50 hover:bg-violet-100 flex items-center justify-center transition-colors">
                        <Plus className="h-3.5 w-3.5 text-violet-600" />
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
        {items.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
              <PackageSearch className="h-7 w-7 text-violet-200" />
            </div>
            <p className="text-sm text-slate-400">Nenhum item no estoque.</p>
          </div>
        )}
      </div>

      {/* Add Item Modal - Sempre ativo (não fecha ao clicar no fundo/backdrop) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-[#F8F7FF] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Novo Item de Estoque</h3>
                <p className="text-xs text-slate-400 mt-0.5">Preencha as informações do item</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors">
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
                    { value: 'insumo', label: 'Insumo', badge: { label: 'Insumo', bg: 'bg-violet-50', text: 'text-violet-700' } },
                    { value: 'alimento', label: 'Alimento', badge: { label: 'Alimento', bg: 'bg-amber-50', text: 'text-amber-700' } },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantidade</label>
                  <input required type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidade</label>
                  <input type="text" placeholder="cx, un, kg" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alerta Mínimo</label>
                <input type="number" placeholder="Notificar quando atingir..." value={newItem.minThreshold} onChange={e => setNewItem({ ...newItem, minThreshold: e.target.value })} className={inputClass} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal - Sempre ativo (não fecha ao clicar no fundo/backdrop) */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-[#F8F7FF] flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-slate-800">Histórico de Movimentações</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedHistoryItem.name}</p>
              </div>
              <button onClick={() => setSelectedHistoryItem(null)} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedHistoryItem.history?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-slate-100">
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
                  <History className="h-8 w-8 text-slate-200" />
                  <p className="text-sm text-slate-400">Nenhum histórico registrado.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setSelectedHistoryItem(null)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockModule;
