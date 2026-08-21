import { supabase } from './supabaseClient';
import type { MedicamentoInventarioItem, MedicamentoMovimentacao, MedicamentoMovTipo } from '../types';

const INV_TABLE = 'Recanto_InventarioMedicamentos';
const MOV_TABLE = 'Recanto_MovimentacoesMedicamento';

// ── Mapeamento snake_case (Supabase) → camelCase ────────────────────────────

function mapMovimentacaoRow(row: any): MedicamentoMovimentacao {
  return {
    id: row.id,
    tipo: row.tipo,
    quantidadeUnidades: Number(row.quantidade_unidades),
    data: row.data || row.created_at,
    userName: row.user_name || undefined,
    notas: row.notas || undefined,
    origemChecklistId: row.origem_checklist_id || undefined,
    origemItemId: row.origem_item_id || undefined,
  };
}

function mapInventarioRow(row: any): MedicamentoInventarioItem {
  return {
    id: row.id,
    empresaId: row.empresa_id || undefined,
    residentId: row.resident_id || undefined,
    medicacaoId: row.medicacao_id || undefined,
    nome: row.nome,
    principioAtivo: row.principio_ativo || undefined,
    forma: row.forma,
    concentracaoValor: Number(row.concentracao_valor),
    concentracaoUnidade: row.concentracao_unidade || 'mg',
    unidadesPorEmbalagem: row.unidades_por_embalagem != null ? Number(row.unidades_por_embalagem) : undefined,
    saldoUnidades: Number(row.saldo_unidades),
    estoqueMinimoUnidades: Number(row.estoque_minimo_unidades),
    dosePorTomada: row.dose_por_tomada != null ? Number(row.dose_por_tomada) : undefined,
    tomadasPorDia: row.tomadas_por_dia != null ? Number(row.tomadas_por_dia) : undefined,
    validade: row.validade || undefined,
    lote: row.lote || undefined,
    observacoes: row.observacoes || undefined,
    movimentacoes: (row.movimentacoes || [])
      .map(mapMovimentacaoRow)
      .sort((a: MedicamentoMovimentacao, b: MedicamentoMovimentacao) =>
        new Date(b.data).getTime() - new Date(a.data).getTime()),
  };
}

// ── Cálculo puro (compartilhado pela aba e pela baixa do boletim) ───────────

/** Unidades farmacêuticas consumidas por tomada. Ex.: 20 mg / 10 mg = 2 comprimidos. */
export function unidadesPorTomada(inv: Pick<MedicamentoInventarioItem, 'dosePorTomada' | 'concentracaoValor'>): number | null {
  if (!inv.dosePorTomada || !inv.concentracaoValor || inv.concentracaoValor <= 0 || inv.dosePorTomada <= 0) return null;
  const u = inv.dosePorTomada / inv.concentracaoValor;
  return Number.isFinite(u) && u > 0 ? u : null;
}

/** Consumo diário em unidades. Ex.: 2 comprimidos × 1 tomada = 2/dia. */
export function consumoDiario(inv: Pick<MedicamentoInventarioItem, 'dosePorTomada' | 'concentracaoValor' | 'tomadasPorDia'>): number | null {
  const upt = unidadesPorTomada(inv);
  if (upt == null || !inv.tomadasPorDia || inv.tomadasPorDia <= 0) return null;
  const c = upt * inv.tomadasPorDia;
  return Number.isFinite(c) && c > 0 ? c : null;
}

/** Dias de cobertura com o saldo atual. Ex.: 12 / 2 = 6 dias. */
export function diasCobertura(inv: Pick<MedicamentoInventarioItem, 'dosePorTomada' | 'concentracaoValor' | 'tomadasPorDia' | 'saldoUnidades'>): number | null {
  const c = consumoDiario(inv);
  if (c == null || c <= 0 || !Number.isFinite(c)) return null;
  if (!Number.isFinite(inv.saldoUnidades) || inv.saldoUnidades <= 0) return 0;
  const dias = Math.floor(inv.saldoUnidades / c);
  return Number.isFinite(dias) && dias >= 0 ? dias : null;
}

