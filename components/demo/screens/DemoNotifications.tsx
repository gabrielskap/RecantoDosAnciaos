import React, { useState } from 'react';
import { CheckCheck, BellOff } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { NOTIF_META } from '../components/notificationMeta';
import type { DemoNotification } from '../../../data/demoData';

interface DemoNotificationsProps {
  notifications: DemoNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

const DemoNotifications: React.FC<DemoNotificationsProps> = ({ notifications, onMarkAllRead, onMarkRead }) => {
  const [tab, setTab] = useState<'todas' | 'nao_lidas'>('todas');
  const unread = notifications.filter(n => !n.read);
  const list = tab === 'todas' ? notifications : unread;

  return (
    <div>
      <PageHeader
        title="Notificações"
        subtitle={`${unread.length} não lidas`}
        action={
          <button
            onClick={onMarkAllRead}
            disabled={unread.length === 0}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40 px-3 py-2 rounded-lg transition-all"
          >
            <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
          </button>
        }
      />

      {/* Tabs */}
      <div className="inline-flex bg-slate-100 rounded-xl p-1 mb-4">
        {([['todas', 'Todas'], ['nao_lidas', 'Não lidas']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}{key === 'nao_lidas' && unread.length > 0 ? ` (${unread.length})` : ''}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={BellOff} title="Tudo em dia!" text="Você não tem notificações não lidas no momento." />
      ) : (
        <SectionCard>
          <ul className="divide-y divide-slate-50">
            {list.map(n => {
              const meta = NOTIF_META[n.type];
              const Icon = meta.icon;
              return (
                <li key={n.id} className={`px-5 py-4 flex gap-3 ${n.read ? '' : 'bg-blue-50/40'}`}>
                  <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-slate-500" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-500">{n.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                  </div>
                  {!n.read && (
                    <button onClick={() => onMarkRead(n.id)} className="text-xs font-medium text-blue-600 hover:underline self-center flex-shrink-0">
                      Marcar lida
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  );
};

export default DemoNotifications;
