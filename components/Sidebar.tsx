import React from 'react';
import { LayoutDashboard, Users, HeartPulse, Wallet, Package, Bot, LogOut, Menu, UserCog, Utensils, PieChart, CalendarDays, X } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  stockAlertCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, setIsOpen, stockAlertCount = 0 }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Painel Geral', icon: LayoutDashboard },
    { id: ViewState.RESIDENTS, label: 'Residentes & Prontuário', icon: Users },
    { id: ViewState.AGENDA, label: 'Agenda & Atividades', icon: CalendarDays },
    { id: ViewState.NUTRITION, label: 'Alimentação & Nutrição', icon: Utensils },
    { id: ViewState.TEAM, label: 'Gestão de Equipe', icon: UserCog },
    { id: ViewState.FINANCE, label: 'Financeiro & Contratos', icon: Wallet },
    { id: ViewState.STOCK, label: 'Estoque & Insumos', icon: Package },
    { id: ViewState.REPORTS, label: 'Relatórios & Indicadores', icon: PieChart },
    { id: ViewState.AI_ASSISTANT, label: 'Assistente IA', icon: Bot },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-800">
          <div className="flex items-center space-x-2">
            <HeartPulse className="h-8 w-8 text-primary-500" />
            <span className="text-lg font-bold tracking-tight">Recanto dos Anciãos</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white lg:hidden text-slate-400 transition-all active:scale-95 text-center"
            aria-label="Close Menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onChangeView(item.id);
                setIsOpen(false);
              }}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                currentView === item.id || (currentView === ViewState.RESIDENT_DETAIL && item.id === ViewState.RESIDENTS)
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === ViewState.STOCK && stockAlertCount > 0 && (
                <span className="ml-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {stockAlertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            <LogOut className="h-5 w-5 mr-3" />
            Sair do Sistema
          </button>
          <div className="mt-4 text-xs text-slate-500 text-center">
            v2.4.0 &bull; Assinatura Digital Ativa
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;