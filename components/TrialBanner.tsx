import React, { useState } from 'react';
import { Clock, X, Sparkles } from 'lucide-react';

interface TrialBannerProps {
  daysRemaining: number;
  onAssinar: () => void;
}

const DISMISS_KEY = 'trialBannerDismissedDay';

const TrialBanner: React.FC<TrialBannerProps> = ({ daysRemaining, onAssinar }) => {
  const todayStr = new Date().toDateString();
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(DISMISS_KEY) === todayStr
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, todayStr);
    setDismissed(true);
  };

  const urgente = daysRemaining <= 2;

  return (
    <div className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-sm z-10 ${
      urgente
        ? 'bg-rose-500 text-white'
        : 'bg-amber-50 border-b border-amber-200 text-amber-900'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <Clock className={`h-4 w-4 shrink-0 ${urgente ? 'text-white' : 'text-amber-600'}`} />
        <span className="truncate">
          {daysRemaining === 0
            ? 'Seu período de teste expira hoje!'
            : daysRemaining === 1
            ? 'Último dia do período de teste gratuito.'
            : `${daysRemaining} dias restantes no período de teste gratuito.`}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onAssinar}
          className={`inline-flex items-center gap-1.5 font-semibold px-3 py-1 rounded-lg text-xs transition-all ${
            urgente
              ? 'bg-white text-rose-600 hover:bg-rose-50'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Assinar Agora
        </button>
        <button
          onClick={handleDismiss}
          className={`p-1 rounded transition-colors ${urgente ? 'hover:bg-rose-400' : 'hover:bg-amber-100'}`}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TrialBanner;
