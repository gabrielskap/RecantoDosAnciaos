import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, BadgeCheck, ArrowUpRight } from 'lucide-react';
import { PageHeader, SectionCard, Badge, type Tone } from '../components/ui';
import KpiCard from '../components/KpiCard';
import {
  DEMO_REVENUE_EXPENSE, DEMO_INVOICES, DEMO_SUBSCRIPTION, formatBRL, type InvoiceStatus,
} from '../../../data/demoData';
import { go, ROUTES } from '../../../utils/navigation';

const invoiceTone: Record<InvoiceStatus, Tone> = { Pago: 'green', Pendente: 'amber', Atrasado: 'rose' };

const ProgressBar: React.FC<{ used: number; total: number }> = ({ used, total }) => (
  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, (used / total) * 100)}%` }} />
  </div>
);

const DemoFinance: React.FC = () => {
  const last = DEMO_REVENUE_EXPENSE[DEMO_REVENUE_EXPENSE.length - 1];
  const saldo = last.receita - last.despesa;
  const atrasadas = DEMO_INVOICES.filter(i => i.status === 'Atrasado');
  const inadimplencia = atrasadas.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <PageHeader title="Financeiro & Assinatura" subtitle="Receitas, despesas, mensalidades e plano contratado" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={TrendingUp} label="Receita (mês)" value={formatBRL(last.receita)} trend={{ dir: 'up', text: '+1,4%' }} iconClass="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={TrendingDown} label="Despesas (mês)" value={formatBRL(last.despesa)} iconClass="bg-rose-50 text-rose-600" />
        <KpiCard icon={Wallet} label="Saldo líquido" value={formatBRL(saldo)} iconClass="bg-blue-50 text-blue-600" />
        <KpiCard icon={AlertTriangle} label="Inadimplência" value={formatBRL(inadimplencia)} sub={`${atrasadas.length} faturas em atraso`} iconClass="bg-amber-50 text-amber-600" />
      </div>

      <SectionCard title="Receita × Despesa (6 meses)" className="mb-6">
        <div className="p-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEMO_REVENUE_EXPENSE} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `${v / 1000}k`} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number, n) => [formatBRL(v), n === 'receita' ? 'Receita' : 'Despesa']} />
              <Legend formatter={(v) => (v === 'receita' ? 'Receita' : 'Despesa')} />
              <Bar dataKey="receita" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesa" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Mensalidades */}
        <SectionCard title="Mensalidades" className="lg:col-span-2">
          <ul className="divide-y divide-slate-50">
            {DEMO_INVOICES.map(inv => (
              <li key={inv.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{inv.resident}</p>
                  <p className="text-xs text-slate-400">Venc. {new Date(inv.dueDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-slate-700">{formatBRL(inv.amount)}</span>
                  <Badge tone={invoiceTone[inv.status]}>{inv.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Assinatura */}
        <SectionCard title="Sua assinatura">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-slate-900">Plano {DEMO_SUBSCRIPTION.plano}</span>
              <Badge tone="green"><BadgeCheck className="h-3 w-3 mr-1" />{DEMO_SUBSCRIPTION.status}</Badge>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {formatBRL(DEMO_SUBSCRIPTION.valorMensal)}<span className="text-sm font-medium text-slate-400">/mês</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Próxima cobrança em {new Date(DEMO_SUBSCRIPTION.proximaCobranca).toLocaleDateString('pt-BR')}
            </p>

            <div className="space-y-4 mt-6">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Residentes</span>
                  <span>{DEMO_SUBSCRIPTION.residentesUsados}/{DEMO_SUBSCRIPTION.limiteResidentes}</span>
                </div>
                <ProgressBar used={DEMO_SUBSCRIPTION.residentesUsados} total={DEMO_SUBSCRIPTION.limiteResidentes} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Usuários</span>
                  <span>{DEMO_SUBSCRIPTION.usuariosUsados}/{DEMO_SUBSCRIPTION.limiteUsuarios}</span>
                </div>
                <ProgressBar used={DEMO_SUBSCRIPTION.usuariosUsados} total={DEMO_SUBSCRIPTION.limiteUsuarios} />
              </div>
            </div>

            <button
              onClick={() => go(ROUTES.subscribe)}
              className="w-full mt-6 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 rounded-xl transition-all"
            >
              Gerenciar assinatura <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default DemoFinance;
