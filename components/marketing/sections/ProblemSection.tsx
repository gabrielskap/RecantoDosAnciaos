import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FeatureContent } from '../types';

const ProblemSection: React.FC<{ problem: FeatureContent['problem'] }> = ({ problem }) => (
  <section className="bg-white py-16 md:py-20 px-4">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 rounded-full px-4 py-1.5 mb-4 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" /> O problema
        </div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{problem.title}</h2>
        {problem.intro && <p className="text-slate-500 mt-3 max-w-2xl mx-auto">{problem.intro}</p>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {problem.pains.map(p => (
          <div key={p.text} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-3">
              <p.icon className="h-5 w-5 text-rose-600" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{p.text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProblemSection;
