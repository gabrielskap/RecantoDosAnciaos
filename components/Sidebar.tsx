import React from 'react';
import { LayoutDashboard, Users, HeartPulse, Wallet, Package, LogOut, UserCog, Utensils, PieChart, CalendarDays, X, UserCircle, BedDouble, ChevronRight, Settings, MessageSquare, Thermometer } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  stockAlertCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, setIsOpen, stockAlertCount = 0 }) => {
  const { currentUser, hasPermission, logout } = useAuth();

  const navItems = [
    { id: ViewState.DASHBOARD,       label: 'Painel Geral',             icon: LayoutDashboard },
    { id: ViewState.RESIDENTS,       label: 'Residentes & Prontuário',   icon: Users },
    { id: ViewState.ROOMS,           label: 'Gerenciamento de Quartos',  icon: BedDouble },
    { id: ViewState.AGENDA,          label: 'Agenda & Atividades',       icon: CalendarDays },
    { id: ViewState.NUTRITION,       label: 'Alimentação & Nutrição',    icon: Utensils },
    { id: ViewState.FRIGOBAR,        label: 'Controle de Frigobar',      icon: Thermometer },
    { id: ViewState.TEAM,            label: 'Equipe e Acessos',          icon: UserCog },
    { id: ViewState.FINANCE,         label: 'Financeiro & Contratos',    icon: Wallet },
    { id: ViewState.STOCK,           label: 'Estoque & Insumos',         icon: Package },
    { id: ViewState.REPORTS,         label: 'Relatórios & Indicadores',  icon: PieChart },
    { id: ViewState.NOTIFICATIONS,   label: 'Notificações',              icon: MessageSquare },
    { id: ViewState.SETTINGS,        label: 'Configurações',             icon: Settings },
  ].filter(item => hasPermission(item.id, 'view'));

  const isActive = (id: ViewState) =>
    currentView === id || (currentView === ViewState.RESIDENT_DETAIL && id === ViewState.RESIDENTS);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-blue-50 border-r border-blue-100 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-blue-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-slate-900 font-bold text-sm leading-tight block">RecantoCare</span>
              <span className="text-slate-500 text-[10px]">Gestão de ILPIs</span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-slate-400 hover:text-slate-600 transition-all"
            aria-label="Fechar Menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  setIsOpen(false);
                }}
                className={`group flex items-center w-full px-3 py-2.5 text-sm rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-blue-100 hover:text-slate-900'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0 transition-colors ${
                  active ? 'bg-white/20' : 'bg-white group-hover:bg-blue-50'
                }`}>
                  <item.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                </div>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.id === ViewState.STOCK && stockAlertCount > 0 && (
                  <span className="ml-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                    {stockAlertCount}
                  </span>
                )}
                {active && <ChevronRight className="h-3.5 w-3.5 text-white/70 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-blue-100 pt-3 shrink-0 space-y-2">
          {currentUser && (
            <div 
              onClick={() => {
                onChangeView(ViewState.PROFILE);
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 bg-white hover:bg-blue-100/50 cursor-pointer rounded-xl px-3 py-2.5 shadow-sm transition-all duration-200 select-none mb-1"
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-xl object-cover shrink-0 border border-blue-200" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <UserCircle className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.profile.name}</p>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-900 hover:bg-blue-100 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-white group-hover:bg-blue-50 flex items-center justify-center mr-3 transition-colors shadow-sm">
              <LogOut className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            </div>
            Sair do Sistema
          </button>
          <div className="mt-3 mx-1 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">v2.4.0</span>
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Assinatura Ativa
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
