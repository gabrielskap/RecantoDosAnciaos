-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Correção de Políticas de RLS para Perfis e Permissões
-- Data: 2026-06-15
-- Descrição: Permite que usuários autenticados (não apenas Administradores)
--            possam visualizar os perfis e suas permissões associadas.
--            Isso corrige o problema de "Sem Perfil" para usuários logados.
-- ==========================================================================

-- 1. Habilita a leitura da tabela de perfis para qualquer usuário autenticado
CREATE POLICY "perfis_select_auth" ON public."Recanto_Perfis" 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- 2. Habilita a leitura da tabela de permissões para qualquer usuário autenticado
CREATE POLICY "permissoes_select_auth" ON public."Recanto_Permissoes" 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);
