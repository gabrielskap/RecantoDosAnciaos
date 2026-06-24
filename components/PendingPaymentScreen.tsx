import React, { useState } from 'react';
import { HeartPulse, Clock, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../services/toast';

/**
 * Tela exibida ao administrador cujo pagamento ainda não foi confirmado.
 * Enquanto a assinatura Asaas estiver pendente (accessBlocked = true), nenhum
 * módulo interno é acessível. O acesso é liberado automaticamente assim que o
 * webhook do Asaas confirmar o pagamento.
 */
const PendingPaymentScreen: React.FC = () => {
  const { refreshAccessStatus, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await refreshAccessStatus();
      // Se o pagamento foi confirmado, esta tela é desmontada automaticamente
      // (accessBlocked → false). Caso contrário, segue pendente.
      toast.info('Status atualizado. Se o pagamento já foi confirmado, o acesso será liberado em instantes.');
    } catch {
      toast.error('Não foi possível verificar o status agora. Tente novamente em instantes.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <HeartPulse className="h-8 w-8 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">RecantoCare</span>
        </div>

        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">Pagamento pendente</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Estamos aguardando a confirmação do seu pagamento. Assim que ele for
          compensado, o seu acesso ao sistema será liberado automaticamente — você
          não precisa fazer nada.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-blue-700 leading-relaxed">
            Pagamentos via <strong>PIX</strong> costumam ser confirmados em poucos minutos.
            <strong> Boletos</strong> podem levar até 2 dias úteis. Cartões aguardam a
            confirmação da operadora.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Verificando...' : 'Já paguei? Atualizar'}</span>
          </button>
          <button
            onClick={() => logout()}
            className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium py-3 rounded-xl transition-all text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      <p className="text-blue-200 text-xs mt-6">
        Precisa de ajuda? Fale com o suporte: suporte@recantocare.com.br
      </p>
    </div>
  );
};

export default PendingPaymentScreen;
