import {
  deleteComplianceStorageObject,
  getComplianceDocumentUrl,
  supabase,
} from './supabaseClient';

const TABLE = 'Recanto_DocumentosConformidade';

export type ComplianceDocumentType = 'licenca' | 'ilpi';

export interface ComplianceDocument {
  id: string;
  type: ComplianceDocumentType;
  storagePath: string;
  fileName: string;
  validade: string;
  fileUrl: string;
}

type ComplianceRow = {
  id: string;
  tipo: ComplianceDocumentType;
  caminho_arquivo: string;
  nome_arquivo: string;
  validade: string | null;
};

const mapRow = async (row: ComplianceRow): Promise<ComplianceDocument> => ({
  id: row.id,
  type: row.tipo,
  storagePath: row.caminho_arquivo,
  fileName: row.nome_arquivo,
  validade: row.validade ?? '',
  fileUrl: await getComplianceDocumentUrl(row.caminho_arquivo),
});

export async function fetchComplianceDocuments(empresaId: string): Promise<ComplianceDocument[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, tipo, caminho_arquivo, nome_arquivo, validade')
    .eq('empresa_id', empresaId);

  if (error) throw error;
  return Promise.all((data as ComplianceRow[] ?? []).map(mapRow));
}

export async function saveComplianceDocument(input: {
  empresaId: string;
  type: ComplianceDocumentType;
  storagePath: string;
  fileName: string;
  validade: string;
}): Promise<ComplianceDocument> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      empresa_id: input.empresaId,
      tipo: input.type,
      caminho_arquivo: input.storagePath,
      nome_arquivo: input.fileName,
      validade: input.validade || null,
    }, { onConflict: 'empresa_id,tipo' })
    .select('id, tipo, caminho_arquivo, nome_arquivo, validade')
    .single();

  if (error) throw error;
  return mapRow(data as ComplianceRow);
}

export async function removeComplianceDocument(document: ComplianceDocument): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', document.id);

  if (error) throw error;

  try {
    await deleteComplianceStorageObject(document.storagePath);
  } catch (storageError) {
    // O vínculo canônico já foi removido do banco. Não restaura a referência
    // caso a limpeza física falhe, evitando que o navegador volte a exibir
    // um documento já excluído.
    console.warn('Documento de conformidade removido do banco, mas não do Storage:', storageError);
  }
}
