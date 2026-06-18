import React from 'react';
import { X, Check } from 'lucide-react';
import type { FeatureContent } from '../types';

const ComparisonTable: React.FC<{ rows: FeatureContent['comparison'] }> = ({ rows }) => (
  <section className="bg-slate-50 py-16 md:py-20 px-4">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Gestão manual × com o RecantoCare</h2>
        <p className="text-slate-500">Veja a diferença lado a lado.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Manual */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-5 py-3.5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
              <X className="h-3.5 w-3.5 text-rose-600" />
            </span>
            <span className="font-semibold text-slate-700 text-sm">Gestão manual</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {rows.map(r => (
              <li key={r.manual} className="px-5 py-3.5 text-sm text-slate-500 flex gap-2">
                <X className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{r.manual}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Com o sistema */}
        <div className="bg-white rounded-2xl border-2 border-blue-600 overflow-hidden shadow-lg">
          <div className="bg-blue-600 px-5 py-3.5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="font-semibold text-white text-sm">Com o RecantoCare</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {rows.map(r => (
              <li key={r.sistema} className="px-5 py-3.5 text-sm text-slate-700 flex gap-2">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{r.sistema}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default ComparisonTable;
