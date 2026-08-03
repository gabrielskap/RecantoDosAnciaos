import React, { useState } from 'react';
import { HeartPulse, Mail, Lock, ArrowRight, Rocket, Check, ChevronLeft } from 'lucide-react';
import { DEMO_CREDENTIALS } from '../../data/demoData';
import { go, ROUTES } from '../../utils/navigation';

const DemoLogin: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Login cosmético (demo) — pequena espera simula autenticação.
    setTimeout(() => { setLoading(false); onLogin(); }, 600);
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Lado esquerdo — apresentação (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl">RecantoCare</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-5">
            Veja o sistema por dentro, sem compromisso
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-md">
            Este é um ambiente de demonstração com dados fictícios. Explore o painel administrativo
            como se fosse o gestor da sua ILPI.
          </p>
          <ul className="space-y-3">
            {['Dashboard com indicadores em tempo real', 'Gestão de residentes e usuários', 'Financeiro, relatórios e muito mais'].map(t => (
              <li key={t} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-slate-900" />
                </span>
                <span className="text-blue-50 text-sm">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-blue-300 text-sm">© 2026 RecantoCare · Gestão e conformidade para ILPIs</p>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-amber-400 text-slate-900 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-6 text-sm font-semibold">
            <Rocket className="h-4 w-4 flex-shrink-0" />
            Ambiente de demonstração — dados fictícios, nada é salvo
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-7">
              <div className="inline-flex w-14 h-14 bg-blue-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
                <HeartPulse className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Acesso do Administrador</h2>
              <p className="text-slate-400 text-sm mt-1">RecantoCare — Painel de demonstração</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow flex items-center justify-center gap-2"
              >
                {loading ? 'Entrando...' : <>Entrar como Administrador <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-5">Credenciais já preenchidas — é só entrar.</p>
          </div>

          <button
            onClick={() => go(ROUTES.home)}
            className="w-full mt-5 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar ao site
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoLogin;
