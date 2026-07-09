-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Corrige criação de Contratos/Mensalidades
-- Data: 2026-07-09
-- Descrição: A migration 20260617000011 adicionou empresa_id em
--            Recanto_Contratos e Recanto_Mensalidades sem um DEFAULT,
--            diferente das demais tabelas operacionais (que usam
--            DEFAULT public.recanto_get_empresa_id()). Como o app não
--            envia empresa_id explicitamente no INSERT, a coluna ficava
--            NULL e a policy RESTRICTIVE "WITH CHECK (empresa_id = ...)"
--            bloqueava a criação de contratos (e das mensalidades
--            geradas automaticamente pelo trigger).
-- ==========================================================================

ALTER TABLE public."Recanto_Contratos"
  ALTER COLUMN empresa_id SET DEFAULT public.recanto_get_empresa_id();

ALTER TABLE public."Recanto_Mensalidades"
  ALTER COLUMN empresa_id SET DEFAULT public.recanto_get_empresa_id();
