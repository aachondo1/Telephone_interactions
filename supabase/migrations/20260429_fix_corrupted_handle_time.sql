-- ARCHIVO: supabase/migrations/20260429_fix_corrupted_handle_time.sql
-- DESCRIPCIÓN: Corregir datos corruptos ANTES de agregar constraints
-- Esto debe ejecutarse ANTES de 20260428_add_data_integrity_constraints.sql

-- ============================================================================
-- FIX 1: Actualizar handle_time corrupto (handle_time < duration)
-- ============================================================================

UPDATE call_records
SET
  handle_time_seconds = duration_seconds + 45,
  data_quality_flags = COALESCE(data_quality_flags, '{}'::jsonb) || '{"handle_time_corrupted": true}'::jsonb,
  handle_time_is_corrected = true
WHERE
  attended = true
  AND handle_time_seconds > 0
  AND handle_time_seconds < duration_seconds;

-- Log cuántos registros fueron corregidos
SELECT COUNT(*) as corrected_records
FROM call_records
WHERE data_quality_flags -> 'handle_time_corrupted' = 'true';

-- ============================================================================
-- FIX 2: Corregir attended=true con duration=0
-- ============================================================================

UPDATE call_records
SET
  attended = false,
  data_quality_flags = COALESCE(data_quality_flags, '{}'::jsonb) || '{"attended_without_duration": true}'::jsonb
WHERE
  attended = true
  AND duration_seconds = 0;

-- ============================================================================
-- FIX 3: Marcar salientes con queue_time (anomalía)
-- ============================================================================

UPDATE call_records
SET
  data_quality_flags = COALESCE(data_quality_flags, '{}'::jsonb) || '{"outbound_with_queue": true}'::jsonb
WHERE
  (call_direction ILIKE '%saliente%' OR call_direction ILIKE '%outbound%')
  AND queue_time_seconds > 0;

-- ============================================================================
-- VERIFICACIÓN: Contar anomalías detectadas
-- ============================================================================

SELECT
  SUM(CASE WHEN data_quality_flags -> 'handle_time_corrupted' = 'true' THEN 1 ELSE 0 END) as handle_time_issues,
  SUM(CASE WHEN data_quality_flags -> 'attended_without_duration' = 'true' THEN 1 ELSE 0 END) as attended_no_duration,
  SUM(CASE WHEN data_quality_flags -> 'outbound_with_queue' = 'true' THEN 1 ELSE 0 END) as outbound_queue_issues,
  COUNT(*) as total_records
FROM call_records;
