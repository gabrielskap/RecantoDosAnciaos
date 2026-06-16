import React, { useState } from 'react';
import {
  HeartPulse, Users, DollarSign, Building2, Activity, Shield,
  TrendingUp, AlertTriangle, Search, Eye, Edit, Plus, Lock,
  BarChart3, Server, RefreshCw, LogOut, Bell, Settings, ChevronDown,
  ArrowUpRight, ArrowDownRight, Package, X, MoreVertical, Mail, Zap
} from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'dev@quantumtecnologia.com.br';
const SUPER_ADMIN_PASSWORD = 'Quantum@Admin#2024';

// ——— MOCK DATA ———

const mockTenants = [
  { id: '1', name: 'Lar São Francisco', city: 'São Paulo', state: 'SP', plan: 'Profissional', residents: 48, users: 12, status: 'ativo', mrr: 799, since: '2024-03-15', email: 'admin@larsaofrancisco.com.br', lastActive: '2026-06-16' },
  { id: '2', name: 'Residencial Harmonia', city: 'Rio de Janeiro', state: 'RJ', plan: 'Profissional', residents: 36, users: 8, status: 'ativo', mrr: 799, since: '2024-05-20', email: 'contato@harmonia.com.br', lastActive: '2026-06-15' },
  { id: '3', name: 'Casa de Repouso Vida Nova', city: 'Belo Horizonte', state: 'MG', plan: 'Essencial', residents: 22, users: 5, status: 'ativo', mrr: 399, since: '2024-07-01', email: 'gestao@vidanova.com.br', lastActive: '2026-06-16' },
  { id: '4', name: 'Lar do Sossego', city: 'Curitiba', state: 'PR', plan: 'Essencial', residents: 18, users: 4, status: 'trial', mrr: 0, since: '2026-06-02', email: 'dir@larsossego.com.br', lastActive: '2026-06-15' },
  { id: '5', name: 'Grupo Esperança — Rede', city: 'Porto Alegre', state: 'RS', plan: 'Enterprise', residents: 132, users: 35, status: 'ativo', mrr: 2400, since: '2023-11-10', email: 'ti@grupoesperanca.com.br', lastActive: '2026-06-16' },
  { id: '6', name: 'Residencial Cuidar', city: 'Salvador', state: 'BA', plan: 'Profissional', residents: 41, users: 10, status: 'ativo', mrr: 799, since: '2025-01-08', email: 'admin@cuidar.com.br', lastActive: '2026-06-14' },
  { id: '7', name: 'Casa de Paz e Amor', city: 'Fortaleza', state: 'CE', plan: 'Essencial', residents: 27, users: 6, status: 'ativo', mrr: 399, since: '2025-02-14', email: 'paz@casadepaz.com.br', lastActive: '2026-06-13' },
  { id: '8', name: 'Lar Santa Rita', city: 'Recife', state: 'PE', plan: 'Profissional', residents: 53, users: 14, status: 'suspenso', mrr: 0, since: '2024-09-22', email: 'adm@santarita.com.br', lastActive: '2026-05-20' },
  { id: '9', name: 'Residencial Serenidade', city: 'Manaus', state: 'AM', plan: 'Essencial', residents: 15, users: 3, status: 'trial', mrr: 0, since: '2026-06-10', email: 'serenidade@mail.com', lastActive: '2026-06-16' },
  { id: '10', name: 'Grupo Bem-Estar — 3 unidades', city: 'Brasília', state: 'DF', plan: 'Enterprise', residents: 98, users: 28, status: 'ativo', mrr: 2400, since: '2024-04-05', email: 'cto@bemestar.com.br', lastActive: '2026-06-15' },
  { id: '11', name: 'Casa do Encontro', city: 'Goiânia', state: 'GO', plan: 'Essencial', residents: 20, users: 5, status: 'ativo', mrr: 399, since: '2025-06-01', email: 'encontro@mail.com.br', lastActive: '2026-06-12' },
  { id: '12', name: 'Lar Maracanã', city: 'Belém', state: 'PA', plan: 'Profissional', residents: 31, users: 9, status: 'ativo', mrr: 799, since: '2025-08-15', email: 'maracana@mail.com.br', lastActive: '2026-06-16' },
];

