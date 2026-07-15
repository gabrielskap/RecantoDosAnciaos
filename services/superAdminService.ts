import { supabase } from './supabaseClient';

export interface DashboardKPIs {
  total_empresas: number;
  empresas_ativas: number;
  empresas_trial: number;
  empresas_suspensas: number;
  mrr_total: number;
  arr_estimado: number;
  total_residentes: number;
  total_usuarios: number;
}

export interface Empresa {
  id: string;
  empresa_id: string;
  nome_instituicao: string;
  cnpj: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  email_comercial: string | null;
  status: string;
  plano_id: string | null;
  plano_nome: string | null;
  valor_mensal: number | null;
  subscription_status: string | null;
  data_vencimento: string | null;
  qtd_residentes: number;
  qtd_usuarios: number;
  created_at: string;
  // --- Gateway de pagamento (Asaas) ---
  gateway_pagamento?: string | null;
  gateway_customer_id?: string | null;
  gateway_subscription_id?: string | null;
  gateway_payment_id?: string | null;
  forma_pagamento?: string | null;
}

export interface ActivityItem {
  id: string;
  empresa_id: string;
  nome_instituicao: string | null;
  tipo: string;
  descricao: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BillingPlan {
  plano_id: string;
  plano_nome: string;
  count: number;
  mrr: number;
}

export interface BillingSubscription {
  nome_instituicao: string;
  plano_nome: string | null;
  valor_mensal: number | null;
  status: string;
  data_vencimento: string | null;
  email_comercial: string | null;
}

export interface BillingOverview {
  by_plan: BillingPlan[];
  subscriptions: BillingSubscription[];
}

export interface AccessLog {
  id: string;
  empresa_id: string;
  nome_instituicao: string | null;
  user_name: string;
  role: string;
  action: string;
  ip_address: string | null;
  created_at: string;
}

export async function getSuperAdminKPIs(): Promise<DashboardKPIs> {
  const { data, error } = await supabase.rpc('superadmin_get_dashboard_kpis');
  if (error) throw error;
  return data as DashboardKPIs;
}

export async function getSuperAdminEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.rpc('superadmin_get_empresas');
  if (error) throw error;
  return (data ?? []) as Empresa[];
}

export async function getSuperAdminRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const { data, error } = await supabase.rpc('superadmin_get_recent_activity', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as ActivityItem[];
}

export async function getSuperAdminBillingOverview(): Promise<BillingOverview> {
  const { data, error } = await supabase.rpc('superadmin_get_billing_overview');
  if (error) throw error;
  const result = data as BillingOverview;
  return {
    by_plan: result?.by_plan ?? [],
    subscriptions: result?.subscriptions ?? [],
  };
}

