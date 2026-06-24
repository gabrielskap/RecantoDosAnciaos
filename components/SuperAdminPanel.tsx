import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse, Users, DollarSign, Building2, Activity, Shield,
  AlertTriangle, Search, Eye, Edit, Plus, Lock,
  BarChart3, Server, RefreshCw, LogOut, ArrowUpRight,
  X, Mail, CheckCircle, Ban, UserCheck, TrendingUp, Clock,
  Save, ArrowLeftRight, Calendar, CreditCard, XCircle, RotateCcw,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import {
  getSuperAdminKPIs,
  getSuperAdminEmpresas,
  getSuperAdminRecentActivity,
  getSuperAdminBillingOverview,
  getSuperAdminAccessLogs,
  updateEmpresaStatus,
  updateEmpresaDetails,
  updateAssinatura,
  createEmpresa,
} from '../services/superAdminService';
import type {
  DashboardKPIs,
  Empresa,
  ActivityItem,
  BillingOverview,
  AccessLog,
} from '../services/superAdminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
);

const formatMoney = (value: number | null | undefined): string => {
  if (value == null) return '—';
  return `R$ ${value.toLocaleString('pt-BR')}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const formatRelativeTime = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  const h   = Math.floor(diffMs / 3600000);
  const d   = Math.floor(diffMs / 86400000);
  if (min < 1)  return 'agora mesmo';
  if (min < 60) return `${min}min atrás`;
  if (h < 24)   return `${h}h atrás`;
  if (d < 7)    return `${d} dias atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const getActivityMeta = (tipo: string): { Icon: React.ElementType; iconClass: string } => {
  switch (tipo) {
    case 'empresa_criada':    return { Icon: Building2,     iconClass: 'text-emerald-600 bg-emerald-50' };
    case 'pagamento_aprovado':return { Icon: DollarSign,    iconClass: 'text-emerald-600 bg-emerald-50' };
    case 'empresa_reativada': return { Icon: CheckCircle,   iconClass: 'text-blue-600 bg-blue-50' };
    case 'pagamento_recusado':return { Icon: AlertTriangle, iconClass: 'text-rose-600 bg-rose-50' };
    case 'empresa_bloqueada': return { Icon: Ban,           iconClass: 'text-rose-600 bg-rose-50' };
    case 'assinatura_cancelada': return { Icon: Ban,        iconClass: 'text-rose-600 bg-rose-50' };
    case 'status_alterado':   return { Icon: RefreshCw,      iconClass: 'text-blue-600 bg-blue-50' };
    case 'dados_atualizados': return { Icon: Save,           iconClass: 'text-blue-600 bg-blue-50' };
    case 'plano_alterado':    return { Icon: ArrowLeftRight, iconClass: 'text-violet-600 bg-violet-50' };
    case 'trial_estendido':   return { Icon: Calendar,       iconClass: 'text-blue-600 bg-blue-50' };
    default:                  return { Icon: Activity,       iconClass: 'text-slate-500 bg-slate-50' };
  }
};

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    ativa:              'bg-emerald-50 text-emerald-700 border-emerald-200',
    pendente:           'bg-amber-50 text-amber-700 border-amber-200',
    bloqueada:          'bg-rose-50 text-rose-700 border-rose-200',
    cancelada:          'bg-slate-100 text-slate-500 border-slate-200',
    em_trial:           'bg-blue-50 text-blue-700 border-blue-200',
    vencida:            'bg-rose-50 text-rose-700 border-rose-200',
    pagamento_recusado: 'bg-rose-50 text-rose-700 border-rose-200',
    online:             'bg-emerald-50 text-emerald-700 border-emerald-200',
    degraded:           'bg-amber-50 text-amber-700 border-amber-200',
    offline:            'bg-rose-50 text-rose-700 border-rose-200',
  };
  const labels: Record<string, string> = {
    ativa: 'Ativa', pendente: 'Pendente', bloqueada: 'Bloqueada', cancelada: 'Cancelada',
    em_trial: 'Trial', vencida: 'Vencida', pagamento_recusado: 'Rec. recusado',
    online: 'Online', degraded: 'Degradado', offline: 'Offline',
  };
  const dots: Record<string, string> = {
    ativa: 'bg-emerald-500', pendente: 'bg-amber-500', bloqueada: 'bg-rose-500',
    cancelada: 'bg-slate-400', em_trial: 'bg-blue-500', vencida: 'bg-rose-500',
    pagamento_recusado: 'bg-rose-500', online: 'bg-emerald-500', degraded: 'bg-amber-500', offline: 'bg-rose-500',
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status] ?? 'bg-slate-400'}`} />
      {labels[status] ?? status}
    </span>
  );
};

const planBadge = (planoNome: string | null) => {
  if (!planoNome) return <span className="text-slate-400 text-xs">—</span>;
  const styles: Record<string, string> = {
    Essencial:    'bg-slate-100 text-slate-700',
    Profissional: 'bg-blue-100 text-blue-700',
    Enterprise:   'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[planoNome] ?? 'bg-slate-100 text-slate-600'}`}>
      {planoNome}
    </span>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANOS = [
  { id: 'essencial',    nome: 'Essencial',    valor: 399 },
  { id: 'profissional', nome: 'Profissional',  valor: 799 },
  { id: 'enterprise',   nome: 'Enterprise',    valor: 0   },
];

// ─── Component ────────────────────────────────────────────────────────────────

type AssinaturaAcao = 'change_plan' | 'extend_trial' | 'cancel' | 'reactivate' | 'manual_payment';
type Section = 'dashboard' | 'tenants' | 'billing' | 'system';

