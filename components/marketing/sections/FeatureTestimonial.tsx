import React from 'react';
import { Star } from 'lucide-react';
import type { FeatureTestimonialData } from '../types';

const FeatureTestimonial: React.FC<{ t: FeatureTestimonialData }> = ({ t }) => (
  <section className="bg-white py-16 md:py-20 px-4">
    <div className="max-w-3xl mx-auto text-center">
      <div className="flex justify-center mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-xl text-slate-700 leading-relaxed font-medium mb-6">“{t.text}”</p>
      <div className="flex items-center justify-center gap-3">
        <div className={`w-11 h-11 ${t.color} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {t.avatar}
        </div>
        <div className="text-left">
          <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
          <p className="text-xs text-slate-400">{t.role} · {t.institution}</p>
        </div>
      </div>
    </div>
  </section>
);

export default FeatureTestimonial;
