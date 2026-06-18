import React, { useState } from 'react';
import { PageHeader, SectionCard, Toggle } from '../components/ui';
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

const DemoSettings: React.FC = () => {
  const [alerts, setAlerts] = useState({ stock: true, meds: true, birthdays: true, contracts: false });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" subtitle="Dados da instituição e preferências do sistema" />

      <SectionCard title="Dados da instituição" className="mb-6">
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <Field label="Nome da instituição" defaultValue={DEMO_ADMIN.institution} />
          <Field label="CNPJ" defaultValue="12.345.678/0001-90" />
          <Field label="Telefone" defaultValue="(11) 3000-0000" />
          <Field label="E-mail comercial" defaultValue="contato@larsaofrancisco.com.br" type="email" />
          <div className="sm:col-span-2">
            <Field label="Endereço" defaultValue="Rua das Acácias, 250 — São Paulo, SP" />
          </div>
          <Field label="Capacidade (residentes)" defaultValue="16" type="number" />
          <Field label="Registro ANVISA" defaultValue="RDC 283/2005" />
        </div>
      </SectionCard>

      <SectionCard title="Alertas e notificações" className="mb-6">
        <div className="px-5 divide-y divide-slate-50">
          <Toggle label="Alerta de estoque mínimo" desc="Notificar quando um item atingir o mínimo." checked={alerts.stock} onChange={v => setAlerts(a => ({ ...a, stock: v }))} />
          <Toggle label="Lembrete de medicação" desc="Avisar a equipe sobre horários de medicação." checked={alerts.meds} onChange={v => setAlerts(a => ({ ...a, meds: v }))} />
          <Toggle label="Aniversários de residentes" desc="Lembrar dos aniversários do dia." checked={alerts.birthdays} onChange={v => setAlerts(a => ({ ...a, birthdays: v }))} />
          <Toggle label="Vencimento de contratos" desc="Avisar sobre contratos próximos do vencimento." checked={alerts.contracts} onChange={v => setAlerts(a => ({ ...a, contracts: v }))} />
        </div>
      </SectionCard>

      <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
        Salvar configurações
      </button>
    </div>
  );
};

export default DemoSettings;
