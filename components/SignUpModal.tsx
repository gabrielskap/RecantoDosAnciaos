import React, { useState } from 'react';
import {
  HeartPulse, X, Mail, Lock, User, Building2, Eye, EyeOff,
  Check, AlertCircle, ArrowRight, Loader2, MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onClose: () => void;
  onLoginInstead: () => void;
}

const SignUpModal: React.FC<Props> = ({ onClose, onLoginInstead }) => {
  const { signUpNewTenant } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const validate = (): string => {
    if (!companyName.trim()) return 'Informe o nome da sua ILPI.';
    if (!userName.trim()) return 'Informe o nome do responsável.';
    if (!email.trim()) return 'Informe o e-mail.';
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (password !== confirmPassword) return 'As senhas não coincidem.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    try {
      const { needsEmailConfirm } = await signUpNewTenant({
        companyName: companyName.trim(),
        city: city.trim() || undefined,
        userName: userName.trim(),
        email: email.trim(),
        password,
      });
      setNeedsEmailConfirm(needsEmailConfirm);
      setSuccess(true);
    } catch (err: any) {
      let msg = err.message || 'Erro ao criar conta.';
      if (msg.includes('User already registered') || msg.includes('already registered')) {
        msg = 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
      } else if (msg.includes('Password should be')) {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (msg.includes('Invalid email')) {
        msg = 'E-mail inválido.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <HeartPulse className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Criar conta gratuita</h2>
          <p className="text-slate-400 text-sm mt-1">14 dias grátis — sem cartão de crédito</p>
        </div>

        {/* Success state */}
        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {needsEmailConfirm ? 'Verifique seu e-mail' : 'Conta criada com sucesso!'}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {needsEmailConfirm
                ? `Enviamos um link de confirmação para ${email}. Clique no link para ativar sua conta e começar a usar o RecantoCare.`
                : `Bem-vindo(a), ${userName}! Sua conta para ${companyName} foi criada. Você já está conectado ao sistema.`
              }
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {needsEmailConfirm ? 'Entendido' : 'Acessar o sistema'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Company info */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dados da sua ILPI</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nome da ILPI / Instituição <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Lar Recanto dos Anciãos"
                    required
                    autoComplete="organization"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 mt-3">Cidade / UF</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Ex: São Paulo, SP"
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100 my-2" />

            {/* Admin user info */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dados do administrador</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nome completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  E-mail <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Senha <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmar senha <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start space-x-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm mt-2 shadow flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Criando conta...</span>
                </>
              ) : (
                <>
                  <span>Criar conta gratuita</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              Ao cadastrar, você concorda com nossos{' '}
              <span className="text-blue-600 cursor-pointer hover:underline">Termos de Uso</span>
              {' '}e{' '}
              <span className="text-blue-600 cursor-pointer hover:underline">Política de Privacidade</span>.
            </p>

            <p className="text-center text-xs text-slate-400 pt-1">
              Já tem conta?{' '}
              <button
                type="button"
                onClick={onLoginInstead}
                className="text-blue-600 font-medium hover:underline"
              >
                Fazer login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignUpModal;
