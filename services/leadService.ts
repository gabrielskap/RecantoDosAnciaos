import { supabase } from './supabaseClient';

export interface LeadInput {
  email: string;
  origem: string;
  dados?: Record<string, unknown>;
}

/**
 * Persiste um lead de marketing (best-effort). NUNCA lança nem bloqueia a
 * navegação: se a tabela ainda não existir (migration não aplicada) ou a rede
 * falhar, apenas registra um aviso no console.
 */
export async function createLead(input: LeadInput): Promise<void> {
  try {
    const { error } = await supabase.from('Recanto_Leads').insert({
      email: input.email || null,
      origem: input.origem,
      dados: input.dados ?? {},
    });
    if (error) console.warn('Falha ao registrar lead (ignorado):', error.message);
  } catch (err) {
    console.warn('Falha ao registrar lead (ignorado):', err);
  }
}