export async function getSuperAdminAccessLogs(limit = 50): Promise<AccessLog[]> {
  const { data, error } = await supabase.rpc('superadmin_get_access_logs', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as AccessLog[];
}

export async function updateEmpresaStatus(
  empresaId: string,
  novoStatus: string,
  motivo?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('superadmin_update_empresa_status', {
    p_empresa_id:  empresaId,
    p_novo_status: novoStatus,
    p_motivo:      motivo ?? null,
  });
  if (error) throw error;
  return data as boolean;
}

export async function updateEmpresaDetails(
  empresaId: string,
  fields: {
    nome_instituicao?: string;
    email_comercial?: string;
    cidade?: string;
    estado?: string;
    cnpj?: string;
    telefone?: string;
  }
): Promise<boolean> {
  const { data, error } = await supabase.rpc('superadmin_update_empresa_details', {
    p_empresa_id:       empresaId,
    p_nome_instituicao: fields.nome_instituicao ?? null,
    p_email_comercial:  fields.email_comercial  ?? null,
    p_cidade:           fields.cidade           ?? null,
    p_estado:           fields.estado           ?? null,
    p_cnpj:             fields.cnpj             ?? null,
    p_telefone:         fields.telefone         ?? null,
  });
  if (error) throw error;
  return data as boolean;
}

export interface CreateEmpresaParams {
  nome_instituicao: string;
  email_comercial?: string;
  cidade?: string;
  estado?: string;
  cnpj?: string;
  telefone?: string;
  plano_id: string;
  plano_nome: string;
  valor_mensal: number;
  status_inicial: 'ativa' | 'em_trial' | 'pendente';
}

export async function createEmpresa(params: CreateEmpresaParams): Promise<string> {
  const { data, error } = await supabase.rpc('superadmin_create_empresa', {
    p_nome_instituicao: params.nome_instituicao,
    p_email_comercial:  params.email_comercial  ?? null,
    p_cidade:           params.cidade           ?? null,
    p_estado:           params.estado           ?? null,
    p_cnpj:             params.cnpj             ?? null,
    p_telefone:         params.telefone         ?? null,
    p_plano_id:         params.plano_id,
    p_plano_nome:       params.plano_nome,
    p_valor_mensal:     params.valor_mensal,
    p_status_inicial:   params.status_inicial,
  });
  if (error) throw error;
  return data as string;
}

export interface PlanoAdmin {
  plano_id: string;
  plano_nome: string;
  preco_mensal: number;
  preco_anual_total: number;
  preco_mensal_equivalente_anual: number | null;
  ativo: boolean;
  self_service: boolean;
  descricao: string;
  features: string[];
  popular: boolean;
  badge_label: string | null;
  cta_label: string;
  max_residentes: number | null;
  max_usuarios: number | null;
  updated_at: string;
}

export async function superadminListPlanos(): Promise<PlanoAdmin[]> {
  const { data, error } = await supabase.rpc('superadmin_list_planos');
  if (error) throw error;
  return (data ?? []) as PlanoAdmin[];
}

export interface UpsertPlanoParams {
  plano_id: string;
  plano_nome: string;
  preco_mensal: number;
  preco_anual_total: number;
  preco_mensal_equivalente_anual?: number | null;
  ativo: boolean;
  self_service: boolean;
  descricao: string;
  features: string[];
  popular: boolean;
  badge_label?: string | null;
  cta_label: string;
  max_residentes?: number | null;
  max_usuarios?: number | null;
}

export async function superadminUpsertPlano(params: UpsertPlanoParams): Promise<boolean> {
  const { data, error } = await supabase.rpc('superadmin_upsert_plano', {
    p_plano_id:                       params.plano_id,
    p_plano_nome:                     params.plano_nome,
    p_preco_mensal:                   params.preco_mensal,
    p_preco_anual_total:              params.preco_anual_total,
    p_preco_mensal_equivalente_anual: params.preco_mensal_equivalente_anual ?? null,
    p_ativo:                          params.ativo,
    p_self_service:                   params.self_service,
    p_descricao:                      params.descricao,
    p_features:                       params.features,
    p_popular:                        params.popular,
    p_badge_label:                    params.badge_label ?? null,
    p_cta_label:                      params.cta_label,
    p_max_residentes:                 params.max_residentes ?? null,
    p_max_usuarios:                   params.max_usuarios ?? null,
  });
  if (error) throw error;
  return data as boolean;
}

export interface PlanoExcedente {
  empresa_id: string;
  nome_instituicao: string;
  qtd_residentes: number;
  qtd_usuarios: number;
}

export async function superadminCheckPlanoExcedentes(
  planoId: string,
  maxResidentes: number | null,
  maxUsuarios: number | null
): Promise<PlanoExcedente[]> {
  const { data, error } = await supabase.rpc('superadmin_planos_excedentes', {
    p_plano_id:       planoId,
    p_max_residentes: maxResidentes,
    p_max_usuarios:   maxUsuarios,
  });
  if (error) throw error;
  return (data ?? []) as PlanoExcedente[];
}

export async function updateAssinatura(
  empresaId: string,
  acao: string,
  params: {
    plano_id?: string;
    plano_nome?: string;
    valor_mensal?: number;
    dias_extensao?: number;
    motivo?: string;
  } = {}
): Promise<boolean> {
  const { data, error } = await supabase.rpc('superadmin_update_assinatura', {
    p_empresa_id:    empresaId,
    p_acao:          acao,
    p_plano_id:      params.plano_id      ?? null,
    p_plano_nome:    params.plano_nome    ?? null,
    p_valor_mensal:  params.valor_mensal  ?? null,
    p_dias_extensao: params.dias_extensao ?? null,
    p_motivo:        params.motivo        ?? null,
  });
  if (error) throw error;
  return data as boolean;
}
