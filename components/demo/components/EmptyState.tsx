import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, text, action }) => (
  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
      <Icon className="h-7 w-7 text-slate-400" />
    </div>
    <p className="font-semibold text-slate-700">{title}</p>
    {text && <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{text}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
