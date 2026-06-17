import React, { useState, useEffect } from 'react';
import {
  HeartPulse, ArrowLeft, ArrowRight, Check, Building2, User, CreditCard,
  ClipboardList, CheckCircle, XCircle, Clock, Eye, EyeOff, Shield, Lock,
  AlertCircle, ChevronRight, Loader2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import type { CheckoutFormData, PlanoId, Periodicidade, FormaPagamento } from '../types';

// ─── Planos disponíveis ───────────────────────────────────────────────────────
const PLANOS = [
  {
    id: 'essencial' as PlanoId,
    nome: 'Essencial',
    precoMensal: 399,
    precoAnual: 299,
    desc: 'Ideal para ILPIs com até 30 residentes',
    features: ['Até 30 residentes', '5 usuários', 'Gestão de residentes', 'Saúde & checklists', 'Financeiro básico', 'Estoque', 'Suporte por e-mail'],
  },
  {
    id: 'profissional' as PlanoId,
    nome: 'Profissional',
    precoMensal: 799,
    precoAnual: 599,
    desc: 'Para ILPIs de médio porte com mais recursos',
    features: ['Até 100 residentes', '20 usuários', 'Todos os módulos', 'Relatórios avançados', 'IA Assistente', 'Portal do familiar', 'Suporte prioritário'],
    popular: true,
  },
  {
    id: 'enterprise' as PlanoId,
    nome: 'Enterprise',
    precoMensal: 0,
    precoAnual: 0,
    desc: 'Para redes e grupos com múltiplas unidades',
    features: ['Residentes ilimitados', 'Usuários ilimitados', 'Múltiplas unidades', 'Dashboard consolidado', 'Onboarding dedicado', 'SLA 99,9%', 'Gerente de sucesso'],
  },
];

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO'
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function formatCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

function formatCartao(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
}

function formatValidade(v: string) {
  return v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');
}

function gerarEmpresaId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EMP-${ts}-${rand}`;
}

function validarCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const calc = (s: string, ws: number[]) =>
    ws.reduce((acc, w, i) => acc + parseInt(s[i]) * w, 0) % 11;
  const r1 = calc(d, [5,4,3,2,9,8,7,6,5,4,3,2]);
  if (parseInt(d[12]) !== (r1 < 2 ? 0 : 11 - r1)) return false;
  const r2 = calc(d, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return parseInt(d[13]) === (r2 < 2 ? 0 : 11 - r2);
}

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const soma = (n: number) =>
    d.slice(0, n).split('').reduce((acc, c, i) => acc + parseInt(c) * (n + 1 - i), 0);
  const dv = (s: number) => { const r = (s * 10) % 11; return r >= 10 ? 0 : r; };
  return dv(soma(9)) === parseInt(d[9]) && dv(soma(10)) === parseInt(d[10]);
}

// ─── Tipos internos ───────────────────────────────────────────────────────────
type Step = 'empresa' | 'admin' | 'plano' | 'pagamento' | 'processando' | 'sucesso' | 'recusado';

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'empresa',    label: 'Empresa',    icon: Building2 },
  { key: 'admin',      label: 'Responsável', icon: User },
  { key: 'plano',      label: 'Plano',       icon: ClipboardList },
  { key: 'pagamento',  label: 'Pagamento',   icon: CreditCard },
];

const EMPTY_FORM: CheckoutFormData = {
  nomeInstituicao: '', cnpj: '', razaoSocial: '', nomeFantasia: '',
  telefoneEmpresa: '', emailComercial: '', endereco: '', cidade: '',
  estado: '', cep: '', qtdResidentes: '', qtdUsuarios: '',
  planoId: 'profissional', periodicidade: 'mensal',
  nomeAdmin: '', cpfAdmin: '', emailAdmin: '', telefoneAdmin: '',
  cargo: '', senha: '', confirmarSenha: '',
  formaPagamento: 'cartao', nomeTitular: '', cpfTitular: '',
  numeroCartao: '', validadeCartao: '', cvv: '', enderecoCobranca: '',
};

// ─── Componente principal ─────────────────────────────────────────────────────
const CheckoutPage: React.FC = () => {
  const [step, setStep] = useState<Step>('empresa');
  const [form, setForm] = useState<CheckoutFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('Aguarde enquanto processamos seu pagamento...');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingCEP, setLoadingCEP] = useState(false);

  const handleCEPChange = async (val: string) => {
    const formatted = formatCEP(val);
    set('cep', formatted);

    const cleanCEP = formatted.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        if (response.ok) {
          const data = await response.json();
          if (!data.erro) {
            setForm(f => ({
              ...f,
              endereco: data.logradouro ? `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}` : f.endereco,
              cidade: data.localidade || f.cidade,
              estado: data.uf || f.estado,
            }));
            setErrors(e => ({
              ...e,
              cidade: undefined,
              estado: undefined,
            }));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  // Pré-seleciona plano pela query string (?plano=essencial)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plano') as PlanoId | null;
    if (p && ['essencial', 'profissional', 'enterprise'].includes(p)) {
      setForm(f => ({ ...f, planoId: p }));
    }
    const period = params.get('periodo') as Periodicidade | null;
    if (period && ['mensal', 'anual'].includes(period)) {
      setForm(f => ({ ...f, periodicidade: period }));
    }
  }, []);

  const set = (field: keyof CheckoutFormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  // ─── Validações por etapa ─────────────────────────────────────────────────
  const validateEmpresa = (): boolean => {
    const e: typeof errors = {};
    if (!form.nomeInstituicao.trim()) e.nomeInstituicao = 'Campo obrigatório';
    if (!form.cnpj.trim()) e.cnpj = 'Campo obrigatório';
    else if (!validarCNPJ(form.cnpj)) e.cnpj = 'CNPJ inválido';
    if (!form.razaoSocial.trim()) e.razaoSocial = 'Campo obrigatório';
    if (!form.telefoneEmpresa.trim()) e.telefoneEmpresa = 'Campo obrigatório';
    if (!form.emailComercial.trim()) e.emailComercial = 'Campo obrigatório';
    else if (!/\S+@\S+\.\S+/.test(form.emailComercial)) e.emailComercial = 'E-mail inválido';
    if (!form.cidade.trim()) e.cidade = 'Campo obrigatório';
    if (!form.estado) e.estado = 'Selecione o estado';
    if (!form.cep.trim()) e.cep = 'Campo obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateAdmin = (): boolean => {
    const e: typeof errors = {};
    if (!form.nomeAdmin.trim()) e.nomeAdmin = 'Campo obrigatório';
    if (!form.cpfAdmin.trim()) e.cpfAdmin = 'Campo obrigatório';
    else if (!validarCPF(form.cpfAdmin)) e.cpfAdmin = 'CPF inválido';
    if (!form.emailAdmin.trim()) e.emailAdmin = 'Campo obrigatório';
    else if (!/\S+@\S+\.\S+/.test(form.emailAdmin)) e.emailAdmin = 'E-mail inválido';
    if (!form.cargo.trim()) e.cargo = 'Campo obrigatório';
    if (form.senha.length < 8) e.senha = 'Mínimo 8 caracteres';
    if (form.senha !== form.confirmarSenha) e.confirmarSenha = 'Senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePagamento = (): boolean => {
    const e: typeof errors = {};
    if (!form.nomeTitular.trim()) e.nomeTitular = 'Campo obrigatório';
    if (!form.cpfTitular.trim()) e.cpfTitular = 'Campo obrigatório';
    else if (!validarCPF(form.cpfTitular)) e.cpfTitular = 'CPF inválido';
    if (form.formaPagamento === 'cartao') {
      if (form.numeroCartao.replace(/\D/g, '').length < 16) e.numeroCartao = 'Número do cartão inválido';
      if (form.validadeCartao.replace(/\D/g, '').length < 4) e.validadeCartao = 'Validade inválida';
      if (form.cvv.length < 3) e.cvv = 'CVV inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Navegação entre etapas ────────────────────────────────────────────────
  const next = () => {
    if (step === 'empresa' && validateEmpresa()) setStep('admin');
    else if (step === 'admin' && validateAdmin()) setStep('plano');
    else if (step === 'plano') setStep('pagamento');
    else if (step === 'pagamento' && validatePagamento()) processPayment();
  };

  const back = () => {
    if (step === 'admin') setStep('empresa');
    else if (step === 'plano') setStep('admin');
    else if (step === 'pagamento') setStep('plano');
  };

  // ─── Processamento de pagamento (mock) ────────────────────────────────────
  const processPayment = async () => {
    setStep('processando');
    setProcessingMsg('Verificando dados de pagamento...');
    await delay(1200);
    setProcessingMsg('Aguardando confirmação do gateway...');
    await delay(1500);
    setProcessingMsg('Pagamento aprovado! Criando sua empresa...');
    await delay(800);

    try {
      await criarEmpresaEAdmin();
      setStep('sucesso');
    } catch (err: any) {
      console.error('Erro ao criar empresa:', err);
      setErrorMsg(err.message || 'Erro inesperado ao criar conta. Entre em contato com o suporte.');
      setStep('recusado');
    }
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ─── Criação da empresa + admin no Supabase ───────────────────────────────
  const criarEmpresaEAdmin = async () => {
    const empresaId = gerarEmpresaId();
    const plano = PLANOS.find(p => p.id === form.planoId)!;
    const valorMensal = form.periodicidade === 'mensal' ? plano.precoMensal : plano.precoAnual;
    const hoje = new Date();
    const vencimento = new Date(hoje);
    vencimento.setFullYear(vencimento.getFullYear() + (form.periodicidade === 'anual' ? 1 : 0));
    vencimento.setMonth(vencimento.getMonth() + (form.periodicidade === 'mensal' ? 1 : 0));

    // 1. Criar empresa
    const { error: empresaError } = await supabase
      .from('Recanto_Empresas')
      .insert({
        empresa_id: empresaId,
        nome_instituicao: form.nomeInstituicao,
        cnpj: form.cnpj.replace(/\D/g, ''),
        razao_social: form.razaoSocial,
        nome_fantasia: form.nomeFantasia || form.nomeInstituicao,
        telefone: form.telefoneEmpresa,
        email_comercial: form.emailComercial,
        endereco: form.endereco,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep.replace(/\D/g, ''),
        qtd_residentes: parseInt(form.qtdResidentes) || 0,
        qtd_usuarios: parseInt(form.qtdUsuarios) || 1,
        status: 'ativa',
      });

    if (empresaError) throw new Error('Falha ao registrar empresa: ' + empresaError.message);

    // 2. Criar assinatura
    const { error: assinaturaError } = await supabase
      .from('Recanto_Assinaturas')
      .insert({
        empresa_id: empresaId,
        plano_id: form.planoId,
        plano_nome: plano.nome,
        valor_mensal: valorMensal,
        periodicidade: form.periodicidade,
        gateway_pagamento: 'mock',
        gateway_subscription_id: `mock_${empresaId}_${Date.now()}`,
        status: 'ativa',
        data_inicio: hoje.toISOString().split('T')[0],
        data_vencimento: vencimento.toISOString().split('T')[0],
      });

    if (assinaturaError) console.warn('Aviso assinatura:', assinaturaError.message);

    // 3. Criar usuário no Supabase Auth
    let authData;
    let signUpError;
    try {
      const res = await supabase.auth.signUp({
        email: form.emailAdmin,
        password: form.senha,
        options: {
          data: {
            name: form.nomeAdmin,
            company_name: form.nomeInstituicao,
            empresa_id: empresaId,
            profile_type: 'Administrador',
          },
        },
      });
      authData = res.data;
      signUpError = res.error;
    } catch (err: any) {
      signUpError = err;
    }

    if (signUpError && (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists') || signUpError.status === 422)) {
      // Usuário já cadastrado no Auth. Tenta fazer login com a senha fornecida para prosseguir
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.emailAdmin,
        password: form.senha,
      });

      if (signInError) {
        throw new Error('Este e-mail já está cadastrado. Caso seja você, digite a senha correta.');
      }
      authData = signInData;
    } else if (signUpError) {
      throw new Error('Falha ao criar usuário: ' + signUpError.message);
    }

    if (!authData.user) throw new Error('Usuário não retornado pelo Supabase.');

    if (!authData.session) {
      // E-mail de confirmação necessário — empresa já criada, usuário confirma depois
      return;
    }

    // Verifica se já existe o registro de Recanto_Usuarios
    const { data: existingUser } = await supabase
      .from('Recanto_Usuarios')
      .select('id, profile_id, empresa_id')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (existingUser && existingUser.empresa_id && existingUser.empresa_id !== empresaId) {
      // Já está completamente cadastrado e associado a uma empresa
      throw new Error('Este e-mail já está cadastrado e associado a uma empresa.');
    }

    let profileId = existingUser?.profile_id;

    if (!profileId) {
      // 4. Criar perfil Administrador
      const allModules = [
        'DASHBOARD','RESIDENTS','FINANCE','STOCK','TEAM',
        'NUTRITION','REPORTS','AGENDA','ROOMS','SETTINGS'
      ];

      const { data: profileData, error: profileError } = await supabase
        .from('Recanto_Perfis')
        .insert({ name: 'Administrador', type: 'Administrador', is_editable: false })
        .select()
        .single();

      if (profileError) throw new Error('Falha ao criar perfil: ' + profileError.message);
      profileId = profileData.id;

      await supabase.from('Recanto_Permissoes').insert(
        allModules.map(module => ({
          profile_id: profileId,
          module,
          actions: ['view', 'edit', 'create', 'delete'],
        }))
      );
    }

    // 5. Inserir/Atualizar usuário na tabela de negócio com empresa_id
    await supabase.from('Recanto_Usuarios').upsert({
      auth_user_id: authData.user.id,
      name: form.nomeAdmin,
      email: form.emailAdmin,
      profile_id: profileId,
      empresa_id: empresaId,
    }, { onConflict: 'auth_user_id' });

    // 6. Log de criação
    await supabase.from('Recanto_Logs_Empresa').insert({
      empresa_id: empresaId,
      tipo: 'pagamento_aprovado',
      descricao: `Empresa ${form.nomeInstituicao} criada via checkout. Plano: ${plano.nome}.`,
      metadata: { plano: form.planoId, periodicidade: form.periodicidade, forma_pagamento: form.formaPagamento },
    });
  };

  const irParaDashboard = () => {
    window.history.pushState(null, '', '/dashboard');
    window.location.reload();
  };

  // ─── Helpers de UI ────────────────────────────────────────────────────────
  const stepIndex = ['empresa', 'admin', 'plano', 'pagamento'].indexOf(step);
  const planoSelecionado = PLANOS.find(p => p.id === form.planoId)!;
  const valorPlano = form.periodicidade === 'mensal'
    ? planoSelecionado.precoMensal
    : planoSelecionado.precoAnual;

  const FieldError = ({ name }: { name: keyof CheckoutFormData }) =>
    errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name]}</p> : null;

  const inputCls = (name: keyof CheckoutFormData) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
      errors[name] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
    }`;

  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#1e40af] text-white px-4 py-4 shadow">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">RecantoCare</span>
          </div>
          <button
            onClick={() => { window.history.pushState(null,'','/'); window.location.reload(); }}
            className="flex items-center space-x-1 text-blue-200 hover:text-white text-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao site</span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Tela de processamento ── */}
        {step === 'processando' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Processando seu pedido</h2>
            <p className="text-slate-500 text-sm">{processingMsg}</p>
            <div className="mt-6 flex justify-center">
              <div className="flex space-x-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tela de sucesso ── */}
        {step === 'sucesso' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Assinatura aprovada com sucesso!</h2>
            <p className="text-slate-500 mb-2">
              Sua empresa foi cadastrada e seu acesso de administrador foi liberado.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Plano <strong>{planoSelecionado.nome}</strong> ativado —{' '}
              {valorPlano > 0
                ? `R$ ${valorPlano}/mês`
                : 'Entre em contato com o comercial.'}
            </p>
            <button
              onClick={irParaDashboard}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all inline-flex items-center space-x-2"
            >
              <span>Acessar o painel</span>
              <ChevronRight className="h-5 w-5" />
            </button>
            <p className="text-xs text-slate-400 mt-4">
              Verifique sua caixa de entrada — enviamos um e-mail de boas-vindas para <strong>{form.emailAdmin}</strong>.
            </p>
          </div>
        )}

        {/* ── Tela de erro ── */}
        {step === 'recusado' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Não foi possível concluir</h2>
            <p className="text-slate-500 mb-6 text-sm">
              {errorMsg || 'Houve um problema ao processar seu cadastro. Tente novamente ou entre em contato com o suporte.'}
            </p>
            <button
              onClick={() => setStep('pagamento')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all mr-3"
            >
              Tentar novamente
            </button>
            <a
              href="mailto:suporte@recantocare.com.br"
              className="text-blue-600 hover:underline text-sm"
            >
              Falar com suporte
            </a>
          </div>
        )}

        {/* ── Formulário por etapa ── */}
        {['empresa','admin','plano','pagamento'].includes(step) && (
          <>
            {/* Progress stepper */}
            <div className="flex items-center justify-center mb-8">
              {STEPS.map((s, i) => {
                const done = stepIndex > i;
                const active = stepIndex === i;
                return (
                  <React.Fragment key={s.key}>
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        done ? 'bg-blue-600 border-blue-600 text-white' :
                        active ? 'bg-white border-blue-600 text-blue-600' :
                        'bg-white border-slate-200 text-slate-300'
                      }`}>
                        {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                      </div>
                      <span className={`text-xs mt-1 font-medium ${active ? 'text-blue-600' : done ? 'text-slate-600' : 'text-slate-300'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-0.5 w-12 mx-1 mb-4 transition-all ${done ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">

              {/* ── Step 1: Empresa ── */}
              {step === 'empresa' && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Dados da empresa / ILPI</h2>
                  <p className="text-sm text-slate-500 mb-6">Preencha os dados da instituição que será cadastrada.</p>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Nome da instituição *</label>
                        <input className={inputCls('nomeInstituicao')} value={form.nomeInstituicao}
                          onChange={e => set('nomeInstituicao', e.target.value)} placeholder="Ex: Lar Esperança" />
                        <FieldError name="nomeInstituicao" />
                      </div>
                      <div>
                        <label className={labelCls}>Nome fantasia</label>
                        <input className={inputCls('nomeFantasia')} value={form.nomeFantasia}
                          onChange={e => set('nomeFantasia', e.target.value)} placeholder="Igual ao nome da instituição" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>CNPJ *</label>
                        <input className={inputCls('cnpj')} value={form.cnpj}
                          onChange={e => set('cnpj', formatCNPJ(e.target.value))}
                          placeholder="00.000.000/0001-00" maxLength={18} />
                        <FieldError name="cnpj" />
                      </div>
                      <div>
                        <label className={labelCls}>Razão social *</label>
                        <input className={inputCls('razaoSocial')} value={form.razaoSocial}
                          onChange={e => set('razaoSocial', e.target.value)} placeholder="Empresa Ltda." />
                        <FieldError name="razaoSocial" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Telefone *</label>
                        <input className={inputCls('telefoneEmpresa')} value={form.telefoneEmpresa}
                          onChange={e => set('telefoneEmpresa', formatPhone(e.target.value))}
                          placeholder="(00) 00000-0000" />
                        <FieldError name="telefoneEmpresa" />
                      </div>
                      <div>
                        <label className={labelCls}>E-mail comercial *</label>
                        <input className={inputCls('emailComercial')} type="email" value={form.emailComercial}
                          onChange={e => set('emailComercial', e.target.value)}
                          placeholder="contato@empresa.com.br" />
                        <FieldError name="emailComercial" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>CEP *</label>
                        <div className="relative">
                          <input className={inputCls('cep')} value={form.cep}
                            onChange={e => handleCEPChange(e.target.value)}
                            placeholder="00000-000" maxLength={9} />
                          {loadingCEP && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            </div>
                          )}
                        </div>
                        <FieldError name="cep" />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelCls}>Endereço completo</label>
                        <input className={inputCls('endereco')} value={form.endereco}
                          onChange={e => set('endereco', e.target.value)}
                          placeholder="Rua, número, complemento" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className={labelCls}>Cidade *</label>
                        <input className={inputCls('cidade')} value={form.cidade}
                          onChange={e => set('cidade', e.target.value)} placeholder="São Paulo" />
                        <FieldError name="cidade" />
                      </div>
                      <div>
                        <label className={labelCls}>Estado *</label>
                        <select className={inputCls('estado')} value={form.estado}
                          onChange={e => set('estado', e.target.value)}>
                          <option value="">UF</option>
                          {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                        <FieldError name="estado" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Nº estimado de residentes</label>
                        <input className={inputCls('qtdResidentes')} type="number" min="0" value={form.qtdResidentes}
                          onChange={e => set('qtdResidentes', e.target.value)} placeholder="Ex: 30" />
                      </div>
                      <div>
                        <label className={labelCls}>Nº de usuários desejados</label>
                        <input className={inputCls('qtdUsuarios')} type="number" min="1" value={form.qtdUsuarios}
                          onChange={e => set('qtdUsuarios', e.target.value)} placeholder="Ex: 5" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 2: Admin ── */}
              {step === 'admin' && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Dados do responsável</h2>
                  <p className="text-sm text-slate-500 mb-6">Este usuário receberá acesso de Administrador à plataforma.</p>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Nome completo *</label>
                        <input className={inputCls('nomeAdmin')} value={form.nomeAdmin}
                          onChange={e => set('nomeAdmin', e.target.value)} placeholder="João da Silva" />
                        <FieldError name="nomeAdmin" />
                      </div>
                      <div>
                        <label className={labelCls}>CPF *</label>
                        <input className={inputCls('cpfAdmin')} value={form.cpfAdmin}
                          onChange={e => set('cpfAdmin', formatCPF(e.target.value))}
                          placeholder="000.000.000-00" maxLength={14} />
                        <FieldError name="cpfAdmin" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>E-mail *</label>
                        <input className={inputCls('emailAdmin')} type="email" value={form.emailAdmin}
                          onChange={e => set('emailAdmin', e.target.value)}
                          placeholder="joao@empresa.com.br" />
                        <FieldError name="emailAdmin" />
                      </div>
                      <div>
                        <label className={labelCls}>Telefone</label>
                        <input className={inputCls('telefoneAdmin')} value={form.telefoneAdmin}
                          onChange={e => set('telefoneAdmin', formatPhone(e.target.value))}
                          placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Cargo / Função *</label>
                      <input className={inputCls('cargo')} value={form.cargo}
                        onChange={e => set('cargo', e.target.value)}
                        placeholder="Ex: Diretor Administrativo" />
                      <FieldError name="cargo" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Senha de acesso *</label>
                        <div className="relative">
                          <input className={inputCls('senha')} type={showSenha ? 'text' : 'password'}
                            value={form.senha} onChange={e => set('senha', e.target.value)}
                            placeholder="Mínimo 8 caracteres" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowSenha(v => !v)}>
                            {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FieldError name="senha" />
                      </div>
                      <div>
                        <label className={labelCls}>Confirmar senha *</label>
                        <div className="relative">
                          <input className={inputCls('confirmarSenha')} type={showConfirm ? 'text' : 'password'}
                            value={form.confirmarSenha} onChange={e => set('confirmarSenha', e.target.value)}
                            placeholder="Repita a senha" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowConfirm(v => !v)}>
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FieldError name="confirmarSenha" />
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-700">
                        Sua senha é criptografada e nunca armazenada em texto simples. Todos os dados são protegidos conforme a LGPD.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 3: Plano ── */}
              {step === 'plano' && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Escolha seu plano</h2>
                  <p className="text-sm text-slate-500 mb-4">Você pode trocar de plano a qualquer momento.</p>
                  {/* Toggle mensal/anual */}
                  <div className="flex items-center space-x-3 mb-6">
                    <span className={`text-sm font-medium ${form.periodicidade === 'mensal' ? 'text-slate-900' : 'text-slate-400'}`}>Mensal</span>
                    <button
                      onClick={() => set('periodicidade', form.periodicidade === 'mensal' ? 'anual' : 'mensal')}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.periodicidade === 'anual' ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.periodicidade === 'anual' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-sm font-medium ${form.periodicidade === 'anual' ? 'text-slate-900' : 'text-slate-400'}`}>
                      Anual <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">-25%</span>
                    </span>
                  </div>
                  <div className="grid gap-4">
                    {PLANOS.map(plano => {
                      const preco = form.periodicidade === 'mensal' ? plano.precoMensal : plano.precoAnual;
                      const selected = form.planoId === plano.id;
                      return (
                        <button
                          key={plano.id}
                          onClick={() => set('planoId', plano.id)}
                          className={`relative border-2 rounded-xl p-5 text-left transition-all w-full ${
                            selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {plano.popular && (
                            <span className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                              Mais popular
                            </span>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-bold text-slate-900">{plano.nome}</p>
                              <p className="text-xs text-slate-400">{plano.desc}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-extrabold text-slate-900">
                                {preco > 0 ? `R$ ${preco}` : 'Sob consulta'}
                              </p>
                              {preco > 0 && <p className="text-xs text-slate-400">/mês</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {plano.features.slice(0, 4).map(f => (
                              <span key={f} className="flex items-center space-x-1 text-xs text-slate-500">
                                <Check className="h-3 w-3 text-blue-600" />
                                <span>{f}</span>
                              </span>
                            ))}
                            {plano.features.length > 4 && (
                              <span className="text-xs text-blue-600 font-medium">+{plano.features.length - 4} mais</span>
                            )}
                          </div>
                          {selected && (
                            <div className="absolute top-4 right-4 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Step 4: Pagamento ── */}
              {step === 'pagamento' && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Dados de pagamento</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Plano <strong>{planoSelecionado.nome}</strong> —{' '}
                    {valorPlano > 0 ? `R$ ${valorPlano}/mês` : 'Sob consulta'}
                  </p>

                  {/* Forma de pagamento */}
                  <div className="mb-5">
                    <label className={labelCls}>Forma de pagamento</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['cartao','pix','boleto'] as FormaPagamento[]).map(fp => (
                        <button
                          key={fp}
                          onClick={() => set('formaPagamento', fp)}
                          className={`border-2 rounded-xl py-3 px-2 text-sm font-medium transition-all capitalize ${
                            form.formaPagamento === fp
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                        >
                          {fp === 'cartao' ? 'Cartão' : fp === 'pix' ? 'PIX' : 'Boleto'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PIX / Boleto */}
                  {(form.formaPagamento === 'pix' || form.formaPagamento === 'boleto') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          {form.formaPagamento === 'pix' ? 'Pagamento via PIX' : 'Pagamento via Boleto'}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          {form.formaPagamento === 'pix'
                            ? 'O QR Code PIX será exibido na próxima tela. Após confirmação, sua conta é ativada imediatamente.'
                            : 'O boleto será gerado após o cadastro. A ativação ocorre em até 2 dias úteis após o pagamento.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Nome do titular *</label>
                        <input className={inputCls('nomeTitular')} value={form.nomeTitular}
                          onChange={e => set('nomeTitular', e.target.value.toUpperCase())}
                          placeholder="COMO ESTÁ NO CARTÃO" />
                        <FieldError name="nomeTitular" />
                      </div>
                      <div>
                        <label className={labelCls}>CPF / CNPJ do titular *</label>
                        <input className={inputCls('cpfTitular')} value={form.cpfTitular}
                          onChange={e => set('cpfTitular', formatCPF(e.target.value))}
                          placeholder="000.000.000-00" maxLength={14} />
                        <FieldError name="cpfTitular" />
                      </div>
                    </div>

                    {form.formaPagamento === 'cartao' && (
                      <>
                        <div>
                          <label className={labelCls}>Número do cartão *</label>
                          <input className={inputCls('numeroCartao')} value={form.numeroCartao}
                            onChange={e => set('numeroCartao', formatCartao(e.target.value))}
                            placeholder="0000 0000 0000 0000" maxLength={19} />
                          <FieldError name="numeroCartao" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Validade *</label>
                            <input className={inputCls('validadeCartao')} value={form.validadeCartao}
                              onChange={e => set('validadeCartao', formatValidade(e.target.value))}
                              placeholder="MM/AA" maxLength={5} />
                            <FieldError name="validadeCartao" />
                          </div>
                          <div>
                            <label className={labelCls}>CVV *</label>
                            <input className={inputCls('cvv')} value={form.cvv}
                              onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="000" maxLength={4} />
                            <FieldError name="cvv" />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className={labelCls}>Endereço de cobrança</label>
                      <input className={inputCls('enderecoCobranca')} value={form.enderecoCobranca}
                        onChange={e => set('enderecoCobranca', e.target.value)}
                        placeholder="Rua, nº, cidade, estado" />
                    </div>
                  </div>

                  {/* Resumo */}
                  <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Resumo do pedido</p>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Empresa</span>
                        <span className="font-medium">{form.nomeInstituicao}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Plano</span>
                        <span className="font-medium">{planoSelecionado.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Periodicidade</span>
                        <span className="font-medium capitalize">{form.periodicidade}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                        <span className="font-semibold text-slate-900">Total</span>
                        <span className="font-bold text-slate-900">
                          {valorPlano > 0 ? `R$ ${valorPlano}/mês` : 'Sob consulta'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Seus dados de pagamento são protegidos por criptografia SSL. Não armazenamos dados do cartão.</span>
                  </div>
                </>
              )}

              {/* ── Botões de navegação ── */}
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={back}
                  disabled={step === 'empresa'}
                  className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 text-sm font-medium disabled:opacity-0 disabled:pointer-events-none transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar</span>
                </button>
                <button
                  onClick={next}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all flex items-center space-x-2 text-sm"
                >
                  <span>{step === 'pagamento' ? 'Finalizar e pagar' : 'Continuar'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Rodapé de segurança */}
            <div className="text-center mt-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              <span>Ambiente seguro · Dados protegidos conforme LGPD · SSL 256-bit</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
