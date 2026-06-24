import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse, ArrowLeft, ArrowRight, Check, Building2, User, CreditCard,
  ClipboardList, XCircle, Clock, Eye, EyeOff, Shield, Lock,
  Loader2, Copy, FileText, ExternalLink, QrCode
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import type { CheckoutFormData, PlanoId, Periodicidade, FormaPagamento } from '../types';

// hCaptcha — opcional. Quando VITE_HCAPTCHA_SITE_KEY estiver definido, o widget é
// renderizado e o token exigido. Sem a chave, o checkout segue sem CAPTCHA (e a
// Edge Function também ignora a verificação quando HCAPTCHA_SECRET não existe).
const HCAPTCHA_SITE_KEY = ((import.meta as any).env?.VITE_HCAPTCHA_SITE_KEY as string | undefined) || '';

// ─── Catálogo de exibição (fallback) ──────────────────────────────────────────
// A fonte oficial de preço é a tabela Recanto_Planos (lida no servidor). Estes
// valores são apenas para exibição enquanto o catálogo carrega.
interface PlanoView {
  id: PlanoId;
  nome: string;
  precoMensal: number;          // R$/mês no ciclo mensal
  precoMensalAnual: number;     // R$/mês equivalente no ciclo anual
  precoAnualTotal: number;      // R$ cobrado de fato no ciclo anual
  selfService: boolean;
  desc: string;
  features: string[];
  popular?: boolean;
}

const PLANOS_FALLBACK: PlanoView[] = [
  {
    id: 'essencial', nome: 'Essencial', precoMensal: 399, precoMensalAnual: 299, precoAnualTotal: 3588,
    selfService: true, desc: 'Ideal para ILPIs com até 30 residentes',
    features: ['Até 30 residentes', '5 usuários', 'Gestão de residentes', 'Saúde & checklists', 'Financeiro básico', 'Estoque', 'Suporte por e-mail'],
  },
  {
    id: 'profissional', nome: 'Profissional', precoMensal: 799, precoMensalAnual: 599, precoAnualTotal: 7188,
    selfService: true, desc: 'Para ILPIs de médio porte com mais recursos', popular: true,
    features: ['Até 100 residentes', '20 usuários', 'Todos os módulos', 'Relatórios avançados', 'IA Assistente', 'Portal do familiar', 'Suporte prioritário'],
  },
  {
    id: 'enterprise', nome: 'Enterprise', precoMensal: 0, precoMensalAnual: 0, precoAnualTotal: 0,
    selfService: false, desc: 'Para redes e grupos com múltiplas unidades',
    features: ['Residentes ilimitados', 'Usuários ilimitados', 'Múltiplas unidades', 'Dashboard consolidado', 'Onboarding dedicado', 'SLA 99,9%', 'Gerente de sucesso'],
  },
];

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO'
];

// ─── Helpers de formatação/validação ──────────────────────────────────────────
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

const money = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

// ─── Tipos internos ───────────────────────────────────────────────────────────
type Step = 'empresa' | 'admin' | 'plano' | 'pagamento' | 'processando' | 'resultado' | 'erro';

interface CheckoutResult {
  assinaturaId: string;
  subscriptionId: string;
  status: string;
  formaPagamento: FormaPagamento;
  pix?: { encodedImage: string; payload: string };
  boleto?: { invoiceUrl?: string; bankSlipUrl?: string };
}

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'empresa',    label: 'Empresa',     icon: Building2 },
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

const irParaLogin = () => { window.history.pushState(null, '', '/login'); window.location.reload(); };

