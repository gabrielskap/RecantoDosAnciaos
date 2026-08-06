import { supabase } from './supabaseClient';

const TABLE = 'recanto_medicamentos_anvisa';

export interface AnvisaMedication {
  id: number;
  nomeProduto: string;
  complementoMarca?: string;
  principioAtivo: string;
  tipoRegularizacao: string;
  situacaoRegularizacao: string;
}

const normalizeSearch = (value: string) =>
  value.trim().replace(/[,%_()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);

/** Busca enxuta para o autocomplete, sem transferir o catálogo completo ao navegador. */
export async function searchAnvisaMedications(search: string, limit = 20): Promise<AnvisaMedication[]> {
  const term = normalizeSearch(search);
  if (term.length < 2) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('id,nome_produto,complemento_marca,principio_ativo,tipo_regularizacao,situacao_regularizacao')
    .ilike('nome_produto', `%${term}%`)
    .order('nome_produto', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const seen = new Set<string>();
  return (data || []).flatMap((row: any) => {
    const key = `${row.nome_produto || ''}|${row.complemento_marca || ''}`.toLocaleLowerCase('pt-BR');
    if (!row.nome_produto || seen.has(key)) return [];
    seen.add(key);
    return [{
      id: Number(row.id),
      nomeProduto: row.nome_produto,
      complementoMarca: row.complemento_marca || undefined,
      principioAtivo: row.principio_ativo,
      tipoRegularizacao: row.tipo_regularizacao,
      situacaoRegularizacao: row.situacao_regularizacao,
    }];
  });
}
