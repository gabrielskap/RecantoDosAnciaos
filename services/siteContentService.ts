import { supabase } from './supabaseClient';
import type { PlanoId, PlanoView } from '../types';

// ─── Conteúdo de texto (público) ───────────────────────────────────────────────

export async function getConteudoSite(): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('Recanto_ConteudoSite')
    .select('secao, conteudo');
  if (error || !data) return {};
  return Object.fromEntries(data.map((row: any) => [row.secao, row.conteudo]));
}

// ─── Imagens (público) ─────────────────────────────────────────────────────────

export interface ImagemSite {
  url: string | null;
  alt_text: string | null;
}

export async function getImagensSite(): Promise<Record<string, ImagemSite>> {
  const { data, error } = await supabase
    .from('Recanto_ImagensSite')
    .select('chave, url, alt_text');
  if (error || !data) return {};
  return Object.fromEntries(
    data.map((row: any) => [row.chave, { url: row.url, alt_text: row.alt_text }])
  );
}

// ─── Catálogo de planos (público) ──────────────────────────────────────────────

const PLANO_ORDER = ['essencial', 'profissional', 'enterprise'];

export async function getPlanosPublicos(): Promise<PlanoView[] | null> {
  const { data, error } = await supabase
    .from('Recanto_Planos')
    .select('plano_id, plano_nome, preco_mensal, preco_anual_total, preco_mensal_equivalente_anual, self_service, descricao, features, popular, badge_label, cta_label, max_residentes, max_usuarios')
    .eq('ativo', true);
  if (error || !data || data.length === 0) return null;

  const mapped: PlanoView[] = data.map((p: any) => ({
    id: p.plano_id as PlanoId,
    nome: p.plano_nome,
    precoMensal: Number(p.preco_mensal) || 0,
    precoMensalAnual: Number(p.preco_mensal_equivalente_anual) || Number(p.preco_mensal) || 0,
    precoAnualTotal: Number(p.preco_anual_total) || 0,
    selfService: p.self_service !== false,
    desc: p.descricao ?? '',
    features: Array.isArray(p.features) ? p.features : [],
    popular: p.popular === true,
    badgeLabel: p.badge_label ?? null,
    ctaLabel: p.cta_label ?? 'Assinar agora',
    maxResidentes: p.max_residentes ?? null,
    maxUsuarios: p.max_usuarios ?? null,
  }));

  mapped.sort((a, b) => PLANO_ORDER.indexOf(a.id) - PLANO_ORDER.indexOf(b.id));
  return mapped;
}

// ─── Administração (superadmin) ────────────────────────────────────────────────

export async function superadminUpsertConteudoSite(secao: string, conteudo: unknown): Promise<boolean> {
  const { data, error } = await supabase.rpc('superadmin_upsert_conteudo_site', {
    p_secao: secao,
    p_conteudo: conteudo,
  });
  if (error) throw error;
  return data as boolean;
}

export async function superadminGetConteudoSite(): Promise<Record<string, any>> {
  const { data, error } = await supabase.rpc('superadmin_get_conteudo_site');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row: any) => [row.secao, row.conteudo]));
}

export async function superadminGetImagensSite(): Promise<Record<string, ImagemSite>> {
  const { data, error } = await supabase.rpc('superadmin_get_imagens_site');
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((row: any) => [row.chave, { url: row.url, alt_text: row.alt_text }])
  );
}

export async function superadminUpsertImagemSite(
  chave: string,
  url: string | null,
  altText?: string | null
): Promise<boolean> {
  const { data, error } = await supabase.rpc('superadmin_upsert_imagem_site', {
    p_chave: chave,
    p_url: url,
    p_alt_text: altText ?? null,
  });
  if (error) throw error;
  return data as boolean;
}

// Faz upload de uma imagem para o bucket público site-assets e retorna a URL pública.
export async function uploadSiteImage(chave: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${chave}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;

  const { error: uploadErr } = await supabase.storage
    .from('site-assets')
    .upload(filePath, file, { contentType: file.type || 'image/jpeg', upsert: true });

  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function removeSiteImage(chave: string): Promise<boolean> {
  return superadminUpsertImagemSite(chave, null, null);
}
