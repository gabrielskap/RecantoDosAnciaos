import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse, Users, DollarSign, Package, BarChart3, Calendar,
  Stethoscope, Utensils, Brain, Check, Star, Menu, X, ChevronRight,
  AlertCircle, Mail, Lock, ArrowRight, Shield, Zap, Building2,
  Activity, ClipboardList, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getConteudoSite, getImagensSite, getPlanosPublicos, type ImagemSite } from '../services/siteContentService';
import type { PlanoView } from '../types';

// ─── Conteúdo padrão (fallback enquanto carrega do banco / caso a seção não exista) ──
const DEFAULT_NAV = { marca: 'RecantoCare' };

const DEFAULT_HERO = {
  eyebrow: 'Plataforma #1 para ILPIs no Brasil',
  titulo_prefixo: 'A gestão completa para o seu',
  titulo_destaque: 'Lar de Idosos',
  subtitulo: 'Controle residentes, saúde, finanças, equipe e estoque em uma única plataforma. Tecnologia de ponta a serviço do cuidado humano.',
  cta_primario: 'Saiba mais',
  cta_secundario: 'Ver funcionalidades',
  stats: [
    { valor: '500+', label: 'ILPIs atendidas' },
    { valor: '15.000+', label: 'Residentes gerenciados' },
    { valor: '99.9%', label: 'Uptime garantido' },
  ],
};

const DEFAULT_DEMO_BAR = { texto: 'Veja o RecantoCare em ação' };

const DEFAULT_SOBRE = {
  titulo: 'O que é o RecantoCare?',
  paragrafo1: 'O RecantoCare é uma plataforma SaaS completa que centraliza toda a gestão de Instituições de Longa Permanência para Idosos (ILPIs). Da admissão do residente ao faturamento mensal, passando pelo controle de saúde e equipe — tudo em um só lugar.',
  paragrafo2: 'Desenvolvida especificamente para a realidade das ILPIs brasileiras, com conformidade com a RDC 283/2005 da ANVISA e suporte à documentação exigida pelos órgãos fiscalizadores.',
  destaques: ['Conformidade ANVISA', 'Dados em tempo real', 'Prontuário digital', 'Multi-unidade'],
  reconhecimento_label: 'Reconhecido pelo setor',
  badges: ['Melhor Plataforma ILPI 2024', 'Inovação em Saúde', 'Escolha do Gestor', 'Suporte 5 Estrelas'],
  stat_tiles: [
    { valor: '98%', label: 'de satisfação dos clientes' },
    { valor: '4h', label: 'economizadas por dia em média' },
    { valor: '100%', label: 'na nuvem, sem instalação' },
    { valor: '24/7', label: 'disponibilidade da plataforma' },
  ],
};

const DEFAULT_FEATURES_TABS = {
  titulo: 'Tudo que sua ILPI precisa',
  subtitulo: 'Módulos integrados para gestão completa, do cuidado ao faturamento.',
  tab_gestores_label: 'Gestores Individuais',
  tab_grupos_label: 'Grupos & Redes',
  gestores_titulo: 'Para gestores de ILPIs',
  gestores_subtitulo: 'Gerencie cada aspecto da sua instituição com precisão e facilidade, sem precisar de vários sistemas.',
  gestores_cta: 'Começar agora',
  gestores_features: [
    'Prontuário eletrônico completo para cada residente',
    'Checklists diários de cuidado e saúde',
    'Controle financeiro de contratos e mensalidades',
    'Gestão de medicamentos com alertas',
    'Relatórios para vigilância sanitária',
    'Portal exclusivo para familiares',
  ],
  grupos_titulo: 'Para grupos e redes de ILPIs',
  grupos_subtitulo: 'Gerencie múltiplas unidades com visão consolidada e controle centralizado.',
  grupos_cta: 'Falar com especialista',
  grupos_features: [
    'Visão consolidada de múltiplas unidades',
    'Dashboard de KPIs por filial',
    'Controle centralizado de equipe',
    'Relatórios comparativos entre unidades',
    'Gestão financeira multi-empresa',
    'Onboarding e suporte dedicado',
  ],
};

