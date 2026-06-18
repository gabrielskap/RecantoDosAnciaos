import React from 'react';

export const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-200/70 rounded animate-pulse ${className}`} />
);

/** Estado de carregamento genérico exibido ao trocar de tela. */
const ScreenSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Bar className="h-7 w-56" />
      <Bar className="h-4 w-80" />
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
          <Bar className="h-10 w-10 rounded-xl mb-3" />
          <Bar className="h-6 w-20 mb-2" />
          <Bar className="h-3 w-24" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
      <Bar className="h-4 w-40" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Bar key={i} className="h-10 w-full" />
      ))}
    </div>
  </div>
);

export default ScreenSkeleton;
