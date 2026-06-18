import React, { useState } from 'react';
import { HeartPulse, Menu, X } from 'lucide-react';
import { go, ROUTES } from '../../utils/navigation';

const MarketingNav: React.FC<{ breadcrumb?: string }> = ({ breadcrumb }) => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="bg-[#1e40af] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => go(ROUTES.home)} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">RecantoCare</span>
            {breadcrumb && <span className="hidden sm:inline text-blue-200 text-sm font-medium">/ {breadcrumb}</span>}
          </button>

          {/* Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <button onClick={() => go(ROUTES.features)} className="text-blue-100 hover:text-white text-sm font-medium transition-colors">Recursos</button>
            <a href={ROUTES.pricing} className="text-blue-100 hover:text-white text-sm font-medium transition-colors">Preços</a>
            <button onClick={() => go(ROUTES.login)} className="text-white border border-white/40 hover:border-white hover:bg-white/10 text-sm font-medium px-4 py-2 rounded-lg transition-all">Entrar</button>
            <button onClick={() => go(ROUTES.subscribe)} className="text-white border border-white/40 hover:border-white hover:bg-white/10 text-sm font-medium px-4 py-2 rounded-lg transition-all">Quero Assinar</button>
            <button onClick={() => go(ROUTES.demo)} className="bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow">Testar Demo</button>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)} aria-label="Abrir menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-blue-900 border-t border-blue-700 px-4 py-4 space-y-3">
          <button onClick={() => go(ROUTES.features)} className="block w-full text-left text-blue-100 text-sm font-medium py-2">Recursos</button>
          <a href={ROUTES.pricing} className="block text-blue-100 text-sm font-medium py-2">Preços</a>
          <button onClick={() => go(ROUTES.login)} className="block w-full text-left text-blue-100 text-sm font-medium py-2">Entrar</button>
          <button onClick={() => go(ROUTES.subscribe)} className="w-full bg-white text-blue-700 font-semibold py-3 rounded-lg text-sm border border-blue-200">Quero Assinar</button>
          <button onClick={() => go(ROUTES.demo)} className="w-full bg-amber-400 text-slate-900 font-semibold py-3 rounded-lg text-sm">Testar Demonstração</button>
        </div>
      )}
    </nav>
  );
};

export default MarketingNav;
