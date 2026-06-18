import React from 'react';
import { HeartPulse, Shield } from 'lucide-react';
import { go, ROUTES } from '../../utils/navigation';

const MarketingFooter: React.FC = () => (
  <footer className="bg-slate-900 text-slate-400 py-12 px-4">
    <div className="max-w-7xl mx-auto">
      <div className="grid md:grid-cols-4 gap-8 mb-10">
        <div className="md:col-span-1">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">RecantoCare</span>
          </div>
          <p className="text-sm leading-relaxed">A plataforma líder em gestão de ILPIs no Brasil.</p>
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-3">Produto</p>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => go(ROUTES.features)} className="hover:text-white transition-colors">Recursos</button></li>
            <li><a href={ROUTES.pricing} className="hover:text-white transition-colors">Preços</a></li>
            <li><button onClick={() => go(ROUTES.demo)} className="hover:text-white transition-colors">Demonstração</button></li>
            <li><button onClick={() => go(ROUTES.subscribe)} className="hover:text-white transition-colors">Assinar</button></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-3">Empresa</p>
          <ul className="space-y-2 text-sm">
            {['Sobre nós', 'Blog', 'Carreiras', 'Contato'].map(item => (
              <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-3">Suporte</p>
          <ul className="space-y-2 text-sm">
            {['Central de ajuda', 'Documentação', 'Status do sistema', 'Política de privacidade'].map(item => (
              <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <p>© 2026 RecantoCare. Todos os direitos reservados.</p>
        <div className="flex items-center space-x-2 text-slate-500">
          <Shield className="h-4 w-4" />
          <span>Dados protegidos conforme LGPD</span>
        </div>
      </div>
    </div>
  </footer>
);

export default MarketingFooter;
