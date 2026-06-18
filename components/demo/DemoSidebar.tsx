import React from 'react';
import {
  LayoutDashboard, Users, UserCog, Wallet, PieChart, Bell, Settings,
  HeartPulse, X, ChevronRight, LogOut, type LucideIcon,
} from 'lucide-react';
import type { DemoScreen } from './types';

interface Item { id: DemoScreen; label: string; icon: LucideIcon; }

const ITEMS: Item[] = [
  { id: 'dashboard',     label: 'Painel Geral',           icon: LayoutDashboard },
  { id: 'residents',     label: 'Residentes',             icon: Users },
  { id: 'users',         label: 'Usuários & Acessos',     icon: UserCog },
  { id: 'finance',       label: 'Financeiro & Assinatura', icon: Wallet },
  { id: 'reports',       label: 'Relatórios',             icon: PieChart },
  { id: 'notifications', label: 'Notificações',           icon: Bell },
  { id: 'settings',      label: 'Configurações',          icon: Settings },
];

interface DemoSidebarProps {
  current: DemoScreen;
  onChange: (s: DemoScreen) => void;
  isOpen: boolean;
  setOpen: (b: boolean) => void;
  unread: number;
  onLogout: () => void;
}

const DemoSidebar: React.FC<DemoSidebarProps> = ({ current, onChange, isOpen, setOpen, unread, onLogout }) => (
  <>
    {isOpen && (
      <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
    )}

    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-blue-50 border-r border-blue-100 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-blue-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <HeartPulse className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-slate-900 font-bold text-sm leading-tight block">RecantoCare</span>
            <span className="text-amber-600 text-[10px] font-semibold">Modo Demonstração</span>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-slate-400 hover:text-slate-600 transition-all"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {ITEMS.map(item => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onChange(item.id); setOpen(false); }}
              className={`group flex items-center w-full px-3 py-2.5 text-sm rounded-xl transition-all duration-150 ${
                active ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-blue-100 hover:text-slate-900'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0 transition-colors ${active ? 'bg-white/20' : 'bg-white group-hover:bg-blue-50'}`}>
                <item.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
              </div>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.id === 'notifications' && unread > 0 && (
                <span className="ml-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{unread}</span>
              )}
              {active && <ChevronRight className="h-3.5 w-3.5 text-white/70 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-blue-100 pt-3 shrink-0">
        <button
          onClick={onLogout}
          className="flex items-center w-full px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-900 hover:bg-blue-100 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-white group-hover:bg-blue-50 flex items-center justify-center mr-3 transition-colors shadow-sm">
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </div>
          Sair da demonstração
        </button>
        <div className="mt-3 mx-1 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">v2.4.0</span>
          <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
            Demonstração
          </span>
        </div>
      </div>
    </div>
  </>
);

export default DemoSidebar;
