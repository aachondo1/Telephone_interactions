-- Fix: normalize call_direction and queue BEFORE grouping to prevent PK conflicts
-- when call_records contains both empty strings and their canonical equivalents.
-- Uses CTE to apply COALESCE once, then groups over the already-normalized values.

CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM daily_metrics;

  INSERT INTO daily_metrics (
    call_date, call_direction, queue,
    total_calls, attended_calls, abandoned_calls,
    avg_duration_seconds, avg_queue_time_seconds, avg_handle_time_seconds,
    total_duration_seconds, service_level_pct, refreshed_at
  )
  WITH normalized AS (
    SELECT
      call_date,
      COALESCE(NULLIF(call_direction, ''), 'inbound') AS call_direction,
      COALESCE(NULLIF(queue, ''),          'Sin cola') AS queue,
      attended,
      duration_seconds,
      queue_time_seconds,
      handle_time_seconds
    FROM call_records
    WHERE call_date IS NOT NULL
  )
  SELECT
    call_date,
    call_direction,
    queue,
    COUNT(*)                                                    AS total_calls,
    COUNT(*) FILTER (WHERE attended = TRUE)                     AS attended_calls,
    COUNT(*) FILTER (WHERE attended = FALSE)                    AS abandoned_calls,
    ROUND(AVG(duration_seconds)::numeric,    2)                 AS avg_duration_seconds,
    ROUND(AVG(queue_time_seconds)::numeric,  2)                 AS avg_queue_time_seconds,
    ROUND(AVG(handle_time_seconds)::numeric, 2)                 AS avg_handle_time_seconds,
    SUM(duration_seconds)                                       AS total_duration_seconds,
    ROUND(
      (COUNT(*) FILTER (WHERE attended = TRUE AND queue_time_seconds <= 30)
       * 100.0 / NULLIF(COUNT(*), 0))::numeric,
      2
    )                                                           AS service_level_pct,
    now()                                                       AS refreshed_at
  FROM  normalized
  GROUP BY call_date, call_direction, queue;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_queue_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM queue_metrics;

  INSERT INTO queue_metrics (
    call_date, call_hour, queue,
    total_calls, attended_calls, avg_queue_time_seconds,
    erlang_intensity, refreshed_at
  )
  WITH normalized AS (
    SELECT
      call_date,
      call_hour,
      COALESCE(NULLIF(queue, ''), 'Sin cola') AS queue,
      attended,
      queue_time_seconds,
      handle_time_seconds
    FROM call_records
    WHERE call_date IS NOT NULL
      AND call_hour IS NOT NULL
  )
  SELECT
    call_date,
    call_hour,
    queue,
    COUNT(*)                                           AS total_calls,
    COUNT(*) FILTER (WHERE attended = TRUE)            AS attended_calls,
    ROUND(AVG(queue_time_seconds)::numeric, 2)         AS avg_queue_time_seconds,
    ROUND(
      (SUM(handle_time_seconds) / 3600.0)::numeric,
      4
    )                                                  AS erlang_intensity,
    now()                                              AS refreshed_at
  FROM  normalized
  GROUP BY call_date, call_hour, queue;
END;
$$;

-- Align column default with the normalization applied in refresh functions
ALTER TABLE daily_metrics ALTER COLUMN queue SET DEFAULT 'Sin cola';
