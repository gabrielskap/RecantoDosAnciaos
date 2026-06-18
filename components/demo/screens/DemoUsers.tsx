import React, { useState } from 'react';
import { Plus, Search, UserSearch, Users, UserCheck, ShieldCheck } from 'lucide-react';
import { PageHeader, SectionCard, Avatar, Badge, type Tone } from '../components/ui';
import KpiCard from '../components/KpiCard';
import EmptyState from '../components/EmptyState';
import { DEMO_USERS, type UserRole } from '../../../data/demoData';

const roleTone: Record<UserRole, Tone> = {
  Administrador: 'blue', Médico: 'rose', Enfermeiro: 'green', Cuidador: 'amber', Nutricionista: 'violet',
};

const DemoUsers: React.FC = () => {
  const [query, setQuery] = useState('');
  const filtered = DEMO_USERS.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
  );
  const ativos = DEMO_USERS.filter(u => u.status === 'Ativo').length;
  const perfis = new Set(DEMO_USERS.map(u => u.role)).size;

  return (
    <div>
      <PageHeader
        title="Usuários & Acessos"
        subtitle="Gerencie quem acessa o sistema e seus perfis"
        action={
          <button className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
            <Plus className="h-4 w-4" /> Novo usuário
          </button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <KpiCard icon={Users} label="Usuários" value={String(DEMO_USERS.length)} iconClass="bg-blue-50 text-blue-600" />
        <KpiCard icon={UserCheck} label="Ativos" value={String(ativos)} iconClass="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={ShieldCheck} label="Perfis de acesso" value={String(perfis)} iconClass="bg-violet-50 text-violet-600" />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserSearch} title="Nenhum usuário encontrado" text={`Sem resultados para “${query}”.`} action={{ label: 'Limpar busca', onClick: () => setQuery('') }} />
      ) : (
        <SectionCard>
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span className="col-span-5">Usuário</span>
            <span className="col-span-3">Perfil</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Último acesso</span>
          </div>
          <ul className="divide-y divide-slate-50">
            {filtered.map(u => (
              <li key={u.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
                  <Avatar initials={u.initials} color={u.color} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                </div>
                <span className="col-span-5 md:col-span-3"><Badge tone={roleTone[u.role]}>{u.role}</Badge></span>
                <span className="col-span-3 md:col-span-2"><Badge tone={u.status === 'Ativo' ? 'green' : 'slate'}>{u.status}</Badge></span>
                <span className="col-span-4 md:col-span-2 text-xs text-slate-500">{u.lastAccess}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
};

export default DemoUsers;
