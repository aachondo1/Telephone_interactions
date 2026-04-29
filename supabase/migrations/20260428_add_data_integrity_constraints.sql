-- ARCHIVO: supabase/migrations/20260428_add_data_integrity_constraints.sql
-- DESCRIPCIÓN: Agregar constraints y tabla de auditoría para prevenir datos corruptos

-- ============================================================================
-- TABLA 1: import_audit_log - Registrar anomalías de cada importación
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL,
  total_anomalies int NOT NULL DEFAULT 0,
  critical_count int NOT NULL DEFAULT 0,
  warning_count int NOT NULL DEFAULT 0,
  anomaly_breakdown jsonb,  -- {"handle_time_lt_duration": 3154, "outbound_has_queue_time": 50, ...}
  details_json jsonb,  -- Array completo de anomalías
  created_at timestamptz DEFAULT now(),

  CONSTRAINT fk_upload_id FOREIGN KEY (upload_id)
    REFERENCES call_uploads(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_log_upload
  ON import_audit_log(upload_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_critical
  ON import_audit_log(critical_count)
  WHERE critical_count > 0;
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON import_audit_log(created_at DESC);

-- ============================================================================
-- TABLE 2: data_quality_metrics - Métricas de calidad por período
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_date date NOT NULL,
  total_records int,
  outbound_calls int,
  inbound_calls int,
  handle_time_corrupted_count int,
  technical_cuts_count int,
  unclassified_abandons_count int,
  data_quality_score numeric(5,2),  -- 0-100
  warnings jsonb,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT unique_period UNIQUE(period_date)
);

CREATE INDEX IF NOT EXISTS idx_quality_date ON data_quality_metrics(period_date);

-- ============================================================================
-- CONSTRAINT 1: handle_time >= duration para llamadas atendidas
-- ============================================================================

ALTER TABLE call_records
ADD CONSTRAINT check_handle_time_vs_duration
CHECK (
  -- Si la llamada NO fue atendida, ignorar esta regla
  attended = false
  -- Si fue atendida, handle_time debe ser >= duration
  -- EXCEPTO si handle_time = 0 (dato incompleto desde Genesys)
  OR handle_time_seconds >= duration_seconds
  OR handle_time_seconds = 0
);

-- ============================================================================
-- CONSTRAINT 2: duration > 0 para llamadas atendidas
-- ============================================================================

ALTER TABLE call_records
ADD CONSTRAINT check_attended_requires_duration
CHECK (
  attended = false
  OR duration_seconds > 0
);

-- ============================================================================
-- CONSTRAINT 3: salientes NO tienen queue_time
-- ============================================================================

ALTER TABLE call_records
ADD CONSTRAINT check_outbound_no_queue
CHECK (
  -- Si es saliente, queue_time DEBE ser 0
  (call_direction NOT ILIKE '%saliente%' AND call_direction NOT ILIKE '%outbound%')
  OR queue_time_seconds = 0
);

-- ============================================================================
-- CONSTRAINT 4: Llamadas atendidas deben tener alert_time >= 0
-- ============================================================================

ALTER TABLE call_records
ADD CONSTRAINT check_attended_has_alert_time
CHECK (
  attended = false
  OR alert_time_seconds >= 0
);

-- ============================================================================
-- COLUMNAS AUXILIARES: Agregar flags de data quality
-- ============================================================================

-- Agregar columnas si no existen
ALTER TABLE call_records
ADD COLUMN IF NOT EXISTS data_quality_flags jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS handle_time_is_corrected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS was_excluded_from_kpi boolean DEFAULT false;

-- ============================================================================
-- VISTA: Resumen de anomalías por día
-- ============================================================================

CREATE OR REPLACE VIEW v_daily_anomalies AS
SELECT
  DATE(call_date) as day,
  COUNT(*) as total_calls,
  SUM(CASE WHEN handle_time_seconds < duration_seconds AND handle_time_seconds > 0 THEN 1 ELSE 0 END) as handle_time_corrupted,
  SUM(CASE WHEN attended AND duration_seconds BETWEEN 1 AND 5 AND alert_time_seconds = 0 THEN 1 ELSE 0 END) as technical_cuts,
  SUM(CASE WHEN call_direction ILIKE '%saliente%' THEN 1 ELSE 0 END) as outbound_count,
  SUM(CASE WHEN NOT attended AND abandon_type IS NULL THEN 1 ELSE 0 END) as unclassified_abandons
FROM call_records
GROUP BY DATE(call_date)
ORDER BY day DESC;

-- ============================================================================
-- VISTA: Data quality score por mes
-- ============================================================================

CREATE OR REPLACE VIEW v_monthly_data_quality AS
SELECT
  DATE_TRUNC('month', call_date)::date as month,
  COUNT(*) as total_records,
  ROUND(100.0 * SUM(CASE WHEN attended THEN 1 ELSE 0 END) / COUNT(*), 1) as attendance_rate,
  ROUND(100.0 * SUM(CASE WHEN handle_time_seconds >= duration_seconds OR handle_time_seconds = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) as valid_handle_time_pct,
  ROUND(100.0 * SUM(CASE WHEN abandon_type IS NOT NULL OR attended THEN 1 ELSE 0 END) / COUNT(*), 1) as classified_rate
FROM call_records
GROUP BY DATE_TRUNC('month', call_date)
ORDER BY month DESC;

-- ============================================================================
-- FUNCIÓN: Calcular data quality score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_data_quality_score(
  p_date date
)
RETURNS numeric AS $$
DECLARE
  v_total int;
  v_valid_handle_time int;
  v_no_technical_cuts int;
  v_classified_abandons int;
  v_inbound_only int;
  v_score numeric;
BEGIN
  SELECT COUNT(*) INTO v_total FROM call_records WHERE DATE(call_date) = p_date;

  IF v_total = 0 THEN RETURN 0; END IF;

  -- % con handle_time válido
  SELECT COUNT(*) INTO v_valid_handle_time
  FROM call_records
  WHERE DATE(call_date) = p_date
    AND (handle_time_seconds >= duration_seconds OR handle_time_seconds = 0);

  -- % sin cortes técnicos
  SELECT COUNT(*) INTO v_no_technical_cuts
  FROM call_records
  WHERE DATE(call_date) = p_date
    AND NOT (attended AND duration_seconds BETWEEN 1 AND 5 AND alert_time_seconds = 0);

  -- % abandonos clasificados
  SELECT COUNT(*) INTO v_classified_abandons
  FROM call_records
  WHERE DATE(call_date) = p_date
    AND (attended OR abandon_type IS NOT NULL);

  -- % solo entrantes válidos
  SELECT COUNT(*) INTO v_inbound_only
  FROM call_records
  WHERE DATE(call_date) = p_date
    AND NOT (call_direction ILIKE '%saliente%');

  -- Score = promedio ponderado de los 4 factores
  v_score := (
    (v_valid_handle_time::numeric / v_total) * 0.3 +
    (v_no_technical_cuts::numeric / v_total) * 0.3 +
    (v_classified_abandons::numeric / v_total) * 0.2 +
    (v_inbound_only::numeric / v_total) * 0.2
  ) * 100;

  RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Log de anomalía a import_audit_log
-- ============================================================================

CREATE OR REPLACE FUNCTION log_import_anomaly(
  p_upload_id uuid,
  p_anomaly_type text,
  p_affected_count int,
  p_severity text,
  p_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO import_audit_log (
    upload_id,
    anomaly_breakdown,
    details_json,
    critical_count,
    warning_count
  ) VALUES (
    p_upload_id,
    jsonb_build_object(p_anomaly_type, p_affected_count),
    jsonb_build_array(jsonb_build_object(
      'type', p_anomaly_type,
      'count', p_affected_count,
      'severity', p_severity,
      'details', p_details,
      'timestamp', now()
    )),
    CASE WHEN p_severity = 'CRITICAL' THEN p_affected_count ELSE 0 END,
    CASE WHEN p_severity = 'WARNING' THEN p_affected_count ELSE 0 END
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Detectar y marcar anomalías al insertar
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_call_record_anomalies()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag si handle_time es sospechosamente pequeño
  IF NEW.attended AND
     NEW.handle_time_seconds > 0 AND
     NEW.handle_time_seconds < NEW.duration_seconds THEN
    NEW.data_quality_flags :=
      jsonb_set(NEW.data_quality_flags, '{handle_time_corrupted}', 'true');
    NEW.handle_time_is_corrected := true;
  END IF;

  -- Flag si es probable corte técnico
  IF NEW.attended AND
     NEW.duration_seconds >= 1 AND
     NEW.duration_seconds <= 5 AND
     NEW.alert_time_seconds = 0 THEN
    NEW.data_quality_flags :=
      jsonb_set(NEW.data_quality_flags, '{technical_cut}', 'true');
  END IF;

  -- Flag si saliente tiene queue_time (anomalía)
  IF (NEW.call_direction ILIKE '%saliente%' OR
      NEW.call_direction ILIKE '%outbound%') AND
     NEW.queue_time_seconds > 0 THEN
    NEW.data_quality_flags :=
      jsonb_set(NEW.data_quality_flags, '{outbound_with_queue}', 'true');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trg_detect_anomalies ON call_records;
CREATE TRIGGER trg_detect_anomalies
  BEFORE INSERT OR UPDATE ON call_records
  FOR EACH ROW
  EXECUTE FUNCTION detect_call_record_anomalies();

-- ============================================================================
-- REPORTE: Resumen de integridad de datos
-- ============================================================================

CREATE OR REPLACE VIEW v_data_integrity_summary AS
SELECT
  DATE(call_date) as day,
  COUNT(*) as total_records,
  COUNT(DISTINCT upload_id) as uploads_count,
  SUM(CASE WHEN attended THEN 1 ELSE 0 END) as attended_count,
  ROUND(100.0 * SUM(CASE WHEN attended THEN 1 ELSE 0 END) / COUNT(*), 1) as attendance_rate,
  SUM(CASE WHEN data_quality_flags -> 'handle_time_corrupted' = 'true' THEN 1 ELSE 0 END) as problematic_handle_times,
  SUM(CASE WHEN data_quality_flags -> 'technical_cut' = 'true' THEN 1 ELSE 0 END) as technical_cuts,
  SUM(CASE WHEN data_quality_flags -> 'outbound_with_queue' = 'true' THEN 1 ELSE 0 END) as anomalous_outbounds,
  calculate_data_quality_score(DATE(call_date)) as data_quality_score
FROM call_records
GROUP BY DATE(call_date)
ORDER BY day DESC;

-- ============================================================================
-- ROLLBACK: Si algo falla, aquí están los comandos para revertir
-- ============================================================================
/*
-- DROP VIEW IF EXISTS v_data_integrity_summary;
-- DROP FUNCTION IF EXISTS calculate_data_quality_score(date);
-- DROP FUNCTION IF EXISTS log_import_anomaly(uuid, text, int, text, jsonb);
-- DROP TRIGGER IF EXISTS trg_detect_anomalies ON call_records;
-- DROP FUNCTION IF EXISTS detect_call_record_anomalies();
-- DROP TABLE IF EXISTS data_quality_metrics;
-- DROP TABLE IF EXISTS import_audit_log;
-- ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_outbound_no_queue;
-- ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_attended_has_alert_time;
-- ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_attended_requires_duration;
-- ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_handle_time_vs_duration;
-- ALTER TABLE call_records DROP COLUMN IF EXISTS was_excluded_from_kpi;
-- ALTER TABLE call_records DROP COLUMN IF EXISTS handle_time_is_corrected;
-- ALTER TABLE call_records DROP COLUMN IF EXISTS data_quality_flags;
*/
