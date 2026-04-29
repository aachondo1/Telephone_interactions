-- Eliminar constraint rígida que bloquea inserción
ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_outbound_no_queue;

-- Actualizar el trigger para que CORRIJA automáticamente en lugar de solo marcar
CREATE OR REPLACE FUNCTION detect_call_record_anomalies()
RETURNS TRIGGER AS $$
BEGIN
  -- Corregir automáticamente: salientes NO deben tener queue_time
  IF (NEW.call_direction ILIKE '%saliente%' OR NEW.call_direction ILIKE '%outbound%') AND
     NEW.queue_time_seconds > 0 THEN
    NEW.data_quality_flags :=
      jsonb_set(COALESCE(NEW.data_quality_flags, '{}'), '{outbound_with_queue}', 'true');
    NEW.queue_time_seconds := 0;  -- Corregir automáticamente
  END IF;

  -- Flag si handle_time es sospechosamente pequeño
  IF NEW.attended AND
     NEW.handle_time_seconds > 0 AND
     NEW.handle_time_seconds < NEW.duration_seconds THEN
    NEW.data_quality_flags :=
      jsonb_set(COALESCE(NEW.data_quality_flags, '{}'), '{handle_time_corrupted}', 'true');
    NEW.handle_time_is_corrected := true;
  END IF;

  -- Flag si es probable corte técnico
  IF NEW.attended AND
     NEW.duration_seconds >= 1 AND
     NEW.duration_seconds <= 5 AND
     NEW.alert_time_seconds = 0 THEN
    NEW.data_quality_flags :=
      jsonb_set(COALESCE(NEW.data_quality_flags, '{}'), '{technical_cut}', 'true');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
