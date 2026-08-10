import React, { useState } from 'react';
import { AlertCircle, CheckCircle, HeartPulse, Loader2, Lock, Mail } from 'lucide-react';
import { confirmPasswordRecovery, requestPasswordRecovery } from '../services/passwordRecoveryService';

type Step = 'email' | 'code' | 'success';

const ResetPassword: React.FC = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordRecovery(email);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('A senha deve ter no mínimo 8 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      await confirmPasswordRecovery(email, code, password);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    window.history.pushState(null, '', '/login');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg mb-3 border border-white/20">
            <HeartPulse className="h-8 w-8 text-white" />
          </div>
          <p className="text-white text-xl font-bold tracking-tight">RecantoCare</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'success' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-9 w-9 text-emerald-600" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 mb-2">Senha atualizada!</h1>
              <p className="text-sm text-slate-500 mb-6">Faça login com sua nova senha para continuar.</p>
              <button onClick={goToLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">
                Ir para o login
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  {step === 'email' ? <Mail className="h-5 w-5 text-blue-600" /> : <Lock className="h-5 w-5 text-blue-600" />}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Redefinir senha</h1>
                  <p className="text-xs text-slate-500">{step === 'email' ? 'Receba um código por e-mail' : 'Digite o código e a nova senha'}</p>
                </div>
              </div>

              <form onSubmit={step === 'email' ? requestCode : savePassword} className="space-y-4">
                {step === 'email' ? (
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                    placeholder="E-mail cadastrado" autoComplete="email"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <>
                    <input inputMode="numeric" autoComplete="one-time-code" value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus
                      placeholder="000000"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.35em] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                      placeholder="Nova senha (mínimo 8 caracteres)" autoComplete="new-password"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                      placeholder="Confirme a nova senha" autoComplete="new-password"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </>
                )}

                {error && <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>}

                <button type="submit" disabled={loading || (step === 'code' && code.length !== 6)}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Aguarde...' : step === 'email' ? 'Enviar código' : 'Salvar nova senha'}
                </button>
                {step === 'code' && <button type="button" onClick={() => { setStep('email'); setError(''); }}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium py-2.5 rounded-xl text-sm">
                  Solicitar outro código
                </button>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