const recentActivity = [
  { type: 'new', msg: 'Nova ILPI cadastrada: Residencial Serenidade (Manaus/AM)', time: '10min atrás', icon: Building2, color: 'text-emerald-600 bg-emerald-50' },
  { type: 'alert', msg: 'Lar Santa Rita com pagamento em atraso há 27 dias', time: '1h atrás', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  { type: 'upgrade', msg: 'Lar do Sossego iniciou trial (14 dias)', time: '4 dias atrás', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
  { type: 'payment', msg: 'Pagamento recebido: Grupo Esperança — R$ 2.400', time: '5 dias atrás', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
  { type: 'alert', msg: 'Erro 502 detectado e resolvido automaticamente', time: '6 dias atrás', icon: Server, color: 'text-rose-600 bg-rose-50' },
];

const systemHealth = [
  { label: 'API Server', status: 'online', latency: '42ms' },
  { label: 'Banco de Dados', status: 'online', latency: '18ms' },
  { label: 'Supabase Auth', status: 'online', latency: '65ms' },
  { label: 'Storage (S3)', status: 'online', latency: '89ms' },
  { label: 'IA Gemini API', status: 'degraded', latency: '340ms' },
];

// ——— HELPERS ———

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    trial: 'bg-blue-100 text-blue-700 border-blue-200',
    suspenso: 'bg-rose-100 text-rose-700 border-rose-200',
    online: 'bg-emerald-100 text-emerald-700',
    degraded: 'bg-amber-100 text-amber-700',
    offline: 'bg-rose-100 text-rose-700',
  };
  const label: Record<string, string> = {
    ativo: 'Ativo', trial: 'Trial', suspenso: 'Suspenso',
    online: 'Online', degraded: 'Degradado', offline: 'Offline',
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'ativo' || status === 'online' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
      {label[status] || status}
    </span>
  );
};

const planBadge = (plan: string) => {
  const map: Record<string, string> = {
    Essencial: 'bg-slate-100 text-slate-700',
    Profissional: 'bg-blue-100 text-blue-700',
    Enterprise: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[plan] || 'bg-slate-100 text-slate-600'}`}>
      {plan}
    </span>
  );
};

// ——— MAIN COMPONENT ———

const SuperAdminPanel: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tenants' | 'billing' | 'system'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'trial' | 'suspenso'>('todos');
  const [selectedTenant, setSelectedTenant] = useState<typeof mockTenants[0] | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    await new Promise(r => setTimeout(r, 600));
    if (adminEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      setAuthError('E-mail ou senha incorretos.');
    }
    setAuthLoading(false);
  };

  // ——— AUTH SCREEN ———
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl shadow-lg mb-4">
              <Shield className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Super Admin</h1>
            <p className="text-slate-400 text-sm mt-1">RecantoCare — Painel Administrativo</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail administrativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="admin@recantocare.com.br"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-white placeholder-slate-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha de acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-white placeholder-slate-500"
                  />
                </div>
              </div>
              {authError && (
                <div className="flex items-center space-x-2 bg-rose-950 border border-rose-800 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <p className="text-sm text-rose-400">{authError}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm mt-2"
              >
                {authLoading ? 'Verificando...' : 'Acessar painel'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-slate-600 mt-6">
            <a href="/" className="hover:text-slate-400 transition-colors">← Voltar ao site</a>
          </p>
        </div>
      </div>
    );
  }

  // ——— STATS ———
  const activeCount = mockTenants.filter(t => t.status === 'ativo').length;
  const trialCount = mockTenants.filter(t => t.status === 'trial').length;
  const suspendedCount = mockTenants.filter(t => t.status === 'suspenso').length;
  const totalMRR = mockTenants.reduce((s, t) => s + t.mrr, 0);
  const totalResidents = mockTenants.reduce((s, t) => s + t.residents, 0);
  const totalUsers = mockTenants.reduce((s, t) => s + t.users, 0);

  const filteredTenants = mockTenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
      || t.city.toLowerCase().includes(searchQuery.toLowerCase())
      || t.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'todos' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'tenants', label: 'Clientes', icon: Building2 },
    { key: 'billing', label: 'Faturamento', icon: DollarSign },
    { key: 'system', label: 'Sistema', icon: Server },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans">

      {/* ——— SIDEBAR ——— */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">RecantoCare</p>
              <p className="text-violet-400 text-xs font-medium">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key as any)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === item.key
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <Settings className="h-5 w-5" />
            <span>Configurações</span>
          </button>
          <button
            onClick={() => setAuthenticated(false)}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ——— MAIN ——— */}
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-white font-bold text-lg">
              {activeSection === 'dashboard' && 'Dashboard'}
              {activeSection === 'tenants' && 'Gestão de Clientes'}
              {activeSection === 'billing' && 'Faturamento & Assinaturas'}
              {activeSection === 'system' && 'Saúde do Sistema'}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">Última atualização: agora mesmo</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition-all text-slate-400 hover:text-white">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <button className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 rounded-xl px-3 py-2 transition-all">
              <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-white font-medium">SuperAdmin</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">

          {/* ——— DASHBOARD ——— */}
          {activeSection === 'dashboard' && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  {
                    label: 'Clientes ativos', value: activeCount.toString(), sub: `+${trialCount} em trial`,
                    icon: Building2, color: 'text-blue-400 bg-blue-900/40', trend: '+2 este mês', up: true
                  },
                  {
                    label: 'MRR', value: `R$ ${totalMRR.toLocaleString('pt-BR')}`, sub: 'Receita recorrente mensal',
                    icon: DollarSign, color: 'text-emerald-400 bg-emerald-900/40', trend: '+R$ 1.198 vs anterior', up: true
                  },
                  {
                    label: 'Residentes gerenciados', value: totalResidents.toString(), sub: 'Em todas as ILPIs',
                    icon: Users, color: 'text-violet-400 bg-violet-900/40', trend: '+84 este mês', up: true
                  },
                  {
                    label: 'Usuários ativos', value: totalUsers.toString(), sub: 'Nos últimos 30 dias',
                    icon: Activity, color: 'text-amber-400 bg-amber-900/40', trend: '+23 este mês', up: true
                  },
                ].map(card => (
                  <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                        <card.icon className="h-5 w-5" />
                      </div>
                      <span className={`flex items-center text-xs font-medium ${card.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {card.up ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {card.trend}
                      </span>
                    </div>
                    <p className="text-2xl font-extrabold text-white mb-0.5">{card.value}</p>
                    <p className="text-xs text-slate-400">{card.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Plan distribution */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-5 text-sm">Distribuição por plano</h3>
                  <div className="space-y-3">
                    {[
                      { plan: 'Enterprise', count: 2, mrr: 4800, color: 'bg-violet-500' },
                      { plan: 'Profissional', count: 6, mrr: 4794, color: 'bg-blue-500' },
                      { plan: 'Essencial', count: 4, mrr: 1596, color: 'bg-slate-500' },
                    ].map(p => (
                      <div key={p.plan}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-medium">{p.plan}</span>
                          <span className="text-slate-400">{p.count} clientes · R$ {p.mrr.toLocaleString('pt-BR')}/mês</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${p.color} rounded-full`}
                            style={{ width: `${(p.count / mockTenants.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Status dos clientes</span>
                    </div>
                    <div className="flex gap-3 mt-3">
                      {[
                        { label: 'Ativos', count: activeCount, color: 'bg-emerald-500' },
                        { label: 'Trial', count: trialCount, color: 'bg-blue-500' },
                        { label: 'Suspensos', count: suspendedCount, color: 'bg-rose-500' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center space-x-1.5 text-xs text-slate-400">
                          <span className={`w-2 h-2 rounded-full ${s.color}`}></span>
                          <span>{s.label} ({s.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-semibold text-sm">Atividade recente</h3>
                    <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Ver tudo</button>
                  </div>
                  <div className="space-y-3">
                    {recentActivity.map((act, i) => (
                      <div key={i} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-slate-800/50 transition-all">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${act.color}`}>
                          <act.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 leading-snug">{act.msg}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{act.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Health Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-semibold text-sm">Status do sistema</h3>
                  <button className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-all bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Atualizar</span>
                  </button>
                </div>
                <div className="grid sm:grid-cols-5 gap-3">
                  {systemHealth.map(s => (
                    <div key={s.label} className="bg-slate-800 rounded-xl p-4 text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${s.status === 'online' ? 'bg-emerald-400' : s.status === 'degraded' ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
                      <p className="text-xs font-medium text-slate-200 mb-1">{s.label}</p>
                      <p className="text-xs text-slate-500">{s.latency}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ——— TENANTS ——— */}
          {activeSection === 'tenants' && (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, cidade ou e-mail..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="flex gap-2">
                  {(['todos', 'ativo', 'trial', 'suspenso'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all capitalize ${
                        statusFilter === f
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <button className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0">
                  <Plus className="h-4 w-4" />
                  <span>Nova ILPI</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-sm text-slate-400">{filteredTenants.length} clientes encontrados</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['ILPI', 'Cidade/UF', 'Plano', 'Residentes', 'Usuários', 'MRR', 'Status', 'Último acesso', ''].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map((t, i) => (
                        <tr key={t.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-all ${i % 2 === 0 ? '' : 'bg-slate-900/50'}`}>
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-medium text-white">{t.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{t.email}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-300">{t.city}/{t.state}</td>
                          <td className="px-5 py-4">{planBadge(t.plan)}</td>
                          <td className="px-5 py-4 text-sm text-slate-300">{t.residents}</td>
                          <td className="px-5 py-4 text-sm text-slate-300">{t.users}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-white">
                            {t.mrr > 0 ? `R$ ${t.mrr.toLocaleString('pt-BR')}` : <span className="text-slate-500">—</span>}
                          </td>
                          <td className="px-5 py-4">{statusBadge(t.status)}</td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {new Date(t.lastActive).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => setSelectedTenant(t)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950 transition-all">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ——— BILLING ——— */}
          {activeSection === 'billing' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'MRR Total', value: `R$ ${totalMRR.toLocaleString('pt-BR')}`, sub: 'Receita recorrente mensal', color: 'text-emerald-400 bg-emerald-900/40', icon: DollarSign },
                  { label: 'ARR Estimado', value: `R$ ${(totalMRR * 12).toLocaleString('pt-BR')}`, sub: 'Receita anual recorrente', color: 'text-blue-400 bg-blue-900/40', icon: TrendingUp },
                  { label: 'Churn Rate', value: '2.1%', sub: 'Último trimestre', color: 'text-rose-400 bg-rose-900/40', icon: ArrowDownRight },
                  { label: 'LTV Médio', value: 'R$ 14.400', sub: 'Lifetime value por cliente', color: 'text-violet-400 bg-violet-900/40', icon: BarChart3 },
                ].map(card => (
                  <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-extrabold text-white mb-0.5">{card.value}</p>
                    <p className="text-xs text-slate-400">{card.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">Assinaturas ativas</h3>
                  <span className="text-xs text-slate-400">{activeCount} assinaturas pagas</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['ILPI', 'Plano', 'MRR', 'Próximo vencimento', 'Status pagamento'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mockTenants.filter(t => t.status === 'ativo').map((t, i) => (
                        <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                          <td className="px-5 py-4 text-sm font-medium text-white">{t.name}</td>
                          <td className="px-5 py-4">{planBadge(t.plan)}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-emerald-400">R$ {t.mrr.toLocaleString('pt-BR')}</td>
                          <td className="px-5 py-4 text-sm text-slate-300">
                            {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                              Em dia
                            </span>
                          </td>
                        </tr>
                      ))}
                      {mockTenants.filter(t => t.status === 'suspenso').map(t => (
                        <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                          <td className="px-5 py-4 text-sm font-medium text-white">{t.name}</td>
                          <td className="px-5 py-4">{planBadge(t.plan)}</td>
                          <td className="px-5 py-4 text-sm text-slate-500">—</td>
                          <td className="px-5 py-4 text-sm text-rose-400">Vencido</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-900/50 text-rose-400 border border-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
                              Inadimplente
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ——— SYSTEM ——— */}
          {activeSection === 'system' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Uptime', value: '99.94%', sub: 'Últimos 30 dias', icon: Activity, color: 'text-emerald-400 bg-emerald-900/40' },
                  { label: 'Requisições/hora', value: '14.2k', sub: 'Média atual', icon: Zap, color: 'text-blue-400 bg-blue-900/40' },
                  { label: 'Uso de armazenamento', value: '2.8 GB', sub: 'De 50 GB disponíveis', icon: Package, color: 'text-amber-400 bg-amber-900/40' },
                  { label: 'Erros/hora', value: '0.3', sub: 'Abaixo do limite 5.0', icon: AlertTriangle, color: 'text-violet-400 bg-violet-900/40' },
                ].map(card => (
                  <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-extrabold text-white mb-0.5">{card.value}</p>
                    <p className="text-xs text-slate-400">{card.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-semibold text-sm">Status dos serviços</h3>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="flex items-center space-x-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Online</span></span>
                    <span className="flex items-center space-x-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Degradado</span></span>
                    <span className="flex items-center space-x-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-400"></span><span>Offline</span></span>
                  </div>
                </div>
                <div className="space-y-3">
                  {systemHealth.map(s => (
                    <div key={s.label} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.status === 'online' ? 'bg-emerald-400' : s.status === 'degraded' ? 'bg-amber-400' : 'bg-rose-400'} shadow-lg`}></div>
                        <span className="text-sm font-medium text-slate-200">{s.label}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-xs text-slate-500 text-right">Latência</p>
                          <p className={`text-sm font-bold ${s.status === 'online' ? 'text-emerald-400' : s.status === 'degraded' ? 'text-amber-400' : 'text-rose-400'}`}>{s.latency}</p>
                        </div>
                        {statusBadge(s.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-sm mb-5">Log de eventos do sistema</h3>
                <div className="space-y-2 font-mono text-xs">
                  {[
                    { time: '2026-06-16 14:32:01', level: 'INFO', msg: 'Health check passed — all services nominal' },
                    { time: '2026-06-16 13:15:44', level: 'WARN', msg: 'Gemini API latency elevated (340ms > threshold 200ms)' },
                    { time: '2026-06-16 11:02:18', level: 'INFO', msg: 'New tenant registered: Residencial Serenidade (tenant_id: t-9)' },
                    { time: '2026-06-16 09:48:30', level: 'INFO', msg: 'Backup completed successfully — 2.8 GB, duration: 4m 12s' },
                    { time: '2026-06-15 23:00:00', level: 'INFO', msg: 'Scheduled maintenance window completed — no downtime' },
                    { time: '2026-06-15 16:55:12', level: 'INFO', msg: 'Payment processed: tenant Grupo Esperança — R$ 2.400' },
                    { time: '2026-06-15 08:30:01', level: 'INFO', msg: 'Daily report generated and dispatched to all admins' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-start space-x-4 py-2 border-b border-slate-800/50">
                      <span className="text-slate-500 flex-shrink-0">{log.time}</span>
                      <span className={`flex-shrink-0 font-bold ${log.level === 'INFO' ? 'text-blue-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-rose-400'}`}>
                        [{log.level}]
                      </span>
                      <span className="text-slate-300">{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ——— TENANT DETAIL MODAL ——— */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTenant(null)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-violet-900/50 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedTenant.name}</h2>
                  <p className="text-sm text-slate-400">{selectedTenant.city}/{selectedTenant.state}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Plano', value: selectedTenant.plan },
                { label: 'Status', value: selectedTenant.status },
                { label: 'Residentes', value: selectedTenant.residents.toString() },
                { label: 'Usuários', value: selectedTenant.users.toString() },
                { label: 'MRR', value: selectedTenant.mrr > 0 ? `R$ ${selectedTenant.mrr.toLocaleString('pt-BR')}` : 'Trial' },
                { label: 'Cliente desde', value: new Date(selectedTenant.since).toLocaleDateString('pt-BR') },
              ].map(item => (
                <div key={item.label} className="bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-500 mb-1">E-mail de contato</p>
              <p className="text-sm text-violet-300">{selectedTenant.email}</p>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
                <Edit className="h-4 w-4" />
                <span>Editar cliente</span>
              </button>
              <button className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
                <Mail className="h-4 w-4" />
                <span>Contato</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;