// ─── Componente principal ─────────────────────────────────────────────────────
const CheckoutPage: React.FC = () => {
  const [step, setStep] = useState<Step>('empresa');
  const [form, setForm] = useState<CheckoutFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingCEP, setLoadingCEP] = useState(false);

  const [planos, setPlanos] = useState<PlanoView[]>(PLANOS_FALLBACK);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [copied, setCopied] = useState(false);

  // CAPTCHA (hCaptcha) — opcional
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaWidgetId = useRef<string | null>(null);

  // ── Carrega o catálogo de planos (fonte oficial: Recanto_Planos) ──
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('Recanto_Planos')
        .select('plano_id, plano_nome, preco_mensal, preco_anual_total, preco_mensal_equivalente_anual, ativo, self_service')
        .eq('ativo', true);
      if (error || !data || data.length === 0) return; // mantém fallback
      const mapped: PlanoView[] = data.map((p: any) => {
        const fb = PLANOS_FALLBACK.find(f => f.id === p.plano_id);
        return {
          id: p.plano_id as PlanoId,
          nome: p.plano_nome,
          precoMensal: Number(p.preco_mensal) || 0,
          precoMensalAnual: Number(p.preco_mensal_equivalente_anual) || Number(p.preco_mensal) || 0,
          precoAnualTotal: Number(p.preco_anual_total) || 0,
          selfService: p.self_service !== false,
          desc: fb?.desc ?? '',
          features: fb?.features ?? [],
          popular: fb?.popular,
        };
      });
      // Ordena na ordem essencial → profissional → enterprise quando possível
      const order = ['essencial', 'profissional', 'enterprise'];
      mapped.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      setPlanos(mapped);
    })();
  }, []);

  // ── Pré-seleção via querystring (?plano=&periodo=). Enterprise não é comprável. ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plano') as PlanoId | null;
    if (p && ['essencial', 'profissional'].includes(p)) {
      setForm(f => ({ ...f, planoId: p }));
    }
    const period = params.get('periodo') as Periodicidade | null;
    if (period && ['mensal', 'anual'].includes(period)) {
      setForm(f => ({ ...f, periodicidade: period }));
    }
  }, []);

  // ── hCaptcha: renderiza ao entrar na etapa de pagamento ──
  useEffect(() => {
    if (!HCAPTCHA_SITE_KEY || step !== 'pagamento') return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const render = () => {
      const hc = (window as any).hcaptcha;
      if (hc && captchaRef.current && captchaWidgetId.current === null) {
        captchaWidgetId.current = hc.render(captchaRef.current, {
          sitekey: HCAPTCHA_SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => setCaptchaToken(''),
        });
      }
    };
    if ((window as any).hcaptcha) {
      render();
    } else {
      const id = 'hcaptcha-script';
      if (!document.getElementById(id)) {
        const s = document.createElement('script');
        s.id = id;
        s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
        s.async = true; s.defer = true;
        s.onload = render;
        document.head.appendChild(s);
      }
      interval = setInterval(() => {
        if ((window as any).hcaptcha) { clearInterval(interval); render(); }
      }, 200);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [step]);

  const planoSelecionado = planos.find(p => p.id === form.planoId) ?? planos[0];
  const selfServicePlanos = planos.filter(p => p.selfService);

  const valorMensalExibicao = form.periodicidade === 'mensal'
    ? planoSelecionado.precoMensal
    : planoSelecionado.precoMensalAnual;
  const totalCobranca = form.periodicidade === 'mensal'
    ? planoSelecionado.precoMensal
    : planoSelecionado.precoAnualTotal;

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
            setErrors(e => ({ ...e, cidade: undefined, estado: undefined }));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

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

  // ─── Navegação ─────────────────────────────────────────────────────────────
  const next = () => {
    if (step === 'empresa' && validateEmpresa()) setStep('admin');
    else if (step === 'admin' && validateAdmin()) setStep('plano');
    else if (step === 'plano') setStep('pagamento');
    else if (step === 'pagamento' && validatePagamento()) finalizar();
  };

  const back = () => {
    if (step === 'admin') setStep('empresa');
    else if (step === 'plano') setStep('admin');
    else if (step === 'pagamento') setStep('plano');
  };

  // ─── Finalização: chama a Edge Function (cobrança real no Asaas) ───────────
  const finalizar = async () => {
    setErrorMsg('');

    if (planoSelecionado && !planoSelecionado.selfService) {
      setErrorMsg('O plano Enterprise é contratado com o nosso time comercial.');
      return;
    }
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setErrorMsg('Complete a verificação de segurança (CAPTCHA) para continuar.');
      return;
    }

    setStep('processando');

    // Monta o payload — o frontend NUNCA envia o valor final (calculado no servidor).
    const [mm, aa] = form.validadeCartao.split('/');
    const cepDigits = form.cep.replace(/\D/g, '');
    const enderecoNumero = (form.enderecoCobranca.match(/\d+/)?.[0]) || '';

    const body: Record<string, unknown> = {
      planoId: form.planoId,
      periodicidade: form.periodicidade,
      formaPagamento: form.formaPagamento,
      captchaToken,
      empresa: {
        nome: form.nomeInstituicao,
        cnpj: form.cnpj.replace(/\D/g, ''),
        telefone: form.telefoneEmpresa.replace(/\D/g, ''),
        email: form.emailComercial,
      },
      admin: {
        nome: form.nomeAdmin,
        email: form.emailAdmin,
        telefone: form.telefoneAdmin.replace(/\D/g, ''),
        senha: form.senha,
      },
      customer: {
        name: form.nomeTitular,
        cpfCnpj: form.cpfTitular.replace(/\D/g, ''),
        email: form.emailAdmin,
        phone: form.telefoneAdmin.replace(/\D/g, ''),
      },
    };

    if (form.formaPagamento === 'cartao') {
      body.card = {
        holderName: form.nomeTitular,
        number: form.numeroCartao.replace(/\D/g, ''),
        expiryMonth: mm || '',
        expiryYear: aa ? `20${aa}` : '',
        ccv: form.cvv,
        holderInfo: {
          name: form.nomeTitular,
          email: form.emailAdmin,
          cpfCnpj: form.cpfTitular.replace(/\D/g, ''),
          postalCode: cepDigits,
          addressNumber: enderecoNumero,
          phone: form.telefoneAdmin.replace(/\D/g, ''),
        },
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('asaas-create-subscription', { body });

      if (error) {
        // supabase-js entrega o corpo de erro (status != 2xx) em error.context
        let msg = 'Não foi possível concluir o pagamento. Tente novamente.';
        try {
          const ctxBody = await (error as any).context?.json?.();
          if (ctxBody?.error) msg = ctxBody.error;
        } catch { /* mantém mensagem padrão */ }
        throw new Error(msg);
      }
      if (!data || data.error) throw new Error(data?.error || 'Resposta inválida do servidor.');

      setResult(data as CheckoutResult);
      setStep('resultado');
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      setErrorMsg(err.message || 'Erro inesperado ao processar o pagamento.');
      setStep('erro');
      // Reseta o widget de CAPTCHA para nova tentativa
      if (HCAPTCHA_SITE_KEY && (window as any).hcaptcha && captchaWidgetId.current !== null) {
        try { (window as any).hcaptcha.reset(captchaWidgetId.current); } catch { /* noop */ }
        setCaptchaToken('');
      }
    }
  };

  const copyPix = async () => {
    if (!result?.pix?.payload) return;
    try {
      await navigator.clipboard.writeText(result.pix.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  // ─── Helpers de UI ────────────────────────────────────────────────────────
  const stepIndex = ['empresa', 'admin', 'plano', 'pagamento'].indexOf(step);

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

        {/* ── Processando ── */}
        {step === 'processando' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Processando seu pedido</h2>
            <p className="text-slate-500 text-sm">Estamos criando sua conta e registrando a cobrança. Isso pode levar alguns segundos...</p>
          </div>
        )}

        {/* ── Resultado ── */}
        {step === 'resultado' && result && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-10">
            {/* Cartão — em processamento */}
            {result.formaPagamento === 'cartao' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Pagamento em processamento</h2>
                <p className="text-slate-500 mb-2">
                  Recebemos os dados do seu cartão e estamos aguardando a confirmação da operadora.
                </p>
                <p className="text-slate-500 text-sm mb-8">
                  <strong>Seu acesso será liberado automaticamente após a confirmação.</strong> Você pode
                  entrar com o e-mail e a senha cadastrados — enquanto o pagamento não é confirmado,
                  verá a tela de pagamento pendente.
                </p>
                <button onClick={irParaLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all">
                  Ir para o login
                </button>
              </div>
            )}

            {/* PIX */}
            {result.formaPagamento === 'pix' && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium mb-5">
                  <QrCode className="h-4 w-4" /> Pague com PIX para ativar
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Escaneie o QR Code</h2>
                <p className="text-slate-500 text-sm mb-6">Abra o app do seu banco e pague via PIX. A ativação é automática após a confirmação.</p>

                {result.pix?.encodedImage ? (
                  <img
                    src={`data:image/png;base64,${result.pix.encodedImage}`}
                    alt="QR Code PIX"
                    className="w-56 h-56 mx-auto border border-slate-200 rounded-xl p-2 bg-white"
                  />
                ) : (
                  <p className="text-sm text-amber-600">QR Code indisponível — use o código copia-e-cola abaixo.</p>
                )}

                {result.pix?.payload && (
                  <div className="mt-6 text-left">
                    <label className={labelCls}>PIX copia-e-cola</label>
                    <div className="flex items-stretch gap-2">
                      <textarea
                        readOnly
                        value={result.pix.payload}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50 resize-none h-20"
                      />
                      <button
                        onClick={copyPix}
                        className="shrink-0 inline-flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-xs font-medium transition-all"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
                  <p className="text-xs text-blue-700">
                    Assim que o PIX for confirmado, seu acesso é liberado automaticamente. Você já pode
                    entrar com o e-mail e a senha cadastrados.
                  </p>
                </div>
                <button onClick={irParaLogin} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all">
                  Ir para o login
                </button>
              </div>
            )}

            {/* Boleto */}
            {result.formaPagamento === 'boleto' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-12 w-12 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Boleto gerado</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Pague o boleto para ativar a sua assinatura. A compensação bancária pode levar até 2 dias úteis.
                </p>
                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  {result.boleto?.bankSlipUrl && (
                    <a
                      href={result.boleto.bankSlipUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all"
                    >
                      <FileText className="h-4 w-4" /> Abrir boleto
                    </a>
                  )}
                  {result.boleto?.invoiceUrl && (
                    <a
                      href={result.boleto.invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-6 py-3 rounded-xl transition-all"
                    >
                      <ExternalLink className="h-4 w-4" /> Ver fatura / 2ª via
                    </a>
                  )}
                </div>
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-left max-w-sm mx-auto">
                  <p className="text-xs text-blue-700">
                    Após a compensação do boleto, seu acesso é liberado automaticamente. Você já pode
                    entrar com o e-mail e a senha cadastrados.
                  </p>
                </div>
                <button onClick={irParaLogin} className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-8 py-3 rounded-xl transition-all">
                  Ir para o login
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Erro ── */}
        {step === 'erro' && (
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
            <a href="mailto:suporte@recantocare.com.br" className="text-blue-600 hover:underline text-sm">
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
                  <p className="text-sm text-slate-500 mb-6">Este usuário receberá acesso de Administrador à plataforma após a confirmação do pagamento.</p>
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
                      Anual <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">economize</span>
                    </span>
                  </div>
                  <div className="grid gap-4">
                    {selfServicePlanos.map(plano => {
                      const precoMes = form.periodicidade === 'mensal' ? plano.precoMensal : plano.precoMensalAnual;
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
                              <p className="text-2xl font-extrabold text-slate-900">{money(precoMes)}</p>
                              <p className="text-xs text-slate-400">/mês</p>
                              {form.periodicidade === 'anual' && (
                                <p className="text-[11px] text-emerald-600 font-medium">{money(plano.precoAnualTotal)}/ano</p>
                              )}
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

                    {/* Enterprise — não comprável no self-service */}
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex items-center justify-between bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">Enterprise</p>
                        <p className="text-xs text-slate-400">Para redes e grupos com múltiplas unidades</p>
                      </div>
                      <a
                        href="mailto:comercial@recantocare.com.br?subject=Plano%20Enterprise"
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                      >
                        Falar com vendas
                      </a>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 4: Pagamento ── */}
              {step === 'pagamento' && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Dados de pagamento</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Plano <strong>{planoSelecionado.nome}</strong> —{' '}
                    {money(valorMensalExibicao)}/mês
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

                  {/* PIX / Boleto aviso */}
                  {(form.formaPagamento === 'pix' || form.formaPagamento === 'boleto') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          {form.formaPagamento === 'pix' ? 'Pagamento via PIX' : 'Pagamento via Boleto'}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          {form.formaPagamento === 'pix'
                            ? 'O QR Code PIX será exibido na próxima tela. A ativação ocorre automaticamente após a confirmação.'
                            : 'O boleto será gerado após o cadastro. A ativação ocorre após a compensação (até 2 dias úteis).'}
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
                          placeholder={form.formaPagamento === 'cartao' ? 'COMO ESTÁ NO CARTÃO' : 'NOME DO PAGADOR'} />
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
                            placeholder="0000 0000 0000 0000" maxLength={19} inputMode="numeric" autoComplete="cc-number" />
                          <FieldError name="numeroCartao" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Validade *</label>
                            <input className={inputCls('validadeCartao')} value={form.validadeCartao}
                              onChange={e => set('validadeCartao', formatValidade(e.target.value))}
                              placeholder="MM/AA" maxLength={5} inputMode="numeric" autoComplete="cc-exp" />
                            <FieldError name="validadeCartao" />
                          </div>
                          <div>
                            <label className={labelCls}>CVV *</label>
                            <input className={inputCls('cvv')} value={form.cvv}
                              onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="000" maxLength={4} inputMode="numeric" autoComplete="cc-csc" />
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

                  {/* CAPTCHA */}
                  {HCAPTCHA_SITE_KEY && (
                    <div className="mt-5 flex justify-center">
                      <div ref={captchaRef} />
                    </div>
                  )}

                  {/* Resumo */}
                  <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Resumo do pedido</p>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Empresa</span>
                        <span className="font-medium">{form.nomeInstituicao || '—'}</span>
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
                        <span className="font-semibold text-slate-900">
                          Total {form.periodicidade === 'anual' ? '(anual)' : '(mensal)'}
                        </span>
                        <span className="font-bold text-slate-900">
                          {money(totalCobranca)}{form.periodicidade === 'anual' ? '/ano' : '/mês'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                      <p className="text-sm text-rose-600">{errorMsg}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Seus dados de pagamento trafegam de forma segura para o gateway. Não armazenamos dados do cartão.</span>
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
