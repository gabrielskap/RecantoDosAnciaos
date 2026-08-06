import { supabase } from './supabaseClient';

async function invokePasswordRecovery(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('RecantoDosAnciaos_password-recovery', { body });
  if (error || !data?.ok) {
    let message = data?.error as string | undefined;
    const response = (error as any)?.context;
    if (!message && response instanceof Response) {
      try {
        const payload = await response.clone().json();
        message = payload?.error;
      } catch {
        // Mantém a mensagem genérica quando a função não retorna JSON.
      }
    }
    throw new Error(message || 'Não foi possível concluir a recuperação. Tente novamente.');
  }
}

export function requestPasswordRecovery(email: string) {
  return invokePasswordRecovery({ action: 'request', email });
}

export function confirmPasswordRecovery(email: string, code: string, password: string) {
  return invokePasswordRecovery({ action: 'confirm', email, code, password });
}
