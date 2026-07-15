import React, { useState, useEffect, useRef } from 'react';
import {
  X, CreditCard, Check, Clock, Copy, FileText, ExternalLink,
  QrCode, Loader2, Lock, ArrowLeft
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import PlanoCards from './PlanoCards';
import type { PlanoView, PlanoId, Periodicidade, FormaPagamento } from '../types';

const HCAPTCHA_SITE_KEY = ((import.meta as any).env?.VITE_HCAPTCHA_SITE_KEY as string | undefined) || '';

const PLANOS_FALLBACK: PlanoView[] = [
  {
    id: 'essencial', nome: 'Essencial', precoMensal: 399, precoMensalAnual: 299, precoAnualTotal: 3588,
    selfService: true, desc: 'Ideal para ILPIs com até 30 residentes',
    features: ['Até 30 residentes', '5 usuários', 'Gestão de residentes', 'Saúde & checklists', 'Financeiro básico', 'Estoque', 'Suporte por e-mail'],
    maxResidentes: 30, maxUsuarios: 5,
  },
  {
    id: 'profissional', nome: 'Profissional', precoMensal: 799, precoMensalAnual: 599, precoAnualTotal: 7188,
    selfService: true, desc: 'Para ILPIs de médio porte com mais recursos', popular: true,
    features: ['Até 100 residentes', '20 usuários', 'Todos os módulos', 'Relatórios avançados', 'IA Assistente', 'Portal do familiar', 'Suporte prioritário'],
    maxResidentes: 100, maxUsuarios: 20,
  },
  {
    id: 'enterprise', nome: 'Enterprise', precoMensal: 0, precoMensalAnual: 0, precoAnualTotal: 0,
    selfService: false, desc: 'Para redes e grupos com múltiplas unidades',
    features: ['Residentes ilimitados', 'Usuários ilimitados', 'Múltiplas unidades', 'Dashboard consolidado', 'Onboarding dedicado', 'SLA 99,9%', 'Gerente de sucesso'],
    maxResidentes: null, maxUsuarios: null,
  },
];

const money = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

const onlyDigits = (s: string) => s.replace(/\D/g, '');

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function formatCartao(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
}
function formatValidade(v: string) {
  return v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');
}
function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const soma = (n: number) => d.slice(0, n).split('').reduce((acc, c, i) => acc + parseInt(c) * (n + 1 - i), 0);
  const dv = (s: number) => { const r = (s * 10) % 11; return r >= 10 ? 0 : r; };
  return dv(soma(9)) === parseInt(d[9]) && dv(soma(10)) === parseInt(d[10]);
}

type ModalStep = 'plano' | 'pagamento' | 'processando' | 'resultado' | 'erro';

interface PaymentResult {
  assinaturaId: string;
  subscriptionId?: string;
  formaPagamento: FormaPagamento;
  pix?: { encodedImage: string; payload: string };
  boleto?: { invoiceUrl?: string; bankSlipUrl?: string };
}

interface FormState {
  planoId: PlanoId;
  periodicidade: Periodicidade;
  formaPagamento: FormaPagamento;
  nomeTitular: string;
  cpfTitular: string;
  numeroCartao: string;
  validadeCartao: string;
  cvv: string;
  enderecoCobranca: string;
}

