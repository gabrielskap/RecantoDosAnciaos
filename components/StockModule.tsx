import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Package, Plus, Minus, X, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { StockItem } from '../types';

interface StockModuleProps {
  items: StockItem[];
  onUpdateStock: (id: string, quantity: number) => void;
  onAddItem: (item: StockItem) => void;
}

const StockModule: React.FC<StockModuleProps> = ({ items, onUpdateStock, onAddItem }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockItem | null>(null);
  
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'medicamento',
    quantity: '',
    unit: '',
    minThreshold: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity) return;

    const item: StockItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      category: newItem.category as any,
      quantity: parseInt(newItem.quantity),
      unit: newItem.unit || 'unid',
      minThreshold: parseInt(newItem.minThreshold) || 10,
      history: []
    };

    onAddItem(item);
    setIsModalOpen(false);
    setNewItem({ name: '', category: 'medicamento', quantity: '', unit: '', minThreshold: '' });
  };

  const openHistory = (item: StockItem) => {
    setSelectedHistoryItem(item);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque e Insumos</h1>
          <p className="text-slate-500">Gerenciamento de inventário e compras</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="hidden sm:block bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600">
            Total de Itens: <span className="font-bold text-slate-900">{items.length}</span>
          </div>
          <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
           >
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Responsive Dual Layout: Cards on Mobile, Table on Desktop */}
      {/* Mobile Card Layout */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {items.map((item) => {
          const isLow = item.quantity < item.minThreshold;
          return (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${item.category === 'medicamento' ? 'bg-blue-100 text-blue-600' : item.category === 'alimento' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-[15px]">{item.name}</h3>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] capitalize text-slate-600 font-medium">{item.category}</span>
                  </div>
                </div>
                <div>
                  {isLow ? (
                    <span className="inline-flex items-center text-red-600 bg-red-55 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-100">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Repor
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-emerald-600 bg-emerald-55 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Regular
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 my-1">
                <div>
                  <span className="text-xs text-slate-500 block">Quantidade</span>
                  <span className={`font-bold text-lg ${isLow ? 'text-red-650' : 'text-slate-700'}`}>
                    {item.quantity}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                </div>
                
                {/* Actions with comfortable touch targets! 11*4 = 44px */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => onUpdateStock(item.id, item.quantity - 1)}
                    className="w-[44px] h-[44px] flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 active:bg-slate-100 shadow-sm hover:border-slate-300 transition-colors"
                    title="Remover 1"
                  >
                    <Minus size={16} />
                  </button>
                  <button 
                    onClick={() => onUpdateStock(item.id, item.quantity + 1)}
                    className="w-[44px] h-[44px] flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 active:bg-slate-100 shadow-sm hover:border-slate-300 transition-colors"
                    title="Adicionar 1"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                <button 
                  onClick={() => openHistory(item)}
                  className="flex items-center gap-1.5 px-3 py-[10px] text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm transition-all text-center w-full justify-center"
                >
                  <History size={15} />
                  Histórico de Movimentações
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Quantidade</th>
                <th className="px-6 py-4 text-center">Ações</th>
                <th className="px-6 py-4 text-center">Histórico</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isLow = item.quantity < item.minThreshold;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-3 ${item.category === 'medicamento' ? 'bg-blue-100 text-blue-600' : item.category === 'alimento' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                          <Package size={16} />
                        </div>
                        <span className="font-medium text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs">{item.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold text-lg ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.quantity}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <button 
                          onClick={() => onUpdateStock(item.id, item.quantity - 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Remover 1"
                        >
                          <Minus size={14} />
                        </button>
                        <button 
                          onClick={() => onUpdateStock(item.id, item.quantity + 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Adicionar 1"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <button 
                         onClick={() => openHistory(item)}
                         className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-colors"
                         title="Ver Histórico de Movimentações"
                       >
                         <History size={18} />
                       </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center text-red-600 bg-red-55 px-3 py-1 rounded-full text-xs font-medium border border-red-100">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Repor (Min: {item.minThreshold})
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-600 bg-emerald-55 px-3 py-1 rounded-full text-xs font-medium border border-emerald-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Regular
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

       {/* Add Item Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Novo Item de Estoque</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Item</label>
                <input 
                  required
                  type="text" 
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <select 
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="medicamento">Medicamento</option>
                  <option value="insumo">Insumo</option>
                  <option value="alimento">Alimento</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                   <input 
                    required
                    type="number" 
                    value={newItem.quantity}
                    onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                   <input 
                    type="text" 
                    placeholder="cx, un, kg"
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alerta Mínimo</label>
                  <input 
                    type="number" 
                    placeholder="Avisar quando chegar em..."
                    value={newItem.minThreshold}
                    onChange={e => setNewItem({...newItem, minThreshold: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-lg transition-colors">
                  Adicionar ao Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
           <div className="bg-white rounded-xl shadow-lg max-w-lg w-full overflow-hidden max-h-[80vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h3 className="font-semibold text-slate-800">Histórico de Movimentações</h3>
                  <p className="text-sm text-slate-500">{selectedHistoryItem.name}</p>
                </div>
                <button onClick={() => setSelectedHistoryItem(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-0 overflow-y-auto flex-1">
                 {selectedHistoryItem.history && selectedHistoryItem.history.length > 0 ? (
                    <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase sticky top-0">
                         <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3">Qtd</th>
                            <th className="px-6 py-3">Responsável</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {selectedHistoryItem.history.map((log) => (
                           <tr key={log.id}>
                              <td className="px-6 py-3 text-xs">
                                {new Date(log.date).toLocaleDateString()} <br/>
                                <span className="text-slate-400">{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </td>
                              <td className="px-6 py-3">
                                 {log.type === 'entrada' ? (
                                   <span className="flex items-center text-emerald-600 font-medium text-xs">
                                      <ArrowUpCircle size={14} className="mr-1" /> Entrada
                                   </span>
                                 ) : log.type === 'saida' ? (
                                   <span className="flex items-center text-rose-600 font-medium text-xs">
                                      <ArrowDownCircle size={14} className="mr-1" /> Saída
                                   </span>
                                 ) : (
                                   <span className="text-slate-600 text-xs">Ajuste</span>
                                 )}
                              </td>
                              <td className="px-6 py-3 font-semibold">
                                 {log.quantity}
                              </td>
                              <td className="px-6 py-3 text-xs">
                                 <p>{log.user}</p>
                                 {log.notes && <p className="text-slate-400 italic truncate max-w-[100px]">{log.notes}</p>}
                              </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                 ) : (
                    <div className="p-8 text-center text-slate-400">
                       <History size={32} className="mx-auto mb-2 opacity-30" />
                       <p>Nenhum histórico registrado.</p>
                    </div>
                 )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right shrink-0">
                 <button onClick={() => setSelectedHistoryItem(null)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Fechar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StockModule;