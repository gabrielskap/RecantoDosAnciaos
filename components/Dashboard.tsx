import React, { useState } from 'react';
import {
  Users, AlertTriangle, TrendingUp, Calendar, Activity, Bot,
  PackageX, X, Sparkles, ClipboardCheck, PackageCheck, Sliders,
  Mail, CheckCircle2, Check, ArrowUpRight, BellRing, ShieldAlert
} from 'lucide-react';
import { Resident, FinancialRecord, StockItem } from '../types';

interface DashboardProps {
  residents: Resident[];
  financials: FinancialRecord[];
  stockAlerts?: StockItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ residents, financials, stockAlerts = [] }) => {
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [optimizationRate, setOptimizationRate] = useState(15);
  const [bulkBuyChecked, setBulkBuyChecked] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [stockAdjusted, setStockAdjusted] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [pdfExported, setPdfExported] = useState(false);

  const handleAdjustStock = () => {
    setAdjustingStock(true);
    setTimeout(() => { setAdjustingStock(false); setStockAdjusted(true); }, 1000);
  };
  const handleRequestQuote = () => {
    setRequestingQuote(true);
    setTimeout(() => { setRequestingQuote(false); setQuoteRequested(true); }, 1200);
  };
  const handleExportPdf = () => {
    setPdfExported(true);
    setTimeout(() => setPdfExported(false), 3000);
  };

  const finalUnitPrice = bulkBuyChecked ? 29.20 : 35.60;
  const baselineCost = 225 * 35.60;
  const qtyReduction = Math.round(225 * (optimizationRate / 100));
  const optimizedQty = 225 - qtyReduction;
  const optimizedCost = optimizedQty * finalUnitPrice;
  const savingsValue = baselineCost - optimizedCost;

  const totalResidents = residents.length;
  const highCare = residents.filter(r => r.careLevel === 'III').length;
  const pendingBills = financials.filter(f => f.type === 'despesa' && f.status === 'pendente').length;
  const capacity = 40;
  const occupancyRate = Math.round((totalResidents / capacity) * 100);

  const staticAlerts = [
    { id: 'a1', text: 'Maria Silva apresentou pressão arterial elevada (160/95)', time: '10:30', type: 'critical' },
    { id: 'a2', text: 'João Santos recusou medicação matinal', time: '08:45', type: 'info' },
  ];
  const dynamicStockAlerts = stockAlerts.map(item => ({
    id: `stock-${item.id}`,
    text: `Estoque crítico: ${item.name} (${item.quantity} ${item.unit})`,
    time: 'Agora',
    type: 'warning',
  }));
  const allAlerts = [...dynamicStockAlerts, ...staticAlerts];

  const kpis = [
    {
      label: 'Ocupação',
      value: `${totalResidents}/${capacity}`,
      sub: `${occupancyRate}% da capacidade`,
      icon: Users,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      progress: occupancyRate,
      progressColor: 'bg-violet-500',
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
      value: '3',
      sub: 'Musicoterapia às 14h',
      icon: Calendar,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
  ];

  const alertIcon = (type: string) => {
    if (type === 'critical') return 'bg-rose-500';
    if (type === 'warning') return 'bg-amber-500';
    return 'bg-blue-400';
  };

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Visão geral da unidade · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200">
            <TrendingUp className="h-5 w-5 text-white" />
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
          <div key={kpi.label} className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-5">
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

      {/* Alerts + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Alerts */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">Alertas e Notificações</h2>
              <p className="text-xs text-slate-400 mt-0.5">Atualizações recentes da unidade</p>
            </div>
            {allAlerts.length > 0 && (
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <BellRing className="h-4.5 w-4.5 text-amber-500" />
              </div>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {allAlerts.map(alert => (
              <div key={alert.id} className="flex items-center px-5 py-3.5 hover:bg-slate-50 transition-colors gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${alertIcon(alert.type)}`} />
                <p className="flex-1 text-sm text-slate-700 font-medium">{alert.text}</p>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{alert.time}</span>
              </div>
            ))}
            {allAlerts.length === 0 && (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum alerta no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Card */}
        <div
          className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 rounded-2xl shadow-md p-6 text-white relative overflow-hidden cursor-pointer"
          onClick={() => setIsAnalysisModalOpen(true)}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
            <Bot className="w-full h-full text-white/10" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <h3 className="font-bold text-base mb-2">Assistente IA</h3>
            <p className="text-violet-200 text-xs leading-relaxed mb-4">
              Percebi um aumento de 15% nos custos com fraldas geriátricas este mês. Deseja analisar?
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full">
              Ver Análise <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">

            <div className="px-6 py-4 bg-gradient-to-r from-violet-700 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-base">Análise Avançada IA</h3>
                  <p className="text-xs text-violet-200">Recanto Insight · Custo de Insumos</p>
                </div>
              </div>
              <button onClick={() => setIsAnalysisModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#F8F7FF]">

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Consumo Atípico Detectado</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Consumo aumentou <strong>15,3%</strong> em relação ao mês anterior, gerando custo excedente de <strong>R$ 1.068,00</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Mês Anterior', value: '195 pacotes', sub: 'R$ 6.942,00', color: 'text-slate-600', border: 'border-slate-200' },
                  { label: 'Mês Atual', value: '225 pacotes', sub: 'R$ 8.010,00', color: 'text-rose-600', border: 'border-rose-200' },
                  { label: 'Custo Unitário', value: 'R$ 35,60', sub: '+3,5% inflação', color: 'text-slate-700', border: 'border-slate-200' },
                ].map(m => (
                  <div key={m.label} className={`bg-white rounded-2xl border ${m.border} p-4 shadow-sm`}>
                    <p className="text-xs text-slate-400 font-medium mb-1">{m.label}</p>
                    <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{m.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-4">
                  <Bot className="h-4 w-4 text-violet-500" /> Diagnóstico da IA
                </h4>
                <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                  {[
                    { title: 'Novas Admissões Críticas (65% do aumento)', text: 'Admissão de 2 residentes com Grau III com trocas intensificadas: Maria da S. e Roberto C.' },
                    { title: 'Desvio no Turno Noturno (22%)', text: 'Trocas por programação fixa em vez de checagem assistida de umidade conforme protocolo.' },
                    { title: 'Custo de Frete Fracionado', text: 'Compras de urgência com taxa de entrega expressa inserida no preço unitário.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-300 mt-2 shrink-0" />
                      <p><strong className="text-slate-800">{item.title}:</strong> {item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-emerald-400" /> Simulação de Otimização
                  </h4>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">Interativo</span>
                </div>

                <label className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                  <input type="checkbox" checked={bulkBuyChecked} onChange={e => setBulkBuyChecked(e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500 h-5 w-5 bg-slate-900 border-slate-700 cursor-pointer mt-0.5" />
                  <div>
                    <span className="font-bold text-sm text-slate-100 block">Compra em Volume (Caixa Master)</span>
                    <p className="text-xs text-slate-400 mt-0.5">Reduz de R$ 35,60 para R$ 29,20 via licitação</p>
                  </div>
                </label>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">Meta de Redução de Desperdício</span>
                    <span className="text-emerald-400 font-bold">{optimizationRate}%</span>
                  </div>
                  <input type="range" min="0" max="35" value={optimizationRate} onChange={e => setOptimizationRate(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0% Status Quo</span><span>35% Máximo</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Gasto Otimizado</span>
                    <p className="text-xl font-bold text-white mt-0.5">R$ {optimizedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{qtyReduction} pacotes economizados</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-400 uppercase tracking-wider font-bold">Economia</span>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5">+R$ {savingsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-emerald-300 mt-0.5">R$ {(savingsValue * 12).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/ano</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    label: 'Ajustar Alerta de Estoque',
                    sub: stockAdjusted ? 'Ajustado para 60 unidades!' : adjustingStock ? 'Salvando...' : 'Alterar gatilho crítico para 60 un.',
                    done: stockAdjusted, loading: adjustingStock,
                    icon: PackageCheck, onClick: handleAdjustStock,
                  },
                  {
                    label: 'Disparar Cotação Automática',
                    sub: quoteRequested ? 'E-mails enviados!' : requestingQuote ? 'Contatando fornecedores...' : 'Enviar para 3 distribuidoras',
                    done: quoteRequested, loading: requestingQuote,
                    icon: Mail, onClick: handleRequestQuote,
                  },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    disabled={action.done || action.loading}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left border transition-all ${action.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]'}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {action.done ? <Check className="h-4 w-4" /> : <action.icon className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs block text-slate-800">{action.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5 block">{action.sub}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAnalysisModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition-all">
                Fechar
              </button>
              <button onClick={handleExportPdf} disabled={pdfExported} className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all flex items-center gap-2 ${pdfExported ? 'bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'}`}>
                {pdfExported ? <><Check className="h-4 w-4" /> Exportado!</> : <><ClipboardCheck className="h-4 w-4" /> Exportar PDF</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