interface FeatureCardContent { slug: string; title: string; desc: string }

const DEFAULT_FEATURES_CARDS: { cards: FeatureCardContent[] } = {
  cards: [
    { slug: 'residentes', title: 'Gestão de Residentes', desc: 'Prontuários completos com histórico de saúde, fotos, documentos e acompanhamento individualizado para cada residente.' },
    { slug: 'saude', title: 'Saúde & Clínica', desc: 'Sinais vitais, checklists diários de cuidado, controle de medicações e planos assistenciais personalizados.' },
    { slug: 'financeiro', title: 'Financeiro', desc: 'Contratos, mensalidades, receitas e despesas. Relatórios financeiros e controle de inadimplência.' },
    { slug: 'estoque', title: 'Estoque', desc: 'Controle de medicamentos e suprimentos com alertas automáticos de estoque mínimo e histórico.' },
    { slug: 'equipe', title: 'Equipe & RH', desc: 'Gestão de funcionários, escalas de trabalho, treinamentos e registros de acesso.' },
    { slug: 'relatorios', title: 'Relatórios & BI', desc: 'Dashboards com indicadores de ocupação, saúde, financeiro e performance em tempo real.' },
    { slug: 'nutricao', title: 'Nutrição', desc: 'Planos dietéticos individuais, cardápios nutricionais e acompanhamento da alimentação.' },
    { slug: 'agenda', title: 'Agenda & Eventos', desc: 'Calendário integrado para atividades, consultas médicas, visitas e eventos institucionais.' },
    { slug: 'ia', title: 'IA Assistente', desc: 'Assistente inteligente para resumos clínicos, análise de dados e insights automáticos sobre seus residentes.' },
  ],
};

const FEATURE_ICONS: Record<string, React.ElementType> = {
  residentes: Users, saude: Stethoscope, financeiro: DollarSign, estoque: Package,
  equipe: Users, relatorios: BarChart3, nutricao: Utensils, agenda: Calendar, ia: Brain,
};
const FEATURE_COLORS: Record<string, string> = {
  residentes: 'text-blue-600 bg-blue-50', saude: 'text-rose-600 bg-rose-50', financeiro: 'text-emerald-600 bg-emerald-50',
  estoque: 'text-amber-600 bg-amber-50', equipe: 'text-purple-600 bg-purple-50', relatorios: 'text-cyan-600 bg-cyan-50',
  nutricao: 'text-orange-600 bg-orange-50', agenda: 'text-indigo-600 bg-indigo-50', ia: 'text-violet-600 bg-violet-50',
};

const DEFAULT_PRICING_HEADER = {
  titulo: 'Preços simples e transparentes',
  subtitulo: 'Escolha o plano ideal para o tamanho da sua ILPI. Sem taxas ocultas.',
};

interface TestimonialContent {
  name: string; role: string; institution: string; text: string;
  rating: number; avatar: string; avatarColor: string;
}

const DEFAULT_TESTIMONIALS: { titulo: string; subtitulo: string; itens: TestimonialContent[] } = {
  titulo: 'Quem usa, recomenda',
  subtitulo: 'Gestores e equipes de ILPIs em todo o Brasil confiam no RecantoCare.',
  itens: [
    { name: 'Maria Silva', role: 'Diretora Administrativa', institution: 'Lar Esperança — São Paulo, SP', text: 'O RecantoCare transformou nossa operação. Antes perdíamos horas com planilhas. Hoje tudo é automatizado e a qualidade do cuidado melhorou visivelmente.', rating: 5, avatar: 'MS', avatarColor: 'bg-pink-500' },
    { name: 'Dr. Carlos Mendes', role: 'Médico Coordenador', institution: 'Residencial Vida Nova — Rio de Janeiro, RJ', text: 'O controle de medicações e sinais vitais é excepcional. Consigo acompanhar todos os residentes em tempo real de qualquer lugar. Indispensável.', rating: 5, avatar: 'CM', avatarColor: 'bg-blue-600' },
    { name: 'Ana Rodrigues', role: 'Enfermeira Chefe', institution: 'Casa de Repouso Harmonia — Belo Horizonte, MG', text: 'Os checklists diários são muito intuitivos. Nossa equipe adotou em dias e a organização dos cuidados ficou muito melhor. Recomendo a todos.', rating: 5, avatar: 'AR', avatarColor: 'bg-emerald-600' },
  ],
};

