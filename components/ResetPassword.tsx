import React, { useState, useEffect } from 'react';
import { HeartPulse, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type Step = 'loading' | 'form' | 'success' | 'error';

const ResetPassword: React.FC = () => {
  const [step, setStep] = useState<Step>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // O Supabase emite PASSWORD_RECOVERY quando o usuário chega via link de reset.
    // Também verificamos a sessão ativa (o link já fez login automático).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('form');
      }
    });

    // Verifica sessão existente caso o listener já tenha disparado antes de montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStep('form');
      else if (step === 'loading') {
        // Aguarda um pouco — o hash pode ainda estar sendo processado
        setTimeout(() => {
          setStep(s => s === 'loading' ? 'error' : s);
          setErrorMsg('Link inválido ou expirado. Solicite um novo e-mail de redefinição de senha.');
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao redefinir a senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => {
    window.history.pushState(null, '', '/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg mb-3 border border-white/20">
            <HeartPulse className="h-8 w-8 text-white" />
          </div>
          <p className="text-white text-xl font-bold tracking-tight">RecantoCare</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Loading */}
          {step === 'loading' && (
            <div className="text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-slate-600 text-sm">Verificando link de redefinição...</p>
            </div>
          )}

          {/* Form */}
          {step === 'form' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Nova senha</h1>
                  <p className="text-xs text-slate-500">Crie uma senha segura para sua conta</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nova senha *</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha *</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
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

                {errorMsg && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {submitting ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Senha atualizada!</h2>
              <p className="text-sm text-slate-500 mb-6">Sua senha foi redefinida com sucesso. Faça login para continuar.</p>
              <button
                onClick={goToLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
              >
                Ir para o login
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-9 w-9 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Link inválido</h2>
              <p className="text-sm text-slate-500 mb-6">
                {errorMsg || 'Este link de redefinição expirou ou já foi utilizado.'}
              </p>
              <button
                onClick={goToLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
              >
                Solicitar novo link
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          © {new Date().getFullYear()} RecantoCare · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
