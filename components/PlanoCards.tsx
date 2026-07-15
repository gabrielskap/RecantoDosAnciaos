import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import type { PlanoView, Periodicidade } from '../types';
import { excedeLimite, formatLimite } from '../utils/planLimits';

const money = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

interface PlanoCardsProps {
  planos: PlanoView[];
  selectedId: string;
  periodicidade: Periodicidade;
  onSelect: (planoId: string) => void;
  onPeriodChange: (p: Periodicidade) => void;
  qtdResidentes?: number;
  qtdUsuarios?: number;
}

const PlanoCards: React.FC<PlanoCardsProps> = ({
  planos,
  selectedId,
  periodicidade,
  onSelect,
  onPeriodChange,
  qtdResidentes,
  qtdUsuarios,
}) => {
  const selfServicePlanos = planos.filter(p => p.selfService);

  return (
    <>
      {/* Toggle mensal/anual */}
      <div className="flex items-center space-x-3 mb-6">
        <span className={`text-sm font-medium ${periodicidade === 'mensal' ? 'text-slate-900' : 'text-slate-400'}`}>
          Mensal
        </span>
        <button
          onClick={() => onPeriodChange(periodicidade === 'mensal' ? 'anual' : 'mensal')}
          className={`relative w-10 h-5 rounded-full transition-colors ${periodicidade === 'anual' ? 'bg-blue-600' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${periodicidade === 'anual' ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm font-medium ${periodicidade === 'anual' ? 'text-slate-900' : 'text-slate-400'}`}>
          Anual{' '}
          <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
            economize
          </span>
        </span>
      </div>

      <div className="grid gap-4">
        {selfServicePlanos.map(plano => {
          const precoMes = periodicidade === 'mensal' ? plano.precoMensal : plano.precoMensalAnual;
          const selected = selectedId === plano.id;
          const residentesExcede = qtdResidentes != null && excedeLimite(qtdResidentes, plano.maxResidentes);
          const usuariosExcede = qtdUsuarios != null && excedeLimite(qtdUsuarios, plano.maxUsuarios);
          return (
            <button
              key={plano.id}
              onClick={() => onSelect(plano.id)}
              className={`relative border-2 rounded-xl p-5 text-left transition-all w-full ${
                selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {plano.popular && (
                <span className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  Mais popular
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-slate-900">{plano.nome}</p>
                  <p className="text-xs text-slate-400">{plano.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-slate-900">{money(precoMes)}</p>
                  <p className="text-xs text-slate-400">/mês</p>
                  {periodicidade === 'anual' && (
                    <p className="text-[11px] text-emerald-600 font-medium">{money(plano.precoAnualTotal)}/ano</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {plano.features.slice(0, 4).map(f => (
                  <span key={f} className="flex items-center space-x-1 text-xs text-slate-500">
                    <Check className="h-3 w-3 text-blue-600" />
                    <span>{f}</span>
                  </span>
                ))}
                {plano.features.length > 4 && (
                  <span className="text-xs text-blue-600 font-medium">
                    +{plano.features.length - 4} mais
                  </span>
                )}
              </div>
              {(residentesExcede || usuariosExcede) && (
                <p className="flex items-center gap-1 text-xs text-red-600 font-medium mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {residentesExcede && usuariosExcede
                    ? `Não comporta ${qtdResidentes} residentes / ${qtdUsuarios} usuários (máx. ${formatLimite(plano.maxResidentes)} / ${formatLimite(plano.maxUsuarios)})`
                    : residentesExcede
                    ? `Não comporta ${qtdResidentes} residentes (máx. ${formatLimite(plano.maxResidentes)})`
                    : `Não comporta ${qtdUsuarios} usuários (máx. ${formatLimite(plano.maxUsuarios)})`}
                </p>
              )}
              {selected && (
                <div className="absolute top-4 right-4 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          );
        })}

        {/* Enterprise — não comprável no self-service */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex items-center justify-between bg-slate-50">
          <div>
            <p className="font-bold text-slate-900">Enterprise</p>
            <p className="text-xs text-slate-400">Para redes e grupos com múltiplas unidades</p>
          </div>
          <a
            href="mailto:comercial@recantocare.com.br?subject=Plano%20Enterprise"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            Falar com vendas
          </a>
        </div>
      </div>
    </>
  );
};

export default PlanoCards;
