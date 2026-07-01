-- Alter type recanto_acao_permissao to support 'sign' action
ALTER TYPE public.recanto_acao_permissao ADD VALUE IF NOT EXISTS 'sign';
