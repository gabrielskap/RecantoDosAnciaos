import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, HeartPulse, Wallet, Package, LogOut, UserCog, Utensils, PieChart, CalendarDays, X, UserCircle, BedDouble, ChevronRight, Settings, MessageSquare, Thermometer, ChevronsUpDown, ClipboardPenLine, FileHeart } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  stockAlertCount?: number;
  hideGeneralEvolution?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, setIsOpen, stockAlertCount = 0, hideGeneralEvolution = false }) => {
  const { currentUser, hasPermission, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: ViewState.DASHBOARD,       label: 'Painel Geral',             icon: LayoutDashboard },
    { id: ViewState.RESIDENTS,       label: 'Residentes & Prontuário',   icon: Users },
    ...(!hideGeneralEvolution ? [{ id: ViewState.GENERAL_EVOLUTION, label: 'Evolução Geral', icon: ClipboardPenLine }] : []),
    ...(!hideGeneralEvolution ? [{ id: ViewState.GENERAL_CARE_PLAN, label: 'Plano Evolutivo Geral', icon: FileHeart }] : []),
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
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 h-full bg-white border-r border-slate-200/80 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-200 shrink-0">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-slate-900 font-bold text-sm leading-tight block truncate">RecantoCare</span>
              <span className="text-slate-400 text-[10px] leading-tight block">Gestão de ILPIs</span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fechar Menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                title={item.label}
                onClick={() => {
                  onChangeView(item.id);
                  setIsOpen(false);
                }}
                className={`group relative flex items-center w-full gap-3 px-2.5 py-2 text-sm rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-blue-600" />}
                <item.icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis text-[13px] leading-5">
                  {item.label}
                </span>
                {item.id === ViewState.STOCK && stockAlertCount > 0 && (
                  <span className="ml-1 min-w-5 h-5 inline-flex items-center justify-center bg-rose-50 text-rose-600 text-[10px] font-bold px-1.5 rounded-full shrink-0">
                    {stockAlertCount}
                  </span>
                )}
                {active && <ChevronRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-3 border-t border-slate-100 pt-2.5 shrink-0 relative" ref={menuRef}>
          {currentUser && (
            <div className="relative">
              {/* Menu Dropdown sobreposto ao card do usuário */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl shadow-slate-200/70 border border-slate-200 p-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    onClick={() => {
                      onChangeView(ViewState.PROFILE);
                      setUserMenuOpen(false);
                      setIsOpen(false);
                    }}
                    className="flex items-center w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors group"
                  >
                    <UserCircle className="h-4 w-4 text-blue-600 mr-2.5 shrink-0" />
                    <span>Meus Dados</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                      setIsOpen(false);
                    }}
                    className="flex items-center w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors group"
                  >
                    <LogOut className="h-4 w-4 text-rose-600 mr-2.5 shrink-0" />
                    <span>Sair do Sistema</span>
                  </button>
                </div>
              )}

              {/* Botão Card do Usuário */}
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`w-full flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 border transition-colors duration-150 select-none text-left ${
                  userMenuOpen ? 'bg-blue-50 border-blue-200' : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100'
                }`}
              >
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-200" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <UserCircle className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">{currentUser.name}</p>
                  <p className="text-[10.5px] text-slate-400 truncate">{currentUser.profile.name}</p>
                </div>
                <ChevronsUpDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>
            </div>
          )}

          <div className="mt-2 px-1 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-medium">v2.4.0</span>
            <span className="text-[9px] text-slate-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Ativa
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
