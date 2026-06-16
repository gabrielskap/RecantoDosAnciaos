-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Remover Coluna de Assinatura do Usuário
-- Data: 2026-06-16
-- Descrição: Remove a coluna 'signature_image' da tabela 'Recanto_Usuarios'
-- ==========================================================================

ALTER TABLE public."Recanto_Usuarios" 
  DROP COLUMN IF EXISTS signature_image;
