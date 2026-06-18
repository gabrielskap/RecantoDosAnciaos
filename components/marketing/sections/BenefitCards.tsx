import React from 'react';
import type { FeatureContent } from '../types';
import { getAccent, type AccentKey } from '../accents';

const BenefitCards: React.FC<{ benefits: FeatureContent['benefits']; accent: AccentKey }> = ({ benefits, accent }) => {
  const a = getAccent(accent);
  return (
    <section className="bg-white py-16 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Benefícios na prática</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">O que muda no dia a dia da sua equipe e da sua gestão.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map(b => (
            <div key={b.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className={`w-11 h-11 rounded-xl ${a.chip} flex items-center justify-center mb-4`}>
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{b.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitCards;
