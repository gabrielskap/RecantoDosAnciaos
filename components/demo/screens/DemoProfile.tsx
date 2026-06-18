import React, { useState } from 'react';
import { PageHeader, SectionCard, Avatar, Badge, Toggle } from '../components/ui';
import { DEMO_ADMIN } from '../../../data/demoData';

const Field: React.FC<{ label: string; defaultValue: string; type?: string }> = ({ label, defaultValue, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <input
      type={type}
      defaultValue={defaultValue}
      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
    />
  </div>
);

const DemoProfile: React.FC = () => {
  const [prefs, setPrefs] = useState({ emailNotif: true, stockAlerts: true, dailyDigest: false });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Meu Perfil" subtitle="Suas informações e preferências" />

      <SectionCard className="mb-6">
        <div className="p-5">
          <div className="flex items-center gap-4 mb-6">
            <Avatar initials={DEMO_ADMIN.initials} color={DEMO_ADMIN.color} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{DEMO_ADMIN.name}</h2>
              <div className="mt-1"><Badge tone="blue">{DEMO_ADMIN.role}</Badge></div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome completo" defaultValue={DEMO_ADMIN.name} />
            <Field label="E-mail" defaultValue={DEMO_ADMIN.email} type="email" />
            <Field label="Telefone" defaultValue={DEMO_ADMIN.phone} />
            <Field label="Instituição" defaultValue={DEMO_ADMIN.institution} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Preferências de notificação" className="mb-6">
        <div className="px-5 divide-y divide-slate-50">
          <Toggle label="Notificações por e-mail" desc="Receba alertas importantes no seu e-mail." checked={prefs.emailNotif} onChange={v => setPrefs(p => ({ ...p, emailNotif: v }))} />
          <Toggle label="Alertas de estoque" desc="Avisar quando um item atingir o mínimo." checked={prefs.stockAlerts} onChange={v => setPrefs(p => ({ ...p, stockAlerts: v }))} />
          <Toggle label="Resumo diário" desc="Um resumo das atividades a cada manhã." checked={prefs.dailyDigest} onChange={v => setPrefs(p => ({ ...p, dailyDigest: v }))} />
        </div>
      </SectionCard>

      <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
        Salvar alterações
      </button>
    </div>
  );
};

export default DemoProfile;