const DEFAULT_CTA_FINAL = {
  titulo: 'Pronto para transformar sua ILPI?',
  subtitulo: 'Junte-se a mais de 500 ILPIs que já modernizaram sua gestão com o RecantoCare.',
  cta_primario: 'Assinar agora',
  cta_secundario: 'Já tenho conta',
  rodape: 'Ativação imediata · Cancele quando quiser · Suporte humano',
};

const DEFAULT_FOOTER = {
  tagline: 'A plataforma líder em gestão de ILPIs no Brasil.',
  copyright: '© 2026 RecantoCare. Todos os direitos reservados.',
  lgpd: 'Dados protegidos conforme LGPD',
};

const PLANO_STYLE: Record<string, { color: string; ctaStyle: string }> = {
  essencial:    { color: 'border-slate-200 hover:border-blue-300', ctaStyle: 'bg-slate-900 text-white hover:bg-slate-700' },
  profissional: { color: 'border-blue-600 ring-2 ring-blue-600',   ctaStyle: 'bg-blue-600 text-white hover:bg-blue-700' },
  enterprise:   { color: 'border-slate-200 hover:border-blue-300', ctaStyle: 'bg-slate-900 text-white hover:bg-slate-700' },
};

const money = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

const DEFAULT_PLANOS: PlanoView[] = [
  {
    id: 'essencial', nome: 'Essencial', precoMensal: 399, precoMensalAnual: 299, precoAnualTotal: 3588,
    selfService: true, desc: 'Ideal para ILPIs com até 30 residentes', popular: false, badgeLabel: null, ctaLabel: 'Assinar agora',
    features: ['Até 30 residentes', '5 usuários', 'Gestão de residentes', 'Saúde & checklists', 'Financeiro básico', 'Estoque', 'Suporte por e-mail'],
    maxResidentes: 30, maxUsuarios: 5,
  },
  {
    id: 'profissional', nome: 'Profissional', precoMensal: 799, precoMensalAnual: 599, precoAnualTotal: 7188,
    selfService: true, desc: 'Para ILPIs de médio porte com mais recursos', popular: true, badgeLabel: 'Mais popular', ctaLabel: 'Assinar agora',
    features: ['Até 100 residentes', '20 usuários', 'Todos os módulos', 'Relatórios avançados', 'IA Assistente', 'Portal do familiar', 'Suporte prioritário', 'API de integração'],
    maxResidentes: 100, maxUsuarios: 20,
  },
  {
    id: 'enterprise', nome: 'Enterprise', precoMensal: 0, precoMensalAnual: 0, precoAnualTotal: 0,
    selfService: false, desc: 'Para redes e grupos com múltiplas unidades', popular: false, badgeLabel: null, ctaLabel: 'Falar com vendas',
    features: ['Residentes ilimitados', 'Usuários ilimitados', 'Múltiplas unidades', 'Dashboard consolidado', 'Onboarding dedicado', 'SLA garantido 99.9%', 'Integração customizada', 'Gerente de sucesso'],
    maxResidentes: null, maxUsuarios: null,
  },
];

