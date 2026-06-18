import React from 'react';
import { Sparkles } from 'lucide-react';
import type { FeatureContent } from '../types';
import { getAccent, type AccentKey } from '../accents';

const SolutionSection: React.FC<{ solution: FeatureContent['solution']; accent: AccentKey }> = ({ solution, accent }) => {
  const a = getAccent(accent);
  return (
    <section className="bg-slate-50 py-16 md:py-20 px-4">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className={`inline-flex items-center gap-2 ${a.soft} ${a.text} rounded-full px-4 py-1.5 mb-4 text-sm font-medium`}>
            <Sparkles className="h-4 w-4" /> A solução
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">{solution.title}</h2>
          <p className="text-lg text-slate-600 leading-relaxed">{solution.description}</p>
        </div>
        <div className="space-y-3">
          {solution.highlights.map(h => (
            <div key={h.title} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex gap-4">
              <div className={`w-11 h-11 rounded-xl ${a.chip} flex items-center justify-center flex-shrink-0`}>
                <h.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm mb-1">{h.title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{h.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
