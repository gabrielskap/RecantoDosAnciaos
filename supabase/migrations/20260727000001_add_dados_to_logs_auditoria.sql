-- ==========================================================================
-- Log de auditoria: payload estruturado por registro
-- Descrição: acrescenta uma coluna JSONB para guardar o snapshot completo do
-- registro criado/editado/removido (ex.: leitura de glicemia, visita), e não
-- apenas o resumo em texto de `details`. `details` é lossy por natureza
-- (arredonda para uma frase legível e descarta campos como unidade/tipo de
-- insulina ou o id do registro); `dados` é o que qualquer rotina de
-- recuperação futura deve ler, evitando ter que reconstruir a informação via
-- regex sobre texto livre — como foi necessário ao restaurar registros de
-- glicemia apagados por um bug de sincronização.
-- ==========================================================================

ALTER TABLE "Recanto_LogsAuditoria" ADD COLUMN IF NOT EXISTS dados JSONB;

COMMENT ON COLUMN "Recanto_LogsAuditoria".dados IS
  'Snapshot estruturado do registro no momento da ação (ex.: {"id":..,"value":140,"moment":"pre_prandial",...}), usado para reconstrução exata caso o dado original seja perdido.';
