-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Tabela de assinaturas de documentos
-- Data: 2026-06-22
-- Descrição: Registra cada assinatura eletrônica realizada sobre documentos
--            da plataforma (boletins, prontuários, etc.).
--
--            Suporta dois tipos de assinatura:
--              'simples'        — registra nome, CPF e horário do servidor.
--              'certificado_a1' — assinatura com certificado ICP-Brasil A1.
--
--            Cada linha é um registro imutável de auditoria; sem UPDATE/DELETE.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.documento_assinaturas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       text        NOT NULL,
  documento_id     text        NOT NULL,
  usuario_id       uuid        NOT NULL,
  nome_assinante   text        NOT NULL,
  cpf_assinante    text        NOT NULL,
  tipo_assinatura  text        NOT NULL
    CONSTRAINT chk_doc_tipo_assinatura
      CHECK (tipo_assinatura IN ('simples', 'certificado_a1')),
  assinado_em      timestamptz NOT NULL DEFAULT now(),
  ip               text,
  user_agent       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas por empresa e por documento
CREATE INDEX IF NOT EXISTS idx_doc_assinaturas_empresa
  ON public.documento_assinaturas (empresa_id);

CREATE INDEX IF NOT EXISTS idx_doc_assinaturas_documento
  ON public.documento_assinaturas (documento_id);

CREATE INDEX IF NOT EXISTS idx_doc_assinaturas_usuario
  ON public.documento_assinaturas (usuario_id);

-- RLS
ALTER TABLE public.documento_assinaturas ENABLE ROW LEVEL SECURITY;

-- Inserção: usuário autenticado só pode registrar a própria assinatura
CREATE POLICY "doc_assinaturas_insert_own"
  ON public.documento_assinaturas
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Leitura: usuários autenticados veem somente assinaturas da sua empresa
CREATE POLICY "doc_assinaturas_select_empresa"
  ON public.documento_assinaturas
  FOR SELECT TO authenticated
  USING (empresa_id = public.recanto_get_empresa_id());
