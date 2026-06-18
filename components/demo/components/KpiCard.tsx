import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  /** Classe literal do chip do ícone, ex.: 'bg-blue-50 text-blue-600'. */
  iconClass?: string;
  trend?: { dir: 'up' | 'down'; text: string };
}

const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, sub, iconClass = 'bg-blue-50 text-blue-600', trend }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      {trend && (
        <span className={`text-xs font-semibold ${trend.dir === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend.text}
        </span>
      )}
    </div>
    <p className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</p>
    <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export default KpiCard;