/** Data prevista de término (YYYY-MM-DD) a partir de `from` (default hoje). */
export function dataTerminoPrevista(
  inv: Pick<MedicamentoInventarioItem, 'dosePorTomada' | 'concentracaoValor' | 'tomadasPorDia' | 'saldoUnidades'>,
  from: Date = new Date()
): string | null {
  const dias = diasCobertura(inv);
  if (dias == null || !Number.isFinite(dias) || dias < 0) return null;
  // Limita a 365.000 dias (~1.000 anos) para evitar RangeError: Invalid time value em Date.toISOString()
  if (dias > 365000) return null;
  try {
    const d = new Date(from);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dias);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

export function isBaixoEstoque(inv: Pick<MedicamentoInventarioItem, 'saldoUnidades' | 'estoqueMinimoUnidades'>): boolean {
  if (!Number.isFinite(inv.saldoUnidades) || !Number.isFinite(inv.estoqueMinimoUnidades)) return false;
  return inv.saldoUnidades <= inv.estoqueMinimoUnidades;
}

export function isVencido(inv: Pick<MedicamentoInventarioItem, 'validade'>): boolean {
  if (!inv.validade) return false;
  try {
    const today = new Date().toISOString().split('T')[0];
    return inv.validade < today;
  } catch {
    return false;
  }
}

/** Vence dentro de `dias` (default 30) e ainda não venceu. */
export function isVencendo(inv: Pick<MedicamentoInventarioItem, 'validade'>, dias = 30): boolean {
  if (!inv.validade) return false;
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + dias);
    const v = new Date(inv.validade + 'T00:00:00');
    if (isNaN(v.getTime())) return false;
    return v >= hoje && v <= limite;
  } catch {
    return false;
  }
}

/** Limiar (em dias de cobertura) para alertar que o medicamento está próximo de acabar. */
export const LIMITE_DIAS_REPOSICAO = 7;

type ItemReposicao = Pick<MedicamentoInventarioItem, 'dosePorTomada' | 'concentracaoValor' | 'tomadasPorDia' | 'saldoUnidades' | 'estoqueMinimoUnidades'>;

/**
 * Medicamento próximo de acabar: esgotado, com cobertura ≤ limiteDias, ou
 * abaixo do estoque mínimo (fallback para itens sem posologia definida).
 */
export function precisaReposicao(inv: ItemReposicao, limiteDias = LIMITE_DIAS_REPOSICAO): boolean {
  if (!Number.isFinite(inv.saldoUnidades) || inv.saldoUnidades <= 0) return true;
  const dias = diasCobertura(inv);
  if (dias != null && Number.isFinite(dias) && dias <= limiteDias) return true;
  return isBaixoEstoque(inv);
}

