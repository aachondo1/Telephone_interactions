-- Add technical leak classification fields to call_records
-- This allows fast querying without recalculating on the frontend

ALTER TABLE call_records
  ADD COLUMN technical_leak_type TEXT,
  ADD COLUMN is_valid_for_sl BOOLEAN DEFAULT true;

-- Index for fast filtering
CREATE INDEX idx_call_records_technical_leak_type ON call_records(technical_leak_type);
CREATE INDEX idx_call_records_is_valid_for_sl ON call_records(is_valid_for_sl);

-- Comment on purpose
COMMENT ON COLUMN call_records.technical_leak_type IS 'Categoría de fuga técnica: short_abandon (< 5s), ivr_drop (flow_exit=false), o null si válida';
COMMENT ON COLUMN call_records.is_valid_for_sl IS 'Indica si la llamada debe contar para el Service Level% (excluye fugas técnicas)';