const LandingPage: React.FC = () => {
  const { login, resetPassword } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(
    window.location.pathname === '/login'
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gestores' | 'grupos'>('gestores');
  const [pricingPeriod, setPricingPeriod] = useState<'mensal' | 'anual'>('mensal');
  const [demoEmail, setDemoEmail] = useState('');
  const loginModalMouseDown = useRef(false);

  const [conteudo, setConteudo] = useState<Record<string, any>>({});
  const [imagens, setImagens] = useState<Record<string, ImagemSite>>({});
  const [planosDb, setPlanosDb] = useState<PlanoView[]>(DEFAULT_PLANOS);

  useEffect(() => {
    document.title = showLoginModal
      ? 'Entrar | Recanto dos Anciãos'
      : 'Recanto dos Anciãos – Sistema de Gestão para ILPIs';
  }, [showLoginModal]);

  useEffect(() => {
    (async () => {
      const [conteudoSite, imagensSite, planos] = await Promise.all([
        getConteudoSite(),
        getImagensSite(),
        getPlanosPublicos(),
      ]);
      setConteudo(conteudoSite);
      setImagens(imagensSite);
      if (planos) setPlanosDb(planos);
    })();
  }, []);

  const nav       = { ...DEFAULT_NAV, ...(conteudo.nav ?? {}) };
  const hero      = { ...DEFAULT_HERO, ...(conteudo.hero ?? {}) };
  const demoBar   = { ...DEFAULT_DEMO_BAR, ...(conteudo.demo_bar ?? {}) };
  const sobre     = { ...DEFAULT_SOBRE, ...(conteudo.sobre ?? {}) };
  const featTabs  = { ...DEFAULT_FEATURES_TABS, ...(conteudo.features_tabs ?? {}) };
  const featCards: FeatureCardContent[] = conteudo.features_cards?.cards ?? DEFAULT_FEATURES_CARDS.cards;
  const pricingHeader = { ...DEFAULT_PRICING_HEADER, ...(conteudo.pricing_header ?? {}) };
  const testimonialsContent = { ...DEFAULT_TESTIMONIALS, ...(conteudo.testimonials ?? {}) };
  const ctaFinal  = { ...DEFAULT_CTA_FINAL, ...(conteudo.cta_final ?? {}) };
  const footer    = { ...DEFAULT_FOOTER, ...(conteudo.footer ?? {}) };
  const logoUrl      = imagens.logo?.url || null;
  const heroImagemUrl = imagens.hero_imagem?.url || null;

  const openResetMode = () => {
    setResetEmail(loginEmail);
    setResetError('');
    setResetSuccess(false);
    setResetMode(true);
  };

  const closeResetMode = () => {
    setResetMode(false);
    setResetEmail('');
    setResetError('');
    setResetSuccess(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setResetLoading(false);
    }
  };

  const navigateToDemo = () => {
    window.history.pushState(null, '', '/demo');
    window.location.reload();
  };

  const navigateToFeatures = () => {
    window.history.pushState(null, '', '/recursos');
    window.location.reload();
  };

  const navigateToFeature = (slug: string) => {
    window.history.pushState(null, '', `/recursos/${slug}`);
    window.location.reload();
  };

  const navigateToCheckout = (planoId?: string, periodo?: string) => {
    const params = new URLSearchParams();
    if (planoId) params.set('plano', planoId);
    if (periodo) params.set('periodo', periodo);
    const qs = params.toString();
    window.history.pushState(null, '', `/assinar${qs ? '?' + qs : ''}`);
    window.location.reload();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      let msg = err.message || 'Erro ao fazer login.';
      if (msg.includes('Invalid login credentials') || msg.toLowerCase().includes('invalid')) {
        msg = 'E-mail ou senha incorretos.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Confirme seu e-mail antes de acessar.';
      }
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const features = featCards.map(f => ({
    ...f,
    icon: FEATURE_ICONS[f.slug] ?? Users,
    color: FEATURE_COLORS[f.slug] ?? 'text-blue-600 bg-blue-50',
  }));

  const individualFeatures: string[] = featTabs.gestores_features;
  const groupFeatures: string[] = featTabs.grupos_features;

  const plans = planosDb.map(p => ({
    name: p.nome,
    planoId: p.id,
    priceMonthly: p.precoMensal > 0 ? money(p.precoMensal) : 'Sob consulta',
    priceAnnual: p.precoMensalAnual > 0 ? money(p.precoMensalAnual) : 'Sob consulta',
    desc: p.desc,
    color: PLANO_STYLE[p.id]?.color ?? 'border-slate-200 hover:border-blue-300',
    badge: p.badgeLabel ?? null,
    cta: p.ctaLabel ?? (p.selfService ? 'Assinar agora' : 'Falar com vendas'),
    ctaStyle: PLANO_STYLE[p.id]?.ctaStyle ?? 'bg-slate-900 text-white hover:bg-slate-700',
    features: p.features,
  }));

  const testimonials: TestimonialContent[] = testimonialsContent.itens;

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ——— NAV ——— */}
      <nav className="bg-[#1e40af] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              {logoUrl ? (
                <img src={logoUrl} alt={imagens.logo?.alt_text || nav.marca} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <HeartPulse className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="text-white font-bold text-xl tracking-tight">{nav.marca}</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-blue-100 hover:text-white text-sm font-medium transition-colors">Funcionalidades</a>
              <a href="#pricing" className="text-blue-100 hover:text-white text-sm font-medium transition-colors">Preços</a>
              <a href="#testimonials" className="text-blue-100 hover:text-white text-sm font-medium transition-colors">Depoimentos</a>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-white border border-white/40 hover:border-white hover:bg-white/10 text-sm font-medium px-4 py-2 rounded-lg transition-all"
              >
                Entrar
              </button>
              <button
                onClick={() => navigateToCheckout()}
                className="text-white border border-white/40 hover:border-white hover:bg-white/10 text-sm font-medium px-4 py-2 rounded-lg transition-all"
              >
                Quero Assinar
              </button>
              <button
                onClick={navigateToFeatures}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow"
              >
                Saiba mais
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-blue-900 border-t border-blue-700 px-4 py-4 space-y-3">
            <a href="#features" className="block text-blue-100 text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
            <a href="#pricing" className="block text-blue-100 text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Preços</a>
            <a href="#testimonials" className="block text-blue-100 text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Depoimentos</a>
            <button
              onClick={() => { setMobileMenuOpen(false); navigateToCheckout(); }}
              className="w-full bg-white text-blue-700 font-semibold py-3 rounded-lg text-sm mt-2 border border-blue-200"
            >
              Quero Assinar
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigateToFeatures(); }}
              className="w-full bg-amber-400 text-slate-900 font-semibold py-3 rounded-lg text-sm mt-2"
            >
              Saiba mais
            </button>
          </div>
        )}
      </nav>

      {/* ——— HERO ——— */}
      <section className="bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] text-white pt-20 pb-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                <Zap className="h-4 w-4 text-amber-300" />
                <span className="text-sm text-blue-100 font-medium">{hero.eyebrow}</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
                {hero.titulo_prefixo}{' '}
                <span className="text-amber-300">{hero.titulo_destaque}</span>
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed mb-8 max-w-xl">
                {hero.subtitulo}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={navigateToFeatures}
                  className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {hero.cta_primario}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center border-2 border-white/40 hover:border-white text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all hover:bg-white/10"
                >
                  {hero.cta_secundario}
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-6">
                {hero.stats.map((stat: { valor: string; label: string }) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-extrabold text-white">{stat.valor}</p>
                    <p className="text-sm text-blue-200 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero illustration / dashboard preview */}
            {heroImagemUrl ? (
              <div className="hidden lg:block">
                <img
                  src={heroImagemUrl}
                  alt={imagens.hero_imagem?.alt_text || hero.titulo_destaque}
                  className="rounded-2xl shadow-2xl w-full object-cover"
                />
              </div>
            ) : (
              <div className="relative hidden lg:block">
                <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-6 shadow-2xl">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    <span className="ml-2 text-blue-200 text-xs">{nav.marca} — Dashboard</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Residentes', value: '42', icon: Users, color: 'bg-blue-500/30 text-blue-100' },
                      { label: 'Ocupação', value: '94%', icon: Activity, color: 'bg-emerald-500/30 text-emerald-100' },
                      { label: 'Receita/mês', value: 'R$ 84k', icon: DollarSign, color: 'bg-amber-500/30 text-amber-100' },
                    ].map(card => (
                      <div key={card.label} className={`${card.color} rounded-xl p-3`}>
                        <card.icon className="h-5 w-5 mb-2 opacity-80" />
                        <p className="text-lg font-bold">{card.value}</p>
                        <p className="text-xs opacity-70">{card.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {['Maria Santos — Quarto 102 ✓', 'José Oliveira — Medicação pendente', 'Ana Lima — Sinal vital registrado'].map((item, i) => (
                      <div key={i} className="bg-white/10 rounded-lg px-3 py-2 text-xs text-blue-100 flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-white/10 rounded-xl p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="h-4 w-4 text-violet-300" />
                      <span className="text-xs text-blue-200 font-medium">IA Assistente</span>
                    </div>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      "3 residentes precisam de atenção especial hoje. Sugiro revisar o plano de cuidados da Sra. Ana Lima."
                    </p>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-amber-400 rounded-2xl p-4 shadow-xl">
                  <Shield className="h-8 w-8 text-slate-900" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ——— DEMO INPUT BAR ——— */}
      <section className="bg-white py-10 px-4 border-b border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-500 text-sm font-medium mb-4">{demoBar.texto}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Informe seu e-mail corporativo..."
              value={demoEmail}
              onChange={e => setDemoEmail(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => navigateToCheckout()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-sm whitespace-nowrap shadow"
            >
              Quero assinar
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">Ativação imediata após a confirmação do pagamento. Cancele quando quiser.</p>
        </div>
      </section>

      {/* ——— O QUE É ——— */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight">{sobre.titulo}</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {sobre.paragrafo1}
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {sobre.paragrafo2}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {sobre.destaques.map((label: string, i: number) => {
                  const Icon = [Shield, Activity, ClipboardList, Building2][i % 4];
                  return (
                    <div key={label} className="flex items-center space-x-3 bg-slate-50 rounded-xl p-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              {/* Award badges inspired by Sniply's G2 badges */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6 border border-slate-100">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{sobre.reconhecimento_label}</p>
                <div className="flex flex-wrap gap-3">
                  {sobre.badges.map((badge: string) => (
                    <div key={badge} className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                      <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
                        <Star className="h-4 w-4 text-slate-900 fill-slate-900" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{badge}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {sobre.stat_tiles.map((tile: { valor: string; label: string }, i: number) => {
                  const tileStyle = [
                    'bg-blue-600 text-white',
                    'bg-emerald-600 text-white',
                    'bg-amber-400 text-slate-900',
                    'bg-slate-900 text-white',
                  ][i % 4];
                  const labelStyle = [
                    'text-blue-200', 'text-emerald-200', 'text-amber-800', 'text-slate-400',
                  ][i % 4];
                  return (
                    <div key={tile.label} className={`${tileStyle} rounded-2xl p-6`}>
                      <p className="text-4xl font-extrabold">{tile.valor}</p>
                      <p className={`${labelStyle} text-sm mt-1`}>{tile.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— FEATURES ——— */}
      <section id="features" className="bg-slate-50 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">{featTabs.titulo}</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">{featTabs.subtitulo}</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 flex">
              {[
                { key: 'gestores', label: featTabs.tab_gestores_label },
                { key: 'grupos', label: featTabs.tab_grupos_label },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'gestores' | 'grupos')}
                  className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'gestores' && (
            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{featTabs.gestores_titulo}</h3>
                <p className="text-slate-500 mb-8">{featTabs.gestores_subtitulo}</p>
                <ul className="space-y-3">
                  {individualFeatures.map(feat => (
                    <li key={feat} className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-slate-700 text-sm">{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigateToCheckout()}
                  className="mt-8 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm"
                >
                  {featTabs.gestores_cta}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <HeartPulse className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Maria Santos</p>
                    <p className="text-xs text-slate-400">Quarto 102 · Cuidado Alto · 78 anos</p>
                  </div>
                  <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded-full">Ativo</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'PA', value: '120/80', unit: 'mmHg' },
                    { label: 'FC', value: '72', unit: 'bpm' },
                    { label: 'SpO₂', value: '97', unit: '%' },
                  ].map(v => (
                    <div key={v.label} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">{v.label}</p>
                      <p className="text-lg font-bold text-slate-800">{v.value}</p>
                      <p className="text-xs text-slate-400">{v.unit}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Banho e higiene', done: true },
                    { label: 'Medicação 08h — Losartana 50mg', done: true },
                    { label: 'Fisioterapia 14h', done: false },
                  ].map(task => (
                    <div key={task.label} className="flex items-center space-x-2 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${task.done ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        {task.done ? <Check className="h-3 w-3 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                      </div>
                      <span className={task.done ? 'text-slate-500 line-through' : 'text-slate-700'}>{task.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grupos' && (
            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{featTabs.grupos_titulo}</h3>
                <p className="text-slate-500 mb-8">{featTabs.grupos_subtitulo}</p>
                <ul className="space-y-3">
                  {groupFeatures.map(feat => (
                    <li key={feat} className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-slate-700 text-sm">{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={navigateToDemo}
                  className="mt-8 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm"
                >
                  {featTabs.grupos_cta}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                <p className="text-sm font-semibold text-slate-900 mb-4">Dashboard Consolidado</p>
                <div className="space-y-3">
                  {[
                    { name: 'Unidade Centro', residents: 48, occ: 94 },
                    { name: 'Unidade Norte', residents: 32, occ: 88 },
                    { name: 'Unidade Sul', residents: 55, occ: 98 },
                  ].map(unit => (
                    <div key={unit.name} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{unit.name}</p>
                          <p className="text-xs text-slate-400">{unit.residents} residentes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{unit.occ}%</p>
                        <p className="text-xs text-slate-400">ocupação</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-blue-700">R$ 284.000</p>
                  <p className="text-xs text-blue-500 mt-1">Receita consolidada · Junho 2026</p>
                </div>
              </div>
            </div>
          )}

          {/* All features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feat => (
              <button
                key={feat.title}
                onClick={() => navigateToFeature(feat.slug)}
                className="text-left bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feat.color}`}>
                  <feat.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{feat.desc}</p>
                <span className="inline-flex items-center text-sm font-semibold text-blue-600">
                  Saiba mais
                  <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ——— PRICING ——— */}
      <section id="pricing" className="bg-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">{pricingHeader.titulo}</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-8">{pricingHeader.subtitulo}</p>
            <div className="inline-flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setPricingPeriod('mensal')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${pricingPeriod === 'mensal' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setPricingPeriod('anual')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${pricingPeriod === 'anual' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span>Anual</span>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">-25%</span>
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map(plan => (
              <div key={plan.name} className={`relative border-2 rounded-2xl p-8 transition-all hover:-translate-y-1 hover:shadow-xl ${plan.color}`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">
                      {pricingPeriod === 'mensal' ? plan.priceMonthly : plan.priceAnnual}
                    </span>
                    {plan.priceMonthly !== 'Sob consulta' && (
                      <span className="text-slate-400 text-sm mb-1">/mês</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    plan.planoId === 'enterprise'
                      ? navigateToDemo()
                      : navigateToCheckout(plan.planoId, pricingPeriod)
                  }
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </button>
                <ul className="space-y-3">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-center space-x-2 text-sm">
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-slate-600">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— TESTIMONIALS ——— */}
      <section id="testimonials" className="bg-slate-50 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">{testimonialsContent.titulo}</h2>
            <p className="text-xl text-slate-500">{testimonialsContent.subtitulo}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${t.avatarColor} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                    <p className="text-xs text-slate-400">{t.institution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— FINAL CTA ——— */}
      <section className="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            {ctaFinal.titulo}
          </h2>
          <p className="text-xl text-blue-200 mb-8">
            {ctaFinal.subtitulo}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigateToCheckout()}
              className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition-all"
            >
              {ctaFinal.cta_primario}
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center justify-center border-2 border-white/40 hover:border-white text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all hover:bg-white/10"
            >
              {ctaFinal.cta_secundario}
            </button>
          </div>
          <p className="text-blue-300 text-sm mt-6">{ctaFinal.rodape}</p>
        </div>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={imagens.logo?.alt_text || nav.marca} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <HeartPulse className="h-5 w-5 text-white" />
                  </div>
                )}
                <span className="text-white font-bold text-lg">{nav.marca}</span>
              </div>
              <p className="text-sm leading-relaxed">{footer.tagline}</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Produto</p>
              <ul className="space-y-2 text-sm">
                {['Funcionalidades', 'Preços', 'Segurança', 'Integrações'].map(item => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Empresa</p>
              <ul className="space-y-2 text-sm">
                {['Sobre nós', 'Blog', 'Carreiras', 'Contato'].map(item => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Suporte</p>
              <ul className="space-y-2 text-sm">
                {['Central de ajuda', 'Documentação', 'Status do sistema', 'Política de privacidade'].map(item => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>{footer.copyright}</p>
            <div className="flex items-center space-x-2 text-slate-500">
              <Shield className="h-4 w-4" />
              <span>{footer.lgpd}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ——— LOGIN MODAL ——— */}
      {showLoginModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onMouseDown={() => { loginModalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!loginModalMouseDown.current && e.target === e.currentTarget) { setShowLoginModal(false); closeResetMode(); } }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md px-8 pt-10 pb-8 relative"
            onMouseDown={(e) => { loginModalMouseDown.current = true; e.stopPropagation(); }}
          >
            <button
              onClick={() => { setShowLoginModal(false); closeResetMode(); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            {/* ——— MODO REDEFINIR SENHA ——— */}
            {resetMode ? (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
                    <Lock className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Redefinir senha</h2>
                  <p className="text-slate-400 text-sm mt-1">Enviaremos um link para o seu e-mail</p>
                </div>

                {resetSuccess ? (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4">
                      <AlertCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <p className="text-sm text-emerald-700 font-medium">
                        E-mail enviado! Verifique sua caixa de entrada.
                      </p>
                    </div>
                    <button
                      onClick={closeResetMode}
                      className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-all text-sm"
                    >
                      Voltar ao login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail cadastrado</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={e => setResetEmail(e.target.value)}
                          placeholder="seu@email.com"
                          required
                          autoFocus
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {resetError && (
                      <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                        <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                        <p className="text-sm text-rose-600">{resetError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                    </button>

                    <button
                      type="button"
                      onClick={closeResetMode}
                      className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium py-3 rounded-xl transition-all text-sm"
                    >
                      Voltar ao login
                    </button>
                  </form>
                )}
              </>
            ) : (
              /* ——— MODO LOGIN NORMAL ——— */
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
                    <HeartPulse className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Acesse sua conta</h2>
                  <p className="text-slate-400 text-sm mt-1">RecantoCare — Gestão de ILPIs</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-slate-700">Senha</label>
                      <button
                        type="button"
                        onClick={openResetMode}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                        aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                      <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                      <p className="text-sm text-rose-600">{loginError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm mt-2 shadow"
                  >
                    {loginLoading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

                <p className="text-center text-xs text-slate-400 mt-6">
                  Não tem conta?{' '}
                  <button onClick={() => navigateToCheckout()} className="text-blue-600 font-medium hover:underline">
                    Assine agora
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
