import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import type { FeatureContent } from '../types';
import { getAccent } from '../accents';
import { go, ROUTES } from '../../../utils/navigation';

const FeatureHero: React.FC<{ content: FeatureContent }> = ({ content }) => {
  const accent = getAccent(content.accent);
  const Icon = content.icon;
  return (
    <section className="bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] text-white pt-16 pb-24 px-4">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <Icon className="h-4 w-4 text-amber-300" />
            <span className="text-sm text-blue-100 font-medium">{content.eyebrow}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-5">{content.title}</h1>
          <p className="text-lg text-blue-100 leading-relaxed mb-7 max-w-xl">{content.subtitle}</p>
          <ul className="space-y-2.5 mb-8">
            {content.heroBullets.map(b => (
              <li key={b} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-slate-900" />
                </span>
                <span className="text-blue-50 text-sm">{b}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => go(ROUTES.subscribe)}
              className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Quero Assinar <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <a
              href={ROUTES.pricing}
              className="inline-flex items-center justify-center border-2 border-white/40 hover:border-white text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:bg-white/10"
            >
              Ver Planos
            </a>
            <button
              onClick={() => go(ROUTES.demo)}
              className="inline-flex items-center justify-center text-blue-100 hover:text-white font-semibold px-3 py-3.5 transition-all"
            >
              Testar Demonstração
            </button>
          </div>
        </div>

        {/* Visual ilustrativo do módulo */}
        <div className="relative hidden lg:block">
          <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                <Icon className={`h-6 w-6 ${accent.text}`} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{content.eyebrow}</p>
                <p className="text-xs text-blue-200">RecantoCare</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {content.benefits.slice(0, 3).map(bft => (
                <div key={bft.title} className="bg-white/10 rounded-xl px-3 py-2.5 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <bft.icon className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="text-xs text-blue-50">{bft.title}</span>
                </div>
              ))}
            </div>
            {content.savings[0] && (
              <div className="mt-4 bg-amber-400 text-slate-900 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold">{content.savings[0].value}</p>
                <p className="text-xs font-medium">{content.savings[0].label}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureHero;
