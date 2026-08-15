import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Users, UserCog, Wallet, PieChart, Bell, Settings,
  HeartPulse, X, ChevronRight, LogOut, UserCircle, ChevronsUpDown, type LucideIcon,
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

const DemoSidebar: React.FC<DemoSidebarProps> = ({ current, onChange, isOpen, setOpen, unread, onLogout }) => {
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

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-blue-50 border-r border-blue-100 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {ITEMS.map(item => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                title={item.label}
                onClick={() => { onChange(item.id); setOpen(false); }}
                className={`group flex items-center w-full px-3 py-2.5 text-sm rounded-xl transition-all duration-150 ${
                  active ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-blue-100 hover:text-slate-900'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 shrink-0 transition-colors ${active ? 'bg-white/20' : 'bg-white group-hover:bg-blue-50'}`}>
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                </div>
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis text-[13.5px] font-medium leading-none">{item.label}</span>
                {item.id === 'notifications' && unread > 0 && (
                  <span className="ml-1.5 bg-rose-500 text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shadow-sm shrink-0">{unread}</span>
                )}
                {active && <ChevronRight className="h-3.5 w-3.5 text-white/70 shrink-0 ml-1" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-blue-100 pt-3 shrink-0 relative" ref={menuRef}>
          <div className="relative">
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-blue-100 p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => {
                    onLogout();
                    setUserMenuOpen(false);
                    setOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center mr-2.5 shrink-0 transition-colors">
                    <LogOut className="h-4 w-4 text-rose-600" />
                  </div>
                  <span>Sair da demonstração</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`w-full flex items-center gap-2.5 bg-white hover:bg-blue-100/60 cursor-pointer rounded-xl px-3 py-2.5 shadow-xs border transition-all duration-200 select-none text-left ${
                userMenuOpen ? 'border-blue-300 ring-2 ring-blue-500/20' : 'border-blue-100/70 hover:border-blue-200'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <UserCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">Usuário Demo</p>
                <p className="text-[10.5px] text-amber-600 font-semibold truncate">Modo de Testes</p>
              </div>
              <ChevronsUpDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </button>
          </div>

          <div className="mt-3 mx-1 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">v2.4.0</span>
            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              Demonstração
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoSidebar;