const navItems: { key: Section; label: string; Icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard',    Icon: BarChart3  },
  { key: 'tenants',   label: 'Clientes',     Icon: Building2  },
  { key: 'billing',   label: 'Faturamento',  Icon: DollarSign },
  { key: 'system',    label: 'Sistema',      Icon: Server     },
];

const SuperAdminPanel: React.FC = () => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail,    setAdminEmail]    = useState('');
  const [password,      setPassword]      = useState('');
  const [authError,     setAuthError]     = useState('');
  const [authLoading,   setAuthLoading]   = useState(false);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<Section>('dashboard');

  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // ── Modals ────────────────────────────────────────────────────────────────
  const modalMouseDown = useRef(false);
  const [selectedTenant, setSelectedTenant] = useState<Empresa | null>(null);
  const [editingTenant,  setEditingTenant]  = useState<Empresa | null>(null);
  const [editNovoStatus, setEditNovoStatus] = useState('');
  const [editMotivo,     setEditMotivo]     = useState('');
  const [editLoading,    setEditLoading]    = useState(false);

  // ── Detail edit mode ──────────────────────────────────────────────────────
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailForm,     setDetailForm]     = useState({
    nome_instituicao: '', email_comercial: '', cidade: '', estado: '', cnpj: '', telefone: '',
  });
  const [detailSaving,   setDetailSaving]   = useState(false);

  // ── Nova ILPI modal ───────────────────────────────────────────────────────
  const [novaIlpiOpen,    setNovaIlpiOpen]    = useState(false);
  const [novaIlpiForm,    setNovaIlpiForm]    = useState({
    nome_instituicao: '', email_comercial: '', cidade: '', estado: '',
    cnpj: '', telefone: '', plano_id: 'essencial', plano_nome: 'Essencial',
    valor_mensal: 399, status_inicial: 'ativa' as 'ativa' | 'em_trial' | 'pendente',
  });
  const [novaIlpiLoading, setNovaIlpiLoading] = useState(false);
  const [novaIlpiError,   setNovaIlpiError]   = useState('');

  // ── Assinatura action modal ───────────────────────────────────────────────
  const [assinaturaModal,   setAssinaturaModal]   = useState<{ tenant: Empresa; acao: AssinaturaAcao } | null>(null);
  const [assinaturaForm,    setAssinaturaForm]    = useState({
    plano_id: '', plano_nome: '', valor_mensal: 0, dias_extensao: 14, motivo: '',
  });
  const [assinaturaLoading, setAssinaturaLoading] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [kpis,           setKpis]           = useState<DashboardKPIs | null>(null);
  const [kpisLoading,    setKpisLoading]    = useState(false);
  const [empresas,       setEmpresas]       = useState<Empresa[]>([]);
  const [empresasLoading,setEmpresasLoading]= useState(false);
  const [activity,       setActivity]       = useState<ActivityItem[]>([]);
  const [activityLoading,setActivityLoading]= useState(false);
  const [billing,        setBilling]        = useState<BillingOverview | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [accessLogs,     setAccessLogs]     = useState<AccessLog[]>([]);
  const [logsLoading,    setLogsLoading]    = useState(false);

  // ── Session restore ───────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.is_superadmin) {
        setAuthenticated(true);
      }
    });
  }, []);

  // ── Load dashboard data on auth ───────────────────────────────────────────
  useEffect(() => {
    if (!authenticated) return;
    loadKpis();
    loadActivity();
  }, [authenticated]);

  // ── Load section data on navigation ──────────────────────────────────────
  useEffect(() => {
    if (!authenticated) return;
    if (activeSection === 'tenants' && empresas.length === 0) loadEmpresas();
    if (activeSection === 'billing' && !billing)              loadBilling();
    if (activeSection === 'system'  && accessLogs.length === 0) loadAccessLogs();
  }, [authenticated, activeSection]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadKpis = async () => {
    setKpisLoading(true);
    try { setKpis(await getSuperAdminKPIs()); } catch (err) { console.error('[superadmin] loadKpis:', err); } finally { setKpisLoading(false); }
  };
  const loadActivity = async () => {
    setActivityLoading(true);
    try { setActivity(await getSuperAdminRecentActivity(20)); } catch (err) { console.error('[superadmin] loadActivity:', err); } finally { setActivityLoading(false); }
  };
  const loadEmpresas = async () => {
    setEmpresasLoading(true);
    try { setEmpresas(await getSuperAdminEmpresas()); } catch (err) { console.error('[superadmin] loadEmpresas:', err); } finally { setEmpresasLoading(false); }
  };
  const loadBilling = async () => {
    setBillingLoading(true);
    try { setBilling(await getSuperAdminBillingOverview()); } catch (err) { console.error('[superadmin] loadBilling:', err); } finally { setBillingLoading(false); }
  };
  const loadAccessLogs = async () => {
    setLogsLoading(true);
    try { setAccessLogs(await getSuperAdminAccessLogs(50)); } catch (err) { console.error('[superadmin] loadAccessLogs:', err); } finally { setLogsLoading(false); }
  };

  const refreshSection = () => {
    if (activeSection === 'dashboard') { loadKpis(); loadActivity(); }
    if (activeSection === 'tenants')   loadEmpresas();
    if (activeSection === 'billing')   loadBilling();
    if (activeSection === 'system')    loadAccessLogs();
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password });
      if (error) throw error;
      if (!user?.user_metadata?.is_superadmin) {
        await supabase.auth.signOut();
        throw new Error('Acesso negado: usuário sem permissão de superadmin.');
      }
      setAuthenticated(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'E-mail ou senha incorretos.';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthenticated(false);
    setKpis(null);
    setEmpresas([]);
    setActivity([]);
    setBilling(null);
    setAccessLogs([]);
    setActiveSection('dashboard');
  };

  // ── Edit status handler ───────────────────────────────────────────────────
  const openEditStatus = (empresa: Empresa) => {
    setEditingTenant(empresa);
    setEditNovoStatus(empresa.status);
    setEditMotivo('');
    setSelectedTenant(null);
    setDetailEditMode(false);
  };

  const handleUpdateStatus = async () => {
    if (!editingTenant || !editNovoStatus) return;
    setEditLoading(true);
    try {
      await updateEmpresaStatus(editingTenant.empresa_id, editNovoStatus, editMotivo || undefined);
      setEmpresas(prev =>
        prev.map(e => e.empresa_id === editingTenant.empresa_id ? { ...e, status: editNovoStatus } : e)
      );
      setEditingTenant(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      alert('Erro ao atualizar status: ' + msg);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Detail edit handlers ──────────────────────────────────────────────────
  const openDetailEdit = (empresa: Empresa) => {
    setDetailForm({
      nome_instituicao: empresa.nome_instituicao,
      email_comercial:  empresa.email_comercial ?? '',
      cidade:           empresa.cidade  ?? '',
      estado:           empresa.estado  ?? '',
      cnpj:             empresa.cnpj    ?? '',
      telefone:         empresa.telefone ?? '',
    });
    setDetailEditMode(true);
  };

  const handleSaveDetails = async () => {
    if (!selectedTenant) return;
    setDetailSaving(true);
    try {
      await updateEmpresaDetails(selectedTenant.empresa_id, {
        nome_instituicao: detailForm.nome_instituicao || undefined,
        email_comercial:  detailForm.email_comercial  || undefined,
        cidade:           detailForm.cidade           || undefined,
        estado:           detailForm.estado           || undefined,
        cnpj:             detailForm.cnpj             || undefined,
        telefone:         detailForm.telefone         || undefined,
      });
      const updated: Empresa = {
        ...selectedTenant,
        nome_instituicao: detailForm.nome_instituicao || selectedTenant.nome_instituicao,
        email_comercial:  detailForm.email_comercial  || selectedTenant.email_comercial,
        cidade:           detailForm.cidade           || selectedTenant.cidade,
        estado:           detailForm.estado           || selectedTenant.estado,
        cnpj:             detailForm.cnpj             || null,
        telefone:         detailForm.telefone         || null,
      };
      setSelectedTenant(updated);
      setEmpresas(prev => prev.map(e => e.empresa_id === selectedTenant.empresa_id ? updated : e));
      setDetailEditMode(false);
    } catch (err: unknown) {
      alert('Erro ao atualizar dados: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setDetailSaving(false);
    }
  };

  // ── Assinatura action handlers ────────────────────────────────────────────
  const openAssinaturaAction = (tenant: Empresa, acao: AssinaturaAcao) => {
    setAssinaturaForm({ plano_id: '', plano_nome: '', valor_mensal: 0, dias_extensao: 14, motivo: '' });
    setAssinaturaModal({ tenant, acao });
  };

  const handleAssinaturaAction = async () => {
    if (!assinaturaModal) return;
    setAssinaturaLoading(true);
    try {
      const { tenant, acao } = assinaturaModal;
      await updateAssinatura(tenant.empresa_id, acao, {
        plano_id:      assinaturaForm.plano_id      || undefined,
        plano_nome:    assinaturaForm.plano_nome    || undefined,
        valor_mensal:  assinaturaForm.valor_mensal  || undefined,
        dias_extensao: assinaturaForm.dias_extensao || undefined,
        motivo:        assinaturaForm.motivo        || undefined,
      });
      setEmpresas(prev => prev.map(e => {
        if (e.empresa_id !== tenant.empresa_id) return e;
        if (acao === 'change_plan')   return { ...e, plano_id: assinaturaForm.plano_id, plano_nome: assinaturaForm.plano_nome, valor_mensal: assinaturaForm.valor_mensal };
        if (acao === 'cancel')        return { ...e, status: 'cancelada', subscription_status: 'cancelada' };
        if (acao === 'reactivate' || acao === 'manual_payment') return { ...e, status: 'ativa', subscription_status: 'ativa' };
        return e;
      }));
      if (selectedTenant?.empresa_id === tenant.empresa_id) {
        setSelectedTenant(t => {
          if (!t) return t;
          if (acao === 'change_plan')   return { ...t, plano_id: assinaturaForm.plano_id, plano_nome: assinaturaForm.plano_nome, valor_mensal: assinaturaForm.valor_mensal };
          if (acao === 'cancel')        return { ...t, status: 'cancelada' };
          if (acao === 'reactivate' || acao === 'manual_payment') return { ...t, status: 'ativa' };
          return t;
        });
      }
      setAssinaturaModal(null);
      loadActivity();
    } catch (err: unknown) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setAssinaturaLoading(false);
    }
  };

  // ── Nova ILPI handler ─────────────────────────────────────────────────────
  const handleCreateEmpresa = async () => {
    if (!novaIlpiForm.nome_instituicao.trim()) return;
    setNovaIlpiLoading(true);
    setNovaIlpiError('');
    try {
      await createEmpresa(novaIlpiForm);
      setNovaIlpiOpen(false);
      setNovaIlpiForm({
        nome_instituicao: '', email_comercial: '', cidade: '', estado: '',
        cnpj: '', telefone: '', plano_id: 'essencial', plano_nome: 'Essencial',
        valor_mensal: 399, status_inicial: 'ativa',
      });
      await loadEmpresas();
      await loadKpis();
    } catch (err: unknown) {
      setNovaIlpiError(err instanceof Error ? err.message : 'Erro ao criar ILPI');
    } finally {
      setNovaIlpiLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredEmpresas = empresas.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || e.nome_instituicao.toLowerCase().includes(q)
      || (e.cidade ?? '').toLowerCase().includes(q)
      || (e.email_comercial ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'todos' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Auth screen ───────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
              <Shield className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
            <p className="text-slate-500 text-sm mt-1">RecantoCare — Painel Administrativo</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail administrativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                    placeholder="admin@recantocare.com.br" required autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha de acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••" required autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>
              {authError && (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <p className="text-sm text-rose-600">{authError}</p>
                </div>
              )}
              <button
                type="submit" disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm mt-2"
              >
                {authLoading ? 'Verificando...' : 'Acessar painel'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            <a href="/" className="hover:text-slate-600 transition-colors">← Voltar ao site</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm">RecantoCare</p>
              <p className="text-blue-600 text-xs font-medium">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div>
            <h1 className="text-slate-900 font-bold text-lg">
              {activeSection === 'dashboard' && 'Dashboard'}
              {activeSection === 'tenants'   && 'Gestão de Clientes'}
              {activeSection === 'billing'   && 'Faturamento & Assinaturas'}
              {activeSection === 'system'    && 'Logs do Sistema'}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshSection}
              className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Atualizar</span>
            </button>
            <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-blue-700 font-medium">SuperAdmin</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* ─────────── DASHBOARD ─────────── */}
          {activeSection === 'dashboard' && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Clientes ativos', value: kpis?.empresas_ativas, sub: `+${kpis?.empresas_trial ?? 0} em trial`, Icon: Building2, iconClass: 'bg-blue-50 text-blue-600' },
                  { label: 'MRR',             value: formatMoney(kpis?.mrr_total ?? null), sub: 'Receita recorrente mensal', Icon: DollarSign, iconClass: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Residentes',      value: kpis?.total_residentes, sub: 'Em todas as ILPIs', Icon: Users,      iconClass: 'bg-violet-50 text-violet-600' },
                  { label: 'Usuários',        value: kpis?.total_usuarios,   sub: 'Contas ativas no sistema', Icon: UserCheck, iconClass: 'bg-amber-50 text-amber-600' },
                ].map(card => (
                  <div key={card.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconClass}`}>
                        <card.Icon className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    </div>
                    {kpisLoading ? (
                      <>
                        <Skeleton className="h-7 w-20 mb-2" />
                        <Skeleton className="h-3 w-28" />
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-extrabold text-slate-900 mb-0.5">{card.value ?? '—'}</p>
                        <p className="text-xs text-slate-500">{card.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Plan distribution */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-slate-900 font-semibold text-sm mb-5">Resumo de clientes</h3>
                  {kpisLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: 'Ativos',    count: kpis?.empresas_ativas ?? 0,    color: 'bg-emerald-500', textColor: 'text-emerald-700 bg-emerald-50' },
                        { label: 'Trial',     count: kpis?.empresas_trial ?? 0,     color: 'bg-blue-500',    textColor: 'text-blue-700 bg-blue-50' },
                        { label: 'Suspensos', count: kpis?.empresas_suspensas ?? 0, color: 'bg-rose-500',    textColor: 'text-rose-700 bg-rose-50' },
                      ].map(item => {
                        const total = kpis?.total_empresas ?? 1;
                        const pct   = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        return (
                          <div key={item.label}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-slate-600 text-xs font-medium">{item.label}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.textColor}`}>
                                {item.count}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Total de ILPIs</span>
                        <span className="text-sm font-bold text-slate-900">{kpis?.total_empresas ?? 0}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-slate-900 font-semibold text-sm">Atividade recente</h3>
                  </div>
                  {activityLoading ? (
                    <div className="space-y-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex items-start space-x-3">
                          <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-3/4" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activity.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Nenhuma atividade registrada ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activity.map(act => {
                        const { Icon, iconClass } = getActivityMeta(act.tipo);
                        return (
                          <div key={act.id} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-all">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 leading-snug">{act.descricao}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {act.nome_instituicao && <span className="font-medium">{act.nome_instituicao} · </span>}
                                {formatRelativeTime(act.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ARR / MRR summary row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'ARR Estimado',  value: formatMoney(kpis ? kpis.arr_estimado : null),  sub: 'Receita anual recorrente', Icon: TrendingUp, iconClass: 'bg-blue-50 text-blue-600' },
                  { label: 'MRR Total',     value: formatMoney(kpis ? kpis.mrr_total : null),      sub: 'Receita mensal recorrente', Icon: DollarSign, iconClass: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Total usuários',value: kpis?.total_usuarios,  sub: 'Usuários cadastrados', Icon: Users, iconClass: 'bg-violet-50 text-violet-600' },
                  { label: 'Total ILPIs',   value: kpis?.total_empresas,  sub: 'Organizações na plataforma', Icon: Building2, iconClass: 'bg-amber-50 text-amber-600' },
                ].map(card => (
                  <div key={card.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.iconClass}`}>
                      <card.Icon className="h-4.5 w-4.5" />
                    </div>
                    {kpisLoading ? (
                      <Skeleton className="h-6 w-16 mb-1" />
                    ) : (
                      <p className="text-xl font-extrabold text-slate-900 mb-0.5">{card.value ?? '—'}</p>
                    )}
                    <p className="text-xs text-slate-500">{card.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─────────── TENANTS ─────────── */}
          {activeSection === 'tenants' && (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text" placeholder="Buscar por nome, cidade ou e-mail..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'todos',    label: 'Todos' },
                    { key: 'ativa',    label: 'Ativos' },
                    { key: 'em_trial', label: 'Trial' },
                    { key: 'bloqueada',label: 'Suspensos' },
                  ].map(f => (
                    <button
                      key={f.key} onClick={() => setStatusFilter(f.key)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        statusFilter === f.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setNovaIlpiOpen(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova ILPI</span>
                </button>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {empresasLoading ? 'Carregando...' : `${filteredEmpresas.length} cliente${filteredEmpresas.length !== 1 ? 's' : ''} encontrado${filteredEmpresas.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['ILPI', 'Cidade/UF', 'Plano', 'Residentes', 'Usuários', 'MRR', 'Status', 'Cliente desde', ''].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {empresasLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-slate-50">
                              <td className="px-5 py-4"><Skeleton className="h-4 w-36 mb-1" /><Skeleton className="h-3 w-28" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-8" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-8" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                            </tr>
                          ))
                        : filteredEmpresas.map(e => (
                            <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-slate-900">{e.nome_instituicao}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{e.email_comercial ?? '—'}</p>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600">
                                {[e.cidade, e.estado].filter(Boolean).join('/') || '—'}
                              </td>
                              <td className="px-5 py-4">{planBadge(e.plano_nome)}</td>
                              <td className="px-5 py-4 text-sm text-slate-600">{e.qtd_residentes}</td>
                              <td className="px-5 py-4 text-sm text-slate-600">{e.qtd_usuarios}</td>
                              <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                                {e.valor_mensal ? formatMoney(e.valor_mensal) : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-5 py-4">{statusBadge(e.status)}</td>
                              <td className="px-5 py-4 text-xs text-slate-400">{formatDate(e.created_at)}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => setSelectedTenant(e)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    title="Ver detalhes"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openEditStatus(e)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                    title="Editar status"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      }
                      {!empresasLoading && filteredEmpresas.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-5 py-12 text-center text-slate-400 text-sm">
                            Nenhum cliente encontrado com os filtros aplicados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─────────── BILLING ─────────── */}
          {activeSection === 'billing' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'MRR Total',      value: formatMoney(kpis?.mrr_total ?? null),      sub: 'Receita recorrente mensal', Icon: DollarSign, iconClass: 'bg-emerald-50 text-emerald-600' },
                  { label: 'ARR Estimado',   value: formatMoney(kpis?.arr_estimado ?? null),   sub: 'Projeção anual',           Icon: TrendingUp, iconClass: 'bg-blue-50 text-blue-600' },
                  { label: 'Assinantes ativos', value: kpis?.empresas_ativas, sub: 'Contratos em dia',       Icon: CheckCircle,iconClass: 'bg-violet-50 text-violet-600' },
                  { label: 'Em trial',       value: kpis?.empresas_trial,    sub: 'Período de avaliação',   Icon: Clock,      iconClass: 'bg-amber-50 text-amber-600' },
                ].map(card => (
                  <div key={card.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.iconClass}`}>
                      <card.Icon className="h-5 w-5" />
                    </div>
                    {kpisLoading ? (
                      <Skeleton className="h-7 w-20 mb-1" />
                    ) : (
                      <p className="text-2xl font-extrabold text-slate-900 mb-0.5">{card.value ?? '—'}</p>
                    )}
                    <p className="text-xs text-slate-500">{card.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Plan distribution */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-slate-900 font-semibold text-sm mb-5">Distribuição por plano</h3>
                  {billingLoading ? (
                    <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                  ) : !billing?.by_plan?.length ? (
                    <p className="text-slate-400 text-sm text-center py-4">Sem assinaturas ativas</p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const total = billing.by_plan.reduce((s, p) => s + p.count, 0) || 1;
                        const planColors: Record<string, string> = { enterprise: 'bg-violet-500', profissional: 'bg-blue-500', essencial: 'bg-slate-400' };
                        return billing.by_plan.map(plan => (
                          <div key={plan.plano_id}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-slate-700 text-xs font-medium">{plan.plano_nome}</span>
                              <span className="text-slate-400 text-xs">{plan.count} · {formatMoney(plan.mrr)}/mês</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${planColors[plan.plano_id] ?? 'bg-slate-400'}`}
                                style={{ width: `${Math.round((plan.count / total) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Subscriptions table */}
                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm lg:col-span-2">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-slate-900 font-semibold text-sm">Assinaturas</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['ILPI', 'Plano', 'MRR', 'Vencimento', 'Status'].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {billingLoading
                          ? Array.from({ length: 4 }).map((_, i) => (
                              <tr key={i} className="border-b border-slate-50">
                                <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                                <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                                <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-5 py-3"><Skeleton className="h-4 w-20" /></td>
                                <td className="px-5 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                              </tr>
                            ))
                          : (billing?.subscriptions ?? []).map((sub, i) => (
                              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                                <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{sub.nome_instituicao}</td>
                                <td className="px-5 py-3.5">{planBadge(sub.plano_nome)}</td>
                                <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600">
                                  {sub.status === 'em_trial' ? <span className="text-slate-400">Trial</span> : formatMoney(sub.valor_mensal)}
                                </td>
                                <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(sub.data_vencimento)}</td>
                                <td className="px-5 py-3.5">{statusBadge(sub.status)}</td>
                              </tr>
                            ))
                        }
                        {!billingLoading && (billing?.subscriptions ?? []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">
                              Nenhuma assinatura encontrada
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─────────── SYSTEM ─────────── */}
          {activeSection === 'system' && (
            <>
              {/* Connection status banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Todos os serviços operacionais</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Supabase Auth, Database, Storage — conexão ativa</p>
                </div>
              </div>

              {/* Access logs table */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-slate-900 font-semibold text-sm">Log de acessos recentes</h3>
                  <span className="text-xs text-slate-400">{logsLoading ? '...' : `${accessLogs.length} registros`}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Data/Hora', 'ILPI', 'Usuário', 'Perfil', 'Ação', 'IP'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logsLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="border-b border-slate-50">
                              {[24, 32, 28, 20, 24, 20].map((w, j) => (
                                <td key={j} className="px-5 py-3.5"><Skeleton className={`h-3.5 w-${w}`} /></td>
                              ))}
                            </tr>
                          ))
                        : accessLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                                Nenhum log de acesso encontrado
                              </td>
                            </tr>
                          )
                        : accessLogs.map(log => (
                            <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                              <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap font-mono">
                                {new Date(log.created_at).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-5 py-3.5 text-sm text-slate-600">{log.nome_instituicao ?? '—'}</td>
                              <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{log.user_name}</td>
                              <td className="px-5 py-3.5 text-xs text-slate-500">{log.role}</td>
                              <td className="px-5 py-3.5">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  log.action === 'Login' ? 'bg-emerald-50 text-emerald-700' :
                                  log.action === 'Logout' ? 'bg-slate-100 text-slate-600' :
                                  'bg-blue-50 text-blue-700'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{log.ip_address ?? '—'}</td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Company event log */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-slate-900 font-semibold text-sm mb-5">Eventos de empresas</h3>
                {activityLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-3 w-36 font-mono" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">Nenhum evento registrado</p>
                ) : (
                  <div className="space-y-0 font-mono text-xs divide-y divide-slate-50">
                    {activity.map(act => (
                      <div key={act.id} className="flex items-start space-x-4 py-2.5">
                        <span className="text-slate-400 flex-shrink-0 whitespace-nowrap">
                          {new Date(act.created_at).toLocaleString('pt-BR')}
                        </span>
                        <span className={`flex-shrink-0 font-bold uppercase text-xs ${
                          act.tipo.includes('bloqueada') || act.tipo.includes('recusado') || act.tipo.includes('cancelada')
                            ? 'text-rose-500'
                            : act.tipo.includes('reativada') || act.tipo.includes('aprovado') || act.tipo.includes('criada')
                              ? 'text-emerald-600'
                              : 'text-blue-500'
                        }`}>
                          [{act.tipo.replace(/_/g, ' ').toUpperCase()}]
                        </span>
                        <span className="text-slate-600 break-all">{act.descricao}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </main>
      </div>

      {/* ── Tenant Detail Modal ──────────────────────────────────────────── */}
      {selectedTenant && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) { setSelectedTenant(null); setDetailEditMode(false); } }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-8 pb-5">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTenant.nome_instituicao}</h2>
                  <p className="text-sm text-slate-400">
                    {[selectedTenant.cidade, selectedTenant.estado].filter(Boolean).join(' / ') || 'Localização não informada'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedTenant(null); setDetailEditMode(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-6">
              {/* KPI grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Plano',         value: <>{planBadge(selectedTenant.plano_nome)}</> },
                  { label: 'Status',        value: <>{statusBadge(selectedTenant.status)}</> },
                  { label: 'MRR',           value: selectedTenant.valor_mensal ? formatMoney(selectedTenant.valor_mensal) : 'Trial' },
                  { label: 'Residentes',    value: selectedTenant.qtd_residentes.toString() },
                  { label: 'Usuários',      value: selectedTenant.qtd_usuarios.toString() },
                  { label: 'Cliente desde', value: formatDate(selectedTenant.created_at) },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1.5">{item.label}</p>
                    <div className="text-sm font-semibold text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Dados cadastrais */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Dados cadastrais</h3>
                  {!detailEditMode && (
                    <button
                      onClick={() => openDetailEdit(selectedTenant)}
                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                {!detailEditMode ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      { label: 'Nome da instituição', value: selectedTenant.nome_instituicao },
                      { label: 'E-mail comercial',    value: selectedTenant.email_comercial ?? '—' },
                      { label: 'Cidade',              value: selectedTenant.cidade   ?? '—' },
                      { label: 'Estado (UF)',         value: selectedTenant.estado   ?? '—' },
                      { label: 'CNPJ',                value: selectedTenant.cnpj     ?? '—' },
                      { label: 'Telefone',            value: selectedTenant.telefone ?? '—' },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-slate-400">{f.label}</p>
                        <p className="text-sm text-slate-700 mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { key: 'nome_instituicao', label: 'Nome da instituição', type: 'text' },
                        { key: 'email_comercial',  label: 'E-mail comercial',    type: 'email' },
                        { key: 'cidade',           label: 'Cidade',              type: 'text' },
                        { key: 'estado',           label: 'Estado (UF)',         type: 'text', maxLength: 2 },
                        { key: 'cnpj',             label: 'CNPJ',               type: 'text' },
                        { key: 'telefone',         label: 'Telefone',            type: 'text' },
                      ] as Array<{ key: keyof typeof detailForm; label: string; type: string; maxLength?: number }>).map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                          <input
                            type={f.type}
                            value={detailForm[f.key]}
                            maxLength={f.maxLength}
                            onChange={e => {
                              const val = f.key === 'estado' ? e.target.value.toUpperCase() : e.target.value;
                              setDetailForm(prev => ({ ...prev, [f.key]: val }));
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDetails}
                        disabled={detailSaving}
                        className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{detailSaving ? 'Salvando...' : 'Salvar alterações'}</span>
                      </button>
                      <button
                        onClick={() => setDetailEditMode(false)}
                        disabled={detailSaving}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-medium transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Gestão de assinatura */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Gestão de assinatura</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openAssinaturaAction(selectedTenant, 'change_plan')}
                    className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span>Trocar plano</span>
                  </button>
                  <button
                    onClick={() => openAssinaturaAction(selectedTenant, 'extend_trial')}
                    className="flex items-center space-x-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Estender trial</span>
                  </button>
                  <button
                    onClick={() => openAssinaturaAction(selectedTenant, 'manual_payment')}
                    className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Pag. manual</span>
                  </button>
                  <button
                    onClick={() => openAssinaturaAction(selectedTenant, 'reactivate')}
                    className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reativar</span>
                  </button>
                  <button
                    onClick={() => openAssinaturaAction(selectedTenant, 'cancel')}
                    className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancelar assinatura</span>
                  </button>
                </div>
              </div>

              {/* Pagamento / Gateway */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Pagamento / Gateway</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Gateway',              value: selectedTenant.gateway_pagamento ?? '—' },
                    { label: 'Forma de pagamento',   value: selectedTenant.forma_pagamento ?? '—' },
                    { label: 'Status da assinatura', value: selectedTenant.subscription_status ?? '—' },
                    { label: 'Vencimento',           value: formatDate(selectedTenant.data_vencimento) },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-slate-400">{f.label}</p>
                      <p className="text-sm text-slate-700 mt-0.5 capitalize">{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Customer ID',     value: selectedTenant.gateway_customer_id },
                    { label: 'Subscription ID', value: selectedTenant.gateway_subscription_id },
                    { label: 'Payment ID',      value: selectedTenant.gateway_payment_id },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-slate-400">{f.label}</p>
                      <p className="text-xs font-mono text-slate-600 mt-0.5 break-all">{f.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditStatus(selectedTenant)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  <Edit className="h-4 w-4" />
                  <span>Alterar status</span>
                </button>
                {selectedTenant.email_comercial && (
                  <a
                    href={`mailto:${selectedTenant.email_comercial}`}
                    className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Contato</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assinatura Action Modal ──────────────────────────────────────── */}
      {assinaturaModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget && !assinaturaLoading) setAssinaturaModal(null); }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-8"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-lg font-bold ${assinaturaModal.acao === 'cancel' ? 'text-rose-700' : 'text-slate-900'}`}>
                  {assinaturaModal.acao === 'change_plan'    && 'Trocar plano'}
                  {assinaturaModal.acao === 'extend_trial'   && 'Estender trial'}
                  {assinaturaModal.acao === 'manual_payment' && 'Registrar pagamento'}
                  {assinaturaModal.acao === 'cancel'         && 'Cancelar assinatura'}
                  {assinaturaModal.acao === 'reactivate'     && 'Reativar assinatura'}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">{assinaturaModal.tenant.nome_instituicao}</p>
              </div>
              <button
                onClick={() => !assinaturaLoading && setAssinaturaModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* change_plan */}
              {assinaturaModal.acao === 'change_plan' && (
                <>
                  <div className="text-xs text-slate-500 flex items-center space-x-2">
                    <span>Plano atual:</span>
                    {planBadge(assinaturaModal.tenant.plano_nome)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Novo plano</label>
                    <div className="space-y-2">
                      {PLANOS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setAssinaturaForm(f => ({ ...f, plano_id: p.id, plano_nome: p.nome, valor_mensal: p.valor }))}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                            assinaturaForm.plano_id === p.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="text-sm font-medium text-slate-800">{p.nome}</span>
                          <span className="text-sm text-slate-500">
                            {p.valor > 0 ? `R$ ${p.valor}/mês` : 'Valor customizado'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {assinaturaForm.plano_id && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor mensal (R$)</label>
                      <input
                        type="number" min={0}
                        value={assinaturaForm.valor_mensal}
                        onChange={e => setAssinaturaForm(f => ({ ...f, valor_mensal: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </>
              )}

              {/* extend_trial */}
              {assinaturaModal.acao === 'extend_trial' && (
                <>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500">Vencimento atual</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {formatDate(assinaturaModal.tenant.data_vencimento)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Dias de extensão</label>
                    <input
                      type="number" min={1} max={365}
                      value={assinaturaForm.dias_extensao}
                      onChange={e => setAssinaturaForm(f => ({ ...f, dias_extensao: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* manual_payment */}
              {assinaturaModal.acao === 'manual_payment' && (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-emerald-700">Marca a assinatura como <strong>ativa</strong> e renova o vencimento em 30 dias.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Referência / observação</label>
                    <input
                      type="text"
                      value={assinaturaForm.motivo}
                      onChange={e => setAssinaturaForm(f => ({ ...f, motivo: e.target.value }))}
                      placeholder="Ex: Pix recebido em 18/06/2026"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* cancel */}
              {assinaturaModal.acao === 'cancel' && (
                <>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-rose-700 font-medium">Atenção: cancela a assinatura e bloqueia o acesso da ILPI.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo (opcional)</label>
                    <textarea
                      value={assinaturaForm.motivo}
                      onChange={e => setAssinaturaForm(f => ({ ...f, motivo: e.target.value }))}
                      placeholder="Ex: Inadimplência, solicitação do cliente..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </>
              )}

              {/* reactivate */}
              {assinaturaModal.acao === 'reactivate' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-emerald-700">A assinatura será reativada com status <strong>ativa</strong> e vencimento em 30 dias.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAssinaturaAction}
                disabled={assinaturaLoading || (assinaturaModal.acao === 'change_plan' && !assinaturaForm.plano_id)}
                className={`flex-1 font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-60 ${
                  assinaturaModal.acao === 'cancel'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {assinaturaLoading ? 'Processando...' :
                  assinaturaModal.acao === 'change_plan'    ? 'Confirmar troca' :
                  assinaturaModal.acao === 'extend_trial'   ? 'Confirmar extensão' :
                  assinaturaModal.acao === 'manual_payment' ? 'Confirmar pagamento' :
                  assinaturaModal.acao === 'cancel'         ? 'Cancelar assinatura' :
                  'Reativar assinatura'
                }
              </button>
              <button
                onClick={() => !assinaturaLoading && setAssinaturaModal(null)}
                disabled={assinaturaLoading}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-medium transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nova ILPI Modal ─────────────────────────────────────────────── */}
      {novaIlpiOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget && !novaIlpiLoading) setNovaIlpiOpen(false); }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="flex items-center justify-between p-8 pb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Nova ILPI</h2>
                  <p className="text-sm text-slate-400">Cadastrar nova instituição</p>
                </div>
              </div>
              <button
                onClick={() => !novaIlpiLoading && setNovaIlpiOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-5">
              {/* Dados da instituição */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dados da instituição</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da instituição <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={novaIlpiForm.nome_instituicao}
                      onChange={e => setNovaIlpiForm(f => ({ ...f, nome_instituicao: e.target.value }))}
                      placeholder="Ex: Recanto dos Anciãos"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail comercial</label>
                      <input
                        type="email"
                        value={novaIlpiForm.email_comercial}
                        onChange={e => setNovaIlpiForm(f => ({ ...f, email_comercial: e.target.value }))}
                        placeholder="contato@ilpi.com.br"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
                      <input
                        type="text"
                        value={novaIlpiForm.telefone}
                        onChange={e => setNovaIlpiForm(f => ({ ...f, telefone: e.target.value }))}
                        placeholder="(00) 90000-0000"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Cidade</label>
                      <input
                        type="text"
                        value={novaIlpiForm.cidade}
                        onChange={e => setNovaIlpiForm(f => ({ ...f, cidade: e.target.value }))}
                        placeholder="Belo Horizonte"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado (UF)</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={novaIlpiForm.estado}
                        onChange={e => setNovaIlpiForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))}
                        placeholder="MG"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ</label>
                      <input
                        type="text"
                        value={novaIlpiForm.cnpj}
                        onChange={e => setNovaIlpiForm(f => ({ ...f, cnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Plano */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Plano de assinatura</h3>
                <div className="space-y-2">
                  {PLANOS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setNovaIlpiForm(f => ({ ...f, plano_id: p.id, plano_nome: p.nome, valor_mensal: p.valor }))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        novaIlpiForm.plano_id === p.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-800">{p.nome}</span>
                      <span className="text-sm text-slate-500">
                        {p.valor > 0 ? `R$ ${p.valor}/mês` : 'Valor customizado'}
                      </span>
                    </button>
                  ))}
                </div>
                {novaIlpiForm.plano_id === 'enterprise' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor mensal (R$)</label>
                    <input
                      type="number" min={0}
                      value={novaIlpiForm.valor_mensal}
                      onChange={e => setNovaIlpiForm(f => ({ ...f, valor_mensal: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Status inicial */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status inicial</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'ativa'    as const, label: 'Ativa',    desc: 'Acesso imediato' },
                    { key: 'em_trial' as const, label: 'Trial',    desc: '14 dias grátis' },
                    { key: 'pendente' as const, label: 'Pendente', desc: 'Aguardando pagamento' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setNovaIlpiForm(f => ({ ...f, status_inicial: opt.key }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        novaIlpiForm.status_inicial === opt.key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {novaIlpiError && (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <p className="text-sm text-rose-600">{novaIlpiError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleCreateEmpresa}
                  disabled={novaIlpiLoading || !novaIlpiForm.nome_instituicao.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                >
                  {novaIlpiLoading ? (
                    <span>Criando...</span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Criar ILPI</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => !novaIlpiLoading && setNovaIlpiOpen(false)}
                  disabled={novaIlpiLoading}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Status Modal ────────────────────────────────────────────── */}
      {editingTenant && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget && !editLoading) setEditingTenant(null); }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-8"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Alterar status</h2>
                <p className="text-sm text-slate-400 mt-0.5">{editingTenant.nome_instituicao}</p>
              </div>
              <button
                onClick={() => !editLoading && setEditingTenant(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Novo status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'ativa',     label: 'Ativa',     desc: 'Acesso liberado', cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                    { key: 'pendente',  label: 'Pendente',  desc: 'Aguardando ação',  cls: 'border-amber-300 bg-amber-50 text-amber-700' },
                    { key: 'bloqueada', label: 'Bloqueada', desc: 'Acesso suspenso',  cls: 'border-rose-300 bg-rose-50 text-rose-700' },
                    { key: 'cancelada', label: 'Cancelada', desc: 'Contrato encerrado', cls: 'border-slate-300 bg-slate-50 text-slate-600' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setEditNovoStatus(opt.key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        editNovoStatus === opt.key
                          ? `${opt.cls} border-opacity-100`
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo (opcional)</label>
                <textarea
                  value={editMotivo}
                  onChange={e => setEditMotivo(e.target.value)}
                  placeholder="Ex: Pagamento em atraso há 30 dias..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateStatus}
                disabled={editLoading || !editNovoStatus}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm"
              >
                {editLoading ? 'Salvando...' : 'Confirmar alteração'}
              </button>
              <button
                onClick={() => !editLoading && setEditingTenant(null)}
                disabled={editLoading}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;
