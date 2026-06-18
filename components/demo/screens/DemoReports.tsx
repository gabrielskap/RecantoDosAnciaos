import React, { useState } from 'react';
import { FileText, Download, Loader2, Check } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/ui';
import { DEMO_REPORTS } from '../../../data/demoData';

type GenState = 'idle' | 'loading' | 'done';

const DemoReports: React.FC = () => {
  const [states, setStates] = useState<Record<string, GenState>>({});

  const generate = (id: string) => {
    setStates(s => ({ ...s, [id]: 'loading' }));
    setTimeout(() => {
      setStates(s => ({ ...s, [id]: 'done' }));
      setTimeout(() => setStates(s => ({ ...s, [id]: 'idle' })), 2200);
    }, 1200);
  };

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Gere documentos e relatórios de conformidade em PDF" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {DEMO_REPORTS.map(r => {
          const st = states[r.id] ?? 'idle';
          return (
            <SectionCard key={r.id} className="flex flex-col">
              <div className="p-5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5">{r.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-3">{r.description}</p>
                <p className="text-xs text-slate-400">Último: {r.lastGenerated}</p>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => generate(r.id)}
                  disabled={st === 'loading'}
                  className={`w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all ${
                    st === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-900 hover:bg-slate-700 text-white'
                  }`}
                >
                  {st === 'loading' && <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>}
                  {st === 'done' && <><Check className="h-4 w-4" /> PDF gerado</>}
                  {st === 'idle' && <><Download className="h-4 w-4" /> Gerar PDF</>}
                </button>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
};

export default DemoReports;
