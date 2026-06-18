import React, { useState } from 'react';
import { Search, Plus, ChevronRight, X, UserSearch } from 'lucide-react';
import { PageHeader, SectionCard, Avatar, Badge, type Tone } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { DEMO_RESIDENTS, type DemoResident, type CareLevel, type ResidentStatus } from '../../../data/demoData';

const careTone: Record<CareLevel, Tone> = { I: 'green', II: 'amber', III: 'rose' };
const statusTone: Record<ResidentStatus, Tone> = { Ativo: 'green', Internado: 'rose', 'Em observação': 'amber' };

const DemoResidents: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DemoResident | null>(null);

  const filtered = DEMO_RESIDENTS.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) || r.room.includes(query)
  );

  return (
    <div>
      <PageHeader
        title="Residentes"
        subtitle={`${DEMO_RESIDENTS.length} residentes cadastrados`}
        action={
          <button className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
            <Plus className="h-4 w-4" /> Novo residente
          </button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nome ou quarto..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title="Nenhum residente encontrado"
          text={`Não há resultados para “${query}”. Tente outro nome ou número de quarto.`}
          action={{ label: 'Limpar busca', onClick: () => setQuery('') }}
        />
      ) : (
        <SectionCard>
          {/* Cabeçalho de tabela (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span className="col-span-5">Residente</span>
            <span className="col-span-2">Quarto</span>
            <span className="col-span-1">Idade</span>
            <span className="col-span-2">Grau</span>
            <span className="col-span-2">Status</span>
          </div>
          <ul className="divide-y divide-slate-50">
            {filtered.map(r => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r)}
                  className="w-full text-left grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar initials={r.initials} color={r.color} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                      <p className="text-xs text-slate-400 truncate">{r.condition}</p>
                    </div>
                  </div>
                  <span className="col-span-4 md:col-span-2 text-sm text-slate-600">Quarto {r.room}</span>
                  <span className="col-span-3 md:col-span-1 text-sm text-slate-600">{r.age}</span>
                  <span className="col-span-3 md:col-span-2"><Badge tone={careTone[r.careLevel]}>Grau {r.careLevel}</Badge></span>
                  <span className="col-span-2 md:col-span-2 flex items-center justify-between">
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                    <ChevronRight className="hidden md:block h-4 w-4 text-slate-300" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Drawer de detalhe */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <Avatar initials={selected.initials} color={selected.color} size="lg" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                <p className="text-sm text-slate-400">Quarto {selected.room} · {selected.age} anos</p>
              </div>
            </div>
            <div className="flex gap-2 mb-6">
              <Badge tone={careTone[selected.careLevel]}>Grau {selected.careLevel}</Badge>
              <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Condição clínica</p>
                <p className="text-sm text-slate-700">{selected.condition}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Admissão</p>
                <p className="text-sm text-slate-700">{new Date(selected.admissionDate).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[{ l: 'PA', v: '120/80' }, { l: 'FC', v: '72 bpm' }, { l: 'SpO₂', v: '97%' }].map(s => (
                  <div key={s.l} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400">{s.l}</p>
                    <p className="text-sm font-bold text-slate-800">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              No sistema completo, aqui você acessa prontuário, medicações, sinais vitais, checklists e evolução.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoResidents;
