import React from 'react';
import type { FeatureContent } from '../types';

const SavingsBand: React.FC<{ savings: FeatureContent['savings'] }> = ({ savings }) => (
  <section className="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] py-14 px-4">
    <div className="max-w-5xl mx-auto">
      <p className="text-center text-blue-200 text-sm font-semibold uppercase tracking-wider mb-8">
        Economia de tempo, custo e esforço
      </p>
      <div className={`grid gap-6 ${savings.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {savings.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-4xl lg:text-5xl font-extrabold text-amber-300">{s.value}</p>
            <p className="text-sm text-blue-100 mt-2">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SavingsBand;
