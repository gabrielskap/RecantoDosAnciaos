import React from 'react';
import { X, Bell, Trash2, AlertTriangle, Info, Package, Pill, CheckCircle2 } from 'lucide-react';

export interface AlertItem {
  id: string;
  text: string;
  time: string;
  type: 'critical' | 'warning' | 'info' | 'medication';
}

interface NotificationsPanelProps {
  alerts: AlertItem[];
  onClose: () => void;
  onClearAll: () => void;
}

const typeConfig = {
  critical: {
    dot: 'bg-rose-500',
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50',
    label: 'Crítico',
    labelColor: 'text-rose-600 bg-rose-50',
  },
  warning: {
    dot: 'bg-amber-500',
    icon: Package,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    label: 'Estoque',
    labelColor: 'text-amber-600 bg-amber-50',
  },
  medication: {
    dot: 'bg-violet-500',
    icon: Pill,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-50',
    label: 'Medicação',
    labelColor: 'text-violet-600 bg-violet-50',
  },
  info: {
    dot: 'bg-blue-400',
    icon: Info,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    label: 'Info',
    labelColor: 'text-blue-600 bg-blue-50',
  },
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ alerts, onClose, onClearAll }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Bell className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Alertas e Notificações</h2>
              <p className="text-xs text-slate-400">
                {alerts.length === 0 ? 'Nenhuma notificação' : `${alerts.length} notificação${alerts.length > 1 ? 'ões' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button
                onClick={onClearAll}
                title="Limpar todos os alertas"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">Tudo em ordem!</p>
              <p className="text-xs text-slate-400 mt-1 text-center">Nenhum alerta ou notificação pendente no momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {alerts.map(alert => {
                const cfg = typeConfig[alert.type] || typeConfig.info;
                const Icon = cfg.icon;
                return (
                  <div key={alert.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-medium leading-snug">{alert.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.labelColor}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-400">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer clear button */}
        {alerts.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0">
            <button
              onClick={onClearAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Limpar todos os alertas
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPanel;
