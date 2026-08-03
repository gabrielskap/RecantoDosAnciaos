import React from 'react';
import { ArrowRight } from 'lucide-react';
import { go, ROUTES } from '../../utils/navigation';

interface CtaBandProps {
  title?: string;
  subtitle?: string;
}

const CtaBand: React.FC<CtaBandProps> = ({
  title = 'Pronto para transformar sua ILPI?',
  subtitle = 'Prontuário, controle de medicação, relatórios para a vigilância sanitária e toda a gestão da sua instituição — comece hoje, sem instalação.',
}) => (
  <section className="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] py-20 px-4">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-4">{title}</h2>
      <p className="text-xl text-blue-200 mb-8">{subtitle}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => go(ROUTES.subscribe)}
          className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition-all"
        >
          Quero Assinar <ArrowRight className="ml-2 h-5 w-5" />
        </button>
        <button
          onClick={() => go(ROUTES.demo)}
          className="inline-flex items-center justify-center border-2 border-white/40 hover:border-white text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all hover:bg-white/10"
        >
          Testar Demonstração
        </button>
      </div>
      <p className="text-blue-300 text-sm mt-6">Ativação imediata · Cancele quando quiser · Suporte humano</p>
    </div>
  </section>
);

export default CtaBand;