/** Motivo do alerta de reposição, para exibição. Retorna null quando não há alerta. */
export function motivoReposicao(inv: ItemReposicao, limiteDias = LIMITE_DIAS_REPOSICAO): { label: string; critico: boolean } | null {
  if (!Number.isFinite(inv.saldoUnidades) || inv.saldoUnidades <= 0) return { label: 'Esgotado', critico: true };
  const dias = diasCobertura(inv);
  if (dias != null && Number.isFinite(dias) && dias <= limiteDias) {
    return { label: `Acaba em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, critico: dias <= 2 };
  }
  if (isBaixoEstoque(inv)) return { label: 'Abaixo do mínimo', critico: false };
  return null;
}

// ── Leitura ─────────────────────────────────────────────────────────────────

export async function fetchInventario(empresaId?: string): Promise<MedicamentoInventarioItem[]> {
  let query = supabase
    .from(INV_TABLE)
    .select(`*, movimentacoes:${MOV_TABLE}(*)`)
    .order('nome', { ascending: true });

  if (empresaId) query = query.eq('empresa_id', empresaId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapInventarioRow);
}

/**
 * Resolve o item de inventário que deve ser debitado para um item do boletim.
 * Prioriza o vínculo pela prescrição (medicacao_id); cai para resident_id + nome.
 */
export async function fetchInventarioParaMedicacao(
  medicacaoId: string | undefined,
  residentId: string | undefined,
  nome?: string
): Promise<MedicamentoInventarioItem | null> {
  if (medicacaoId) {
    const { data, error } = await supabase.from(INV_TABLE).select('*').eq('medicacao_id', medicacaoId).limit(1);
    if (error) throw error;
    if (data && data.length > 0) return mapInventarioRow(data[0]);
  }
  if (residentId && nome) {
    const { data, error } = await supabase
      .from(INV_TABLE)
      .select('*')
      .eq('resident_id', residentId)
      .ilike('nome', nome.trim())
      .limit(1);
    if (error) throw error;
    if (data && data.length > 0) return mapInventarioRow(data[0]);
  }
  return null;
}

// ── Escrita ──────────────────────────────────────────────────────────────────

export interface NovoInventarioInput {
  residentId?: string;
  medicacaoId?: string;
  nome: string;
  principioAtivo?: string;
  forma: MedicamentoInventarioItem['forma'];
  concentracaoValor: number;
  concentracaoUnidade: string;
  unidadesPorEmbalagem?: number;
  estoqueMinimoUnidades: number;
  dosePorTomada?: number;
  tomadasPorDia?: number;
  validade?: string;
  lote?: string;
  observacoes?: string;
}

/** Cria o medicamento e lança a entrada inicial (nº de embalagens × unidades/embalagem). */
export async function addInventarioItem(
  input: NovoInventarioInput,
  embalagensIniciais: number,
  userName?: string
): Promise<MedicamentoInventarioItem> {
  const { data: itemData, error: itemErr } = await supabase
    .from(INV_TABLE)
    .insert({
      resident_id: input.residentId || null,
      medicacao_id: input.medicacaoId || null,
      nome: input.nome,
      principio_ativo: input.principioAtivo || null,
      forma: input.forma,
      concentracao_valor: input.concentracaoValor,
      concentracao_unidade: input.concentracaoUnidade,
      unidades_por_embalagem: input.unidadesPorEmbalagem ?? null,
      estoque_minimo_unidades: input.estoqueMinimoUnidades,
      dose_por_tomada: input.dosePorTomada ?? null,
      tomadas_por_dia: input.tomadasPorDia ?? null,
      validade: input.validade || null,
      lote: input.lote || null,
      observacoes: input.observacoes || null,
    })
    .select()
    .single();

  if (itemErr || !itemData) throw itemErr;

  const unidadesEntrada = (embalagensIniciais || 0) * (input.unidadesPorEmbalagem || 0);
  if (unidadesEntrada > 0) {
    await registrarMovimentacao(itemData.id, 'entrada', unidadesEntrada, userName, 'Cadastro inicial');
  }

  return mapInventarioRow(itemData);
}

/** Registra uma movimentação avulsa (manual). O saldo é atualizado pelo trigger. */
export async function registrarMovimentacao(
  inventarioId: string,
  tipo: MedicamentoMovTipo,
  quantidadeUnidades: number,
  userName?: string,
  notas?: string
): Promise<void> {
  const { error } = await supabase.from(MOV_TABLE).insert({
    inventario_id: inventarioId,
    tipo,
    quantidade_unidades: quantidadeUnidades,
    user_name: userName || null,
    notas: notas || null,
  });
  if (error) throw error;
}

/**
 * Baixa idempotente disparada por um item "tomou" do boletim. Reabrir/salvar o
 * boletim não duplica a baixa (UNIQUE origem_checklist_id + origem_item_id).
 */
export async function debitarPorBoletim(
  inventarioId: string,
  quantidadeUnidades: number,
  checklistId: string,
  itemId: string,
  userName?: string
): Promise<void> {
  const { error } = await supabase
    .from(MOV_TABLE)
    .upsert(
      {
        inventario_id: inventarioId,
        tipo: 'administracao',
        quantidade_unidades: quantidadeUnidades,
        user_name: userName || null,
        notas: 'Baixa automática pelo boletim (Tomou)',
        origem_checklist_id: checklistId,
        origem_item_id: itemId,
      },
      { onConflict: 'origem_checklist_id,origem_item_id', ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function updateInventarioPosologia(
  inventarioId: string,
  fields: Partial<Pick<MedicamentoInventarioItem, 'dosePorTomada' | 'tomadasPorDia' | 'estoqueMinimoUnidades' | 'validade' | 'lote' | 'medicacaoId' | 'observacoes'>>
): Promise<void> {
  const payload: Record<string, any> = {};
  if (fields.dosePorTomada !== undefined) payload.dose_por_tomada = fields.dosePorTomada ?? null;
  if (fields.tomadasPorDia !== undefined) payload.tomadas_por_dia = fields.tomadasPorDia ?? null;
  if (fields.estoqueMinimoUnidades !== undefined) payload.estoque_minimo_unidades = fields.estoqueMinimoUnidades;
  if (fields.validade !== undefined) payload.validade = fields.validade || null;
  if (fields.lote !== undefined) payload.lote = fields.lote || null;
  if (fields.medicacaoId !== undefined) payload.medicacao_id = fields.medicacaoId || null;
  if (fields.observacoes !== undefined) payload.observacoes = fields.observacoes || null;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from(INV_TABLE).update(payload).eq('id', inventarioId);
  if (error) throw error;
}

export async function deleteInventarioItem(inventarioId: string): Promise<void> {
  const { error } = await supabase.from(INV_TABLE).delete().eq('id', inventarioId);
  if (error) throw error;
}

/** Prescrições do residente (para vincular medicacao_id no cadastro). */
export async function fetchPrescricoesResidente(
  residentId: string
): Promise<{ id: string; name: string; dosage: string; frequency: string }[]> {
  const { data, error } = await supabase
    .from('Recanto_Medicacoes')
    .select('id, name, dosage, frequency')
    .eq('resident_id', residentId);
  if (error) throw error;
  return (data || []).map((m: any) => ({ id: m.id, name: m.name, dosage: m.dosage, frequency: m.frequency }));
}