const EMPTY: FormState = {
  planoId: 'profissional', periodicidade: 'mensal',
  formaPagamento: 'cartao', nomeTitular: '', cpfTitular: '',
  numeroCartao: '', validadeCartao: '', cvv: '', enderecoCobranca: '',
};

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { refreshAccessStatus } = useAuth();
  const [modalStep, setModalStep] = useState<ModalStep>('plano');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [planos, setPlanos] = useState<PlanoView[]>(PLANOS_FALLBACK);
  const [copied, setCopied] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaWidgetId = useRef<string | null>(null);

  // Carrega planos do banco
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data } = await supabase
        .from('Recanto_Planos')
        .select('plano_id, plano_nome, preco_mensal, preco_anual_total, preco_mensal_equivalente_anual, ativo, self_service, max_residentes, max_usuarios')
        .eq('ativo', true);
      if (!data || data.length === 0) return;
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
          maxResidentes: p.max_residentes ?? null,
          maxUsuarios: p.max_usuarios ?? null,
        };
      });
      const order = ['essencial', 'profissional', 'enterprise'];
      mapped.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      setPlanos(mapped);
    })();
  }, [isOpen]);

  // hCaptcha no passo de pagamento
  useEffect(() => {
    if (!HCAPTCHA_SITE_KEY || modalStep !== 'pagamento') return;
    const render = () => {
      const hc = (window as any).hcaptcha;
      if (hc && captchaRef.current && captchaWidgetId.current === null) {
        captchaWidgetId.current = hc.render(captchaRef.current, {
          sitekey: HCAPTCHA_SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
        });
      }
    };
    if ((window as any).hcaptcha) render();
  }, [modalStep]);

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setModalStep('plano');
      setForm(EMPTY);
      setErrors({});
      setErrorMsg('');
      setResult(null);
      setCaptchaToken('');
      captchaWidgetId.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (field: keyof FormState, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const planoSelecionado = planos.find(p => p.id === form.planoId) ?? planos[0];
  const valorExibicao = form.periodicidade === 'mensal' ? planoSelecionado.precoMensal : planoSelecionado.precoMensalAnual;
  const totalCobranca = form.periodicidade === 'mensal' ? planoSelecionado.precoMensal : planoSelecionado.precoAnualTotal;

  const validatePagamento = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.nomeTitular.trim()) e.nomeTitular = 'Campo obrigatório';
    if (!form.cpfTitular.trim()) e.cpfTitular = 'Campo obrigatório';
    else if (!validarCPF(form.cpfTitular)) e.cpfTitular = 'CPF inválido';
    if (form.formaPagamento === 'cartao') {
      if (onlyDigits(form.numeroCartao).length < 16) e.numeroCartao = 'Número do cartão inválido';
      if (onlyDigits(form.validadeCartao).length < 4) e.validadeCartao = 'Validade inválida';
      if (form.cvv.length < 3) e.cvv = 'CVV inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePagar = async () => {
    if (!validatePagamento()) return;
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setErrorMsg('Complete a verificação de segurança (CAPTCHA).');
      return;
    }

    setErrorMsg('');
    setModalStep('processando');

    const [mm, aa] = form.validadeCartao.split('/');
    const body: Record<string, unknown> = {
      planoId: form.planoId,
      periodicidade: form.periodicidade,
      formaPagamento: form.formaPagamento,
      captchaToken,
      customer: {
        name: form.nomeTitular,
        cpfCnpj: onlyDigits(form.cpfTitular),
      },
    };

    if (form.formaPagamento === 'cartao') {
      body.card = {
        holderName: form.nomeTitular,
        number: onlyDigits(form.numeroCartao),
        expiryMonth: mm || '',
        expiryYear: aa ? `20${aa}` : '',
        ccv: form.cvv,
        holderInfo: {
          name: form.nomeTitular,
          cpfCnpj: onlyDigits(form.cpfTitular),
          postalCode: '',
          addressNumber: 'S/N',
        },
      };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('asaas-activate-subscription', {
        body,
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });

      if (error) {
        let msg = 'Não foi possível processar o pagamento.';
        try {
          const ctxBody = await (error as any).context?.json?.();
          if (ctxBody?.error) msg = ctxBody.error;
        } catch { /* noop */ }
        throw new Error(msg);
      }
      if (!data || data.error) throw new Error(data?.error || 'Resposta inválida.');

      setResult(data as PaymentResult);
      setModalStep('resultado');
      // Atualiza estado de acesso (trial banner desaparece se pagamento confirmado)
      await refreshAccessStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar pagamento.');
      setModalStep('erro');
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

  const inputCls = (field: keyof FormState) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
    }`;
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {modalStep === 'pagamento' && (
              <button onClick={() => setModalStep('plano')} className="p-1 rounded hover:bg-slate-100 mr-1">
                <ArrowLeft className="h-4 w-4 text-slate-500" />
              </button>
            )}
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {modalStep === 'plano' ? 'Escolha seu plano' :
               modalStep === 'pagamento' ? 'Dados de pagamento' :
               modalStep === 'processando' ? 'Processando...' :
               modalStep === 'resultado' ? 'Pedido realizado' : 'Erro no pagamento'}
            </h2>
          </div>
          {modalStep !== 'processando' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Processando */}
          {modalStep === 'processando' && (
            <div className="py-10 text-center">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 text-sm">Processando seu pagamento...</p>
            </div>
          )}

          {/* Seleção de plano */}
          {modalStep === 'plano' && (
            <>
              <PlanoCards
                planos={planos}
                selectedId={form.planoId}
                periodicidade={form.periodicidade}
                onSelect={id => set('planoId', id as string)}
                onPeriodChange={p => set('periodicidade', p)}
              />
              <button
                onClick={() => {
                  if (!planoSelecionado.selfService) return;
                  setModalStep('pagamento');
                }}
                disabled={!planoSelecionado.selfService}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all text-sm"
              >
                Continuar para pagamento
              </button>
            </>
          )}

          {/* Pagamento */}
          {modalStep === 'pagamento' && (
            <>
              <p className="text-sm text-slate-500 mb-5">
                Plano <strong>{planoSelecionado.nome}</strong> — {money(valorExibicao)}/mês
              </p>

              {/* Forma de pagamento */}
              <div className="mb-5">
                <label className={labelCls}>Forma de pagamento</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['cartao','pix','boleto'] as FormaPagamento[]).map(fp => (
                    <button
                      key={fp}
                      onClick={() => set('formaPagamento', fp)}
                      className={`border-2 rounded-xl py-3 px-2 text-sm font-medium transition-all ${
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

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Nome do titular *</label>
                    <input className={inputCls('nomeTitular')} value={form.nomeTitular}
                      onChange={e => set('nomeTitular', e.target.value.toUpperCase())}
                      placeholder={form.formaPagamento === 'cartao' ? 'COMO ESTÁ NO CARTÃO' : 'NOME DO PAGADOR'} />
                    {errors.nomeTitular && <p className="text-red-500 text-xs mt-1">{errors.nomeTitular}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>CPF do titular *</label>
                    <input className={inputCls('cpfTitular')} value={form.cpfTitular}
                      onChange={e => set('cpfTitular', formatCPF(e.target.value))}
                      placeholder="000.000.000-00" maxLength={14} />
                    {errors.cpfTitular && <p className="text-red-500 text-xs mt-1">{errors.cpfTitular}</p>}
                  </div>
                </div>

                {form.formaPagamento === 'cartao' && (
                  <>
                    <div>
                      <label className={labelCls}>Número do cartão *</label>
                      <input className={inputCls('numeroCartao')} value={form.numeroCartao}
                        onChange={e => set('numeroCartao', formatCartao(e.target.value))}
                        placeholder="0000 0000 0000 0000" maxLength={19} inputMode="numeric" />
                      {errors.numeroCartao && <p className="text-red-500 text-xs mt-1">{errors.numeroCartao}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Validade *</label>
                        <input className={inputCls('validadeCartao')} value={form.validadeCartao}
                          onChange={e => set('validadeCartao', formatValidade(e.target.value))}
                          placeholder="MM/AA" maxLength={5} inputMode="numeric" />
                        {errors.validadeCartao && <p className="text-red-500 text-xs mt-1">{errors.validadeCartao}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>CVV *</label>
                        <input className={inputCls('cvv')} value={form.cvv}
                          onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="000" maxLength={4} inputMode="numeric" />
                        {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {HCAPTCHA_SITE_KEY && (
                <div className="mt-5 flex justify-center">
                  <div ref={captchaRef} />
                </div>
              )}

              {/* Resumo */}
              <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">Resumo</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{planoSelecionado.nome} ({form.periodicidade})</span>
                  <span className="font-bold text-slate-900">
                    {money(totalCobranca)}{form.periodicidade === 'anual' ? '/ano' : '/mês'}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-rose-600">{errorMsg}</p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                <span>Dados de pagamento transmitidos com segurança. Não armazenamos o cartão.</span>
              </div>

              <button
                onClick={handlePagar}
                className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all text-sm"
              >
                Finalizar e pagar
              </button>
            </>
          )}

          {/* Resultado — cartão */}
          {modalStep === 'resultado' && result?.formaPagamento === 'cartao' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Clock className="h-9 w-9 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Pagamento em processamento</h3>
              <p className="text-slate-500 text-sm mb-6">
                Seu acesso será liberado automaticamente assim que a operadora confirmar o pagamento.
              </p>
              <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2.5 rounded-xl transition-all text-sm">
                Fechar
              </button>
            </div>
          )}

          {/* Resultado — PIX */}
          {modalStep === 'resultado' && result?.formaPagamento === 'pix' && (
            <div className="py-4 text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                <QrCode className="h-4 w-4" /> Escaneie o QR Code
              </div>
              {result.pix?.encodedImage && (
                <img
                  src={`data:image/png;base64,${result.pix.encodedImage}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 mx-auto border border-slate-200 rounded-xl p-2 bg-white mb-4"
                />
              )}
              {result.pix?.payload && (
                <div className="flex items-stretch gap-2 mb-4">
                  <textarea
                    readOnly value={result.pix.payload}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50 resize-none h-16"
                  />
                  <button onClick={copyPix}
                    className="shrink-0 inline-flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-xs font-medium transition-all"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500 mb-4">A ativação é automática após a confirmação do PIX.</p>
              <button onClick={onClose} className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-8 py-2.5 rounded-xl transition-all text-sm">
                Fechar
              </button>
            </div>
          )}

          {/* Resultado — boleto */}
          {modalStep === 'resultado' && result?.formaPagamento === 'boleto' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <FileText className="h-9 w-9 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Boleto gerado</h3>
              <p className="text-slate-500 text-sm mb-5">Pague o boleto para ativar sua assinatura. A compensação leva até 2 dias úteis.</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto mb-4">
                {result.boleto?.bankSlipUrl && (
                  <a href={result.boleto.bankSlipUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
                  >
                    <FileText className="h-4 w-4" /> Abrir boleto
                  </a>
                )}
                {result.boleto?.invoiceUrl && (
                  <a href={result.boleto.invoiceUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-6 py-2.5 rounded-xl transition-all text-sm"
                  >
                    <ExternalLink className="h-4 w-4" /> Ver fatura / 2ª via
                  </a>
                )}
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm">Fechar</button>
            </div>
          )}

          {/* Erro */}
          {modalStep === 'erro' && (
            <div className="py-6 text-center">
              <p className="text-slate-700 font-medium mb-2">Não foi possível concluir</p>
              <p className="text-slate-500 text-sm mb-6">{errorMsg || 'Verifique os dados e tente novamente.'}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setModalStep('pagamento')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm">
                  Tentar novamente
                </button>
                <button onClick={onClose}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium px-6 py-2.5 rounded-xl transition-all text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
