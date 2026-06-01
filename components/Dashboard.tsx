import React, { useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Activity, 
  Bot, 
  PackageX, 
  X, 
  Sparkles, 
  ClipboardCheck, 
  PackageCheck, 
  Sliders, 
  Mail, 
  CheckCircle2, 
  TrendingDown, 
  Check, 
  ArrowUpRight 
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
    setTimeout(() => {
      setAdjustingStock(false);
      setStockAdjusted(true);
    }, 1000);
  };

  const handleRequestQuote = () => {
    setRequestingQuote(true);
    setTimeout(() => {
      setRequestingQuote(false);
      setQuoteRequested(true);
    }, 1200);
  };

  const handleExportPdf = () => {
    setPdfExported(true);
    setTimeout(() => {
      setPdfExported(false);
    }, 3000);
  };

  const finalUnitPrice = bulkBuyChecked ? 29.20 : 35.60;
  const baselineCost = 225 * 35.60; // 8010
  const qtyReduction = Math.round(225 * (optimizationRate / 100));
  const optimizedQty = 225 - qtyReduction;
  const optimizedCost = optimizedQty * finalUnitPrice;
  const savingsValue = baselineCost - optimizedCost;

  const totalResidents = residents.length;
  const highCare = residents.filter(r => r.careLevel === 'III').length; // Corrected to match type definition 'III'
  const pendingBills = financials.filter(f => f.type === 'despesa' && f.status === 'pendente').length;
  
  // Calculate Occupancy (Mock capacity 40)
  const capacity = 40;
  const occupancyRate = Math.round((totalResidents / capacity) * 100);

  // Combine static alerts with dynamic stock alerts
  const staticAlerts = [
    { id: 'a1', text: "Maria Silva apresentou pressão arterial elevada (160/95)", time: "10:30", type: "critical" },
    { id: 'a2', text: "João Santos recusou medicação matinal", time: "08:45", type: "info" },
  ];

  const dynamicStockAlerts = stockAlerts.map((item, index) => ({
    id: `stock-${item.id}`,
    text: `Estoque Baixo: ${item.name} (${item.quantity} ${item.unit})`,
    time: 'Agora',
    type: 'warning'
  }));

  const allAlerts = [...dynamicStockAlerts, ...staticAlerts];

  return (
    <div className="space-y-6">
      {/* Prominent Stock Alert Banner */}
      {stockAlerts.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 rounded-r-xl p-4 shadow-sm flex items-start animate-in fade-in slide-in-from-top-2">
           <div className="p-2 bg-white rounded-full text-rose-500 mr-4 shadow-sm shrink-0">
             <AlertTriangle className="h-6 w-6" />
           </div>
           <div className="flex-1">
             <h3 className="font-bold text-rose-800 text-lg flex items-center">
               Atenção: Nível Crítico de Estoque
               <span className="ml-2 bg-rose-200 text-rose-800 text-xs px-2 py-0.5 rounded-full">
                 {stockAlerts.length} Itens
               </span>
             </h3>
             <p className="text-rose-700 text-sm mt-1 mb-2">
               Há itens essenciais operando abaixo do limite mínimo de segurança. É recomendada a reposição imediata.
             </p>
             <div className="flex flex-wrap gap-2">
               {stockAlerts.slice(0, 3).map(item => (
                 <span key={item.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
                   <PackageX className="w-3 h-3 mr-1.5" />
                   {item.name}: <strong className="ml-1">{item.quantity} {item.unit}</strong>
                 </span>
               ))}
               {stockAlerts.length > 3 && (
                 <span className="text-xs text-rose-600 font-medium self-center hover:underline cursor-pointer">
                   + {stockAlerts.length - 3} outros itens...
                 </span>
               )}
             </div>
           </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
        <p className="text-slate-500">Visão geral da unidade em {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Ocupação</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalResidents}/{capacity}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{occupancyRate}% da capacidade total</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Alta Complexidade</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{highCare}</h3>
            </div>
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <Activity className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Residentes Grau III</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Contas Pendentes</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingBills}</h3>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Faturas vencendo esta semana</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Eventos Hoje</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">3</h3>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Musicoterapia às 14h</p>
        </div>
      </div>

      {/* Recent Alerts & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Alertas e Notificações</h3>
            {stockAlerts.length > 0 && (
              <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-full font-medium flex items-center">
                <AlertTriangle size={12} className="mr-1" />
                {stockAlerts.length} Críticos
              </span>
            )}
          </div>
          <div className="p-0">
            {allAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mr-4 ${alert.type === 'critical' ? 'bg-red-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-400'}`}></div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800 font-medium">{alert.text}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{alert.time}</span>
              </div>
            ))}
            {allAlerts.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                Nenhum alerta recente.
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg text-white p-6 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary-400 rotate-6" /> Assistente IA
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              "Percebi um aumento de 15% nos custos com fraldas geriátricas este mês. Deseja analisar?"
            </p>
            <button 
              onClick={() => setIsAnalysisModalOpen(true)}
              className="bg-primary-500 hover:bg-primary-600 active:scale-95 text-white text-sm py-3 px-4 md:py-2 rounded-lg transition-all shadow-md min-h-[44px] font-medium"
            >
              Ver Análise Completa
            </button>
          </div>
          <Bot className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-10" />
        </div>
      </div>

      {/* AI Analysis Modal */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center relative shrink-0">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-base md:text-lg">Análise Avançada AI</h3>
                  <p className="text-xs text-slate-400">Recanto AI Insight #2409 • Custo de Insumos</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAnalysisModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-850 transition-colors text-slate-300 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 bg-slate-50">
              
              {/* Alert Warning */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex gap-4">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600 self-start">
                  <TrendingUp className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-sm md:text-base">Consumo Atípico Detectado</h4>
                  <p className="text-xs md:text-sm text-amber-900 mt-1 leading-relaxed">
                    O consumo deste insumo aumentou <strong className="font-bold">15,3%</strong> em relação ao mês anterior, gerando um custo operacional excedente de <strong className="font-bold">R$ 1.068,00</strong>.
                  </p>
                </div>
              </div>

              {/* KPI Metrics Breakdown */}
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-3xs md:text-xs text-slate-400 uppercase tracking-wider font-semibold">Mês Anterior</span>
                  <p className="text-sm md:text-lg font-extrabold text-slate-600 mt-0.5">195 pacotes</p>
                  <span className="text-3xs md:text-2xs text-slate-400 block mt-1 font-medium">Custo: R$ 6.942,00</span>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-rose-200 shadow-xs ring-2 ring-rose-500/5">
                  <span className="text-3xs md:text-xs text-rose-500 uppercase tracking-wider font-bold">Mês Atual</span>
                  <p className="text-sm md:text-lg font-extrabold text-rose-600 mt-0.5">225 pacotes</p>
                  <span className="text-3xs md:text-2xs text-rose-400 block mt-1 font-semibold">Custo: R$ 8.010,00</span>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-3xs md:text-xs text-slate-400 uppercase tracking-wider font-semibold">Custo Unitário</span>
                  <p className="text-sm md:text-lg font-extrabold text-slate-700 mt-0.5">R$ 35,60</p>
                  <span className="text-3xs md:text-2xs text-rose-500 block mt-1 font-medium">+3.5% inflação</span>
                </div>
              </div>

              {/* AI Diagnosis Area */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Bot className="h-4 w-4 text-primary-500" /> Diagnóstico da Inteligência Artificial
                </h4>
                <div className="space-y-3.5 text-xs md:text-sm text-slate-600 leading-relaxed">
                  <div className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                    <p>
                      <strong className="font-semibold text-slate-800">Novas Admissões Críticas (65% do aumento):</strong> Admissão recente de 2 novos residentes com grau de dependência III que necessitam de trocas intensificadas administradas pelas equipes (<span className="text-slate-700 italic font-medium">Maria da S.</span> e <span className="text-slate-700 italic font-medium">Roberto C.</span>).
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                    <p>
                      <strong className="font-semibold text-slate-800 font-medium">Desvio no Turno Noturno (22% do aumento):</strong> Desvio estatístico identificado no check-list diário: o turno da Noite efetua trocas por programação fixa cumulativa de horário, em vez da checagem assistida de umidade recomendada no protocolo clínico.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                    <p>
                      <strong className="font-semibold text-slate-800">Custo de Frete Fracionado:</strong> Compras de urgência no mercado comum local para cobrir falta de estoque de segurança, com taxa de entrega expressa inserida indiretamente no preço unitário final.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Interactive Simulator */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-md">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-emerald-400" /> Simulação de Otimização Inteligente
                  </h4>
                  <span className="text-3xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Interativo
                  </span>
                </div>

                {/* Bulk buy toggle */}
                <label className="flex items-start space-x-3 bg-slate-800/50 p-3 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={bulkBuyChecked}
                    onChange={(e) => setBulkBuyChecked(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 h-5 w-5 border-slate-700 bg-slate-900 cursor-pointer mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-xs md:text-sm text-slate-100 block">Comprar Caixa Master Direto em Volume</span>
                    <p className="text-3xs md:text-2xs text-slate-400 mt-0.5">Reduz o preço unitário de tabela de R$ 35,60 para R$ 29,20 via licitação interna da distribuidora</p>
                  </div>
                </label>

                {/* Range Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-slate-300 font-medium">Meta de Redução de Desperdício:</span>
                    <span className="text-emerald-400 font-extrabold text-base">{optimizationRate}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="35" 
                    value={optimizationRate} 
                    onChange={(e) => setOptimizationRate(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div className="flex justify-between text-3xs text-slate-500 font-medium">
                    <span>0% (Status Quo)</span>
                    <span>15% (Otimização Básica)</span>
                    <span>35% (Meta Máxima)</span>
                  </div>
                </div>

                {/* Simulation Output Area */}
                <div className="pt-4 border-t border-slate-800/85 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-3xs text-slate-400 block uppercase tracking-wider">Gasto Otimizado</span>
                    <p className="text-base md:text-xl font-extrabold text-slate-100 mt-0.5">R$ {optimizedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-3xs text-slate-400 font-medium mt-0.5">Fraldas salvas: {qtyReduction} pacotes ({optimizedQty} un.)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xs text-emerald-400 block uppercase tracking-wider font-extrabold">Economia Conquistada</span>
                    <p className="text-base md:text-xl font-extrabold text-emerald-400 mt-0.5">+ R$ {savingsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-3xs text-emerald-300 font-semibold mt-0.5 animate-pulse">Retorno anual projetado: R$ {(savingsValue * 12).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/ano</p>
                  </div>
                </div>
              </div>

              {/* Execution Actions Plan triggers */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Planos de Ação Automatizados</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Action 1 */}
                  <button 
                    onClick={handleAdjustStock}
                    disabled={stockAdjusted || adjustingStock}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left border transition-all select-none min-h-[56px] focus:outline-none ${
                      stockAdjusted 
                      ? 'bg-emerald-55/40 border-emerald-250 text-emerald-900 shadow-sm' 
                      : 'bg-white hover:bg-slate-100 border-slate-200 hover:border-slate-350 active:scale-98'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg shrink-0 ${stockAdjusted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {stockAdjusted ? <Check className="h-5 w-5 stroke-[3]" /> : <PackageCheck className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs block truncate">Ajustar Alerta de Estoque G</span>
                      <span className="text-2xs text-slate-500 mt-0.5 block line-clamp-1">
                        {adjustingStock ? 'Salvando configuração...' : stockAdjusted ? 'Ajustado para 60 unidades limit!' : 'Alterar gatilho crítico para 60 un.'}
                      </span>
                    </div>
                  </button>

                  {/* Action 2 */}
                  <button 
                    onClick={handleRequestQuote}
                    disabled={quoteRequested || requestingQuote}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left border transition-all select-none min-h-[56px] focus:outline-none ${
                      quoteRequested 
                      ? 'bg-emerald-55/40 border-emerald-250 text-emerald-900 shadow-sm' 
                      : 'bg-white hover:bg-slate-100 border-slate-200 hover:border-slate-350 active:scale-98'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg shrink-0 ${quoteRequested ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {quoteRequested ? <Check className="h-5 w-5 stroke-[3]" /> : <Mail className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs block truncate">Disparar Cotação Automatizada</span>
                      <span className="text-2xs text-slate-500 mt-0.5 block line-clamp-1">
                        {requestingQuote ? 'Contatando distribuidores...' : quoteRequested ? 'E-mails enviados de cotação lote!' : 'Enviar e-mail para 3 fornecedores líderes'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

            </div>

            {/* Footer buttons sticky */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10 shrink-0">
              <button 
                onClick={() => setIsAnalysisModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 active:scale-95 text-slate-600 font-bold text-xs md:text-sm transition-all h-11 flex items-center justify-center min-w-[110px]"
              >
                Fechar Painel
              </button>
              
              <button 
                onClick={handleExportPdf}
                disabled={pdfExported}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg active:scale-95 text-white font-bold text-xs md:text-sm transition-all h-11 flex justify-center items-center gap-1.5 ${
                  pdfExported
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {pdfExported ? (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" /> Relatório Exportado para o Prontuário
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4" /> Exportar Análise Completa (.PDF)
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;