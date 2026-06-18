import React from 'react';

/** Cabeçalho de página padrão das telas demo. */
export const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/** Contêiner de cartão/seção branco com cabeçalho opcional. */
export const SectionCard: React.FC<{ title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, action, className = '', children }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        {title && <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </div>
);

export const Avatar: React.FC<{ initials: string; color: string; size?: 'sm' | 'md' | 'lg'; src?: string }> = ({ initials, color, size = 'md', src }) => {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  if (src) {
    return (
      <img
        src={src}
        alt="Avatar"
        className={`${dim} rounded-full object-cover flex-shrink-0 border border-slate-100 shadow-sm`}
      />
    );
  }
  return (
    <div className={`${color} ${dim} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
};

export type Tone = 'green' | 'amber' | 'rose' | 'blue' | 'slate' | 'violet';

const toneMap: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  blue: 'bg-blue-100 text-blue-700',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-100 text-violet-700',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${toneMap[tone]}`}>
    {children}
  </span>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }> = ({ checked, onChange, label, desc }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {desc && <p className="text-xs text-slate-400">{desc}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);
