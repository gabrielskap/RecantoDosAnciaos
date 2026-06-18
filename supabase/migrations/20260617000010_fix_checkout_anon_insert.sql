-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Correção de INSERT no Checkout para Usuários Anônimos
-- Data: 2026-06-17
-- Descrição:
--   O fluxo de checkout insere Recanto_Empresas e Recanto_Assinaturas ANTES
--   de autenticar o usuário (auth.signUp ocorre depois, pois o FK em
--   Recanto_Usuarios.empresa_id exige que a empresa já exista quando o trigger
--   handle_new_auth_user disparar).
--
--   A migração 20260617000009 removeu o INSERT para 'anon' partindo da premissa
--   errada de que o signUp ocorre antes da criação da empresa. Esta migração
--   restaura o INSERT anon apenas para as duas tabelas necessárias no checkout.
-- ==========================================================================

-- Recanto_Empresas: anon pode inserir durante o checkout
CREATE POLICY "empresa_insert_anon_checkout" ON public."Recanto_Empresas"
  FOR INSERT TO anon
  WITH CHECK (true);

-- Recanto_Assinaturas: anon pode inserir durante o checkout
CREATE POLICY "assinatura_insert_anon_checkout" ON public."Recanto_Assinaturas"
  FOR INSERT TO anon
  WITH CHECK (true);
