import React, { useState } from 'react';
import { Menu, Bell, ChevronDown, UserCircle, LogOut, Building2 } from 'lucide-react';
import type { DemoScreen } from './types';
import type { DemoNotification } from '../../data/demoData';
import { DEMO_ADMIN } from '../../data/demoData';
import { Avatar } from './components/ui';
import { NOTIF_META } from './components/notificationMeta';

interface DemoTopbarProps {
  notifications: DemoNotification[];
  unread: number;
  onOpenSidebar: () => void;
  onNavigate: (s: DemoScreen) => void;
  onLogout: () => void;
}

const DemoTopbar: React.FC<DemoTopbarProps> = ({ notifications, unread, onOpenSidebar, onNavigate, onLogout }) => {
  const [openMenu, setOpenMenu] = useState<'none' | 'notif' | 'profile'>('none');
  const close = () => setOpenMenu('none');

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 px-4 lg:px-6 flex items-center justify-between">
      {/* Esquerda */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{DEMO_ADMIN.institution}</p>
            <p className="text-[11px] text-slate-400 truncate">Painel administrativo</p>
          </div>
        </div>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-1.5">
        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'notif' ? 'none' : 'notif')}
            className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {openMenu === 'notif' && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm">Notificações</span>
                <span className="text-xs text-slate-400">{unread} não lidas</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.slice(0, 4).map(n => {
                  const meta = NOTIF_META[n.type];
                  const Icon = meta.icon;
                  return (
                    <div key={n.id} className={`px-4 py-3 flex gap-3 ${n.read ? '' : 'bg-blue-50/40'}`}>
                      <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-slate-500" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 leading-snug">{n.text}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => { close(); onNavigate('notifications'); }}
                className="w-full text-center text-sm font-semibold text-blue-600 hover:bg-slate-50 py-3 transition-colors"
              >
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>

        {/* Perfil */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'profile' ? 'none' : 'profile')}
            className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Avatar initials={DEMO_ADMIN.initials} color={DEMO_ADMIN.color} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{DEMO_ADMIN.name}</p>
              <p className="text-[11px] text-slate-400">{DEMO_ADMIN.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {openMenu === 'profile' && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{DEMO_ADMIN.name}</p>
                <p className="text-xs text-slate-400 truncate">{DEMO_ADMIN.email}</p>
              </div>
              <button
                onClick={() => { close(); onNavigate('profile'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <UserCircle className="h-4 w-4 text-slate-400" /> Meu perfil
              </button>
              <button
                onClick={() => { close(); onLogout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sair da demonstração
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop para fechar dropdowns ao clicar fora */}
      {openMenu !== 'none' && <div className="fixed inset-0 z-10" onClick={close} />}
    </header>
  );
};

export default DemoTopbar;
