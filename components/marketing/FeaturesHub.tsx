import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import CtaBand from './CtaBand';
import { FEATURE_LIST } from '../../content/featuresContent';
import { getAccent } from './accents';
import { go, ROUTES } from '../../utils/navigation';

/** Hub /recursos — índice de todos os módulos com "Saiba mais" por cartão. */
const FeaturesHub: React.FC = () => {
  useEffect(() => {
    document.title = 'Recursos | RecantoCare';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <MarketingNav breadcrumb="Recursos" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] text-white pt-16 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">Conheça cada módulo do RecantoCare</h1>
          <p className="text-lg text-blue-100 mb-8">
            Uma plataforma completa para a gestão da sua ILPI. Explore o que cada módulo resolve —
            do prontuário e controle de medicação aos relatórios exigidos pela vigilância sanitária (RDC 283/2005).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => go(ROUTES.subscribe)} className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-7 py-3.5 rounded-xl shadow-lg transition-all">
              Quero Assinar
            </button>
            <button onClick={() => go(ROUTES.demo)} className="border-2 border-white/40 hover:border-white text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:bg-white/10">
              Testar Demonstração
            </button>
          </div>
        </div>
      </section>

      {/* Cards de módulos */}
      <section className="bg-slate-50 py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURE_LIST.map(f => {
            const a = getAccent(f.accent);
            const Icon = f.icon;
            return (
              <button
                key={f.slug}
                onClick={() => go(ROUTES.feature(f.slug))}
                className="text-left bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${a.chip} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.eyebrow}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-3">{f.subtitle}</p>
                <span className={`inline-flex items-center text-sm font-semibold ${a.text}`}>
                  Saiba mais <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <CtaBand />
      <MarketingFooter />
    </div>
  );
};

export default FeaturesHub;
