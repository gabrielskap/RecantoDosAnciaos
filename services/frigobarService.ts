import { supabase } from './supabaseClient';
import type { FrigobarReading, FrigobarStatus } from '../types';

/**
 * Avalia o status de conformidade da temperatura com base nos limites da OMS (+2,0 °C a +8,0 °C)
 */
export function evaluateOmsStatus(temp: number): FrigobarStatus {
  if (temp < 2.0) {
    return 'alerta_frio';
  }
  if (temp > 8.0) {
    return 'alerta_quente';
  }
  return 'conforme';
}

/**
 * Mapeia linha do Supabase (snake_case) para interface FrigobarReading (camelCase)
 */
function mapFrigobarRow(row: any): FrigobarReading {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    equipamentoNome: row.equipamento_nome || 'Frigobar Enfermagem Principal',
    localizacao: row.localizacao || 'Posto de Enfermagem',
    dataHora: row.data_hora || row.created_at,
    turno: row.turno || 'diurno',
    temperaturaAtual: Number(row.temperatura_atual),
    temperaturaMinima: row.temperatura_minima != null ? Number(row.temperatura_minima) : undefined,
    temperaturaMaxima: row.temperatura_maxima != null ? Number(row.temperatura_maxima) : undefined,
    status: row.status || evaluateOmsStatus(Number(row.temperatura_atual)),
    responsavelNome: row.responsavel_nome || 'Profissional de Saúde',
    usuarioId: row.usuario_id || undefined,
    observacoes: row.observacoes || undefined,
    acaoCorretiva: row.acao_corretiva || undefined,
    createdAt: row.created_at
  };
}

// Cache local inicia completamente VAZIO (sem dados de demonstração)
let localReadingsCache: FrigobarReading[] = [];

/**
 * Busca histórico de medições de frigobar diretamente da tabela Recanto_ControleTemperaturaFrigobar
 */
export async function fetchFrigobarReadings(empresaId?: string): Promise<FrigobarReading[]> {
  try {
    let query = supabase
      .from('Recanto_ControleTemperaturaFrigobar')
      .select('*')
      .order('data_hora', { ascending: false });

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Erro ao consultar tabela Recanto_ControleTemperaturaFrigobar no Supabase:', error.message);
      return localReadingsCache;
    }

    if (data) {
      const readings = data.map(mapFrigobarRow);
      localReadingsCache = readings;
      return readings;
    }

    return [];
  } catch (err) {
    console.error('Erro ao buscar medições de frigobar:', err);
    return localReadingsCache;
  }
}

/**
 * Registra uma nova medição de temperatura de frigobar na tabela Recanto_ControleTemperaturaFrigobar
 */
export async function saveFrigobarReading(
  reading: Omit<FrigobarReading, 'id' | 'createdAt'>,
  empresaId?: string
): Promise<FrigobarReading> {
  const calculatedStatus = evaluateOmsStatus(reading.temperaturaAtual);

  const payload: any = {
    equipamento_nome: reading.equipamentoNome,
    localizacao: reading.localizacao || 'Posto de Enfermagem',
    data_hora: reading.dataHora || new Date().toISOString(),
    turno: reading.turno,
    temperatura_atual: reading.temperaturaAtual,
    temperatura_minima: reading.temperaturaMinima ?? null,
    temperatura_maxima: reading.temperaturaMaxima ?? null,
    status: calculatedStatus,
    responsavel_nome: reading.responsavelNome,
    usuario_id: reading.usuarioId ?? null,
    observacoes: reading.observacoes ?? null,
    acao_corretiva: reading.acaoCorretiva ?? null
  };

  if (empresaId) {
    payload.empresa_id = empresaId;
  }

  const { data, error } = await supabase
    .from('Recanto_ControleTemperaturaFrigobar')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('O banco não retornou a medição criada.');
  }

  const created = mapFrigobarRow(data);
  localReadingsCache = [created, ...localReadingsCache];
  return created;
}

/**
 * Remove uma medição de frigobar da tabela Recanto_ControleTemperaturaFrigobar
 */
export async function deleteFrigobarReading(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('Recanto_ControleTemperaturaFrigobar')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  localReadingsCache = localReadingsCache.filter(r => r.id !== id);
  return true;
}
