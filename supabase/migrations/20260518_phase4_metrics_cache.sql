-- Phase 4.2: Metrics cache tables for scalable query performance
-- daily_metrics: pre-aggregated stats per day/direction/queue
-- queue_metrics: pre-aggregated stats per day/hour/queue
-- Both tables are rebuilt by refresh_all_metrics() after each CSV import

CREATE TABLE IF NOT EXISTS daily_metrics (
  call_date               date          NOT NULL,
  call_direction          text          NOT NULL DEFAULT 'inbound',
  queue                   text          NOT NULL DEFAULT '',
  total_calls             integer       NOT NULL DEFAULT 0,
  attended_calls          integer       NOT NULL DEFAULT 0,
  abandoned_calls         integer       NOT NULL DEFAULT 0,
  avg_duration_seconds    numeric(10,2) NOT NULL DEFAULT 0,
  avg_queue_time_seconds  numeric(10,2) NOT NULL DEFAULT 0,
  avg_handle_time_seconds numeric(10,2) NOT NULL DEFAULT 0,
  total_duration_seconds  bigint        NOT NULL DEFAULT 0,
  service_level_pct       numeric(5,2)  NOT NULL DEFAULT 0,
  refreshed_at            timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT daily_metrics_pkey PRIMARY KEY (call_date, call_direction, queue)
);

CREATE TABLE IF NOT EXISTS queue_metrics (
  call_date              date          NOT NULL,
  call_hour              integer       NOT NULL,
  queue                  text          NOT NULL,
  total_calls            integer       NOT NULL DEFAULT 0,
  attended_calls         integer       NOT NULL DEFAULT 0,
  avg_queue_time_seconds numeric(10,2) NOT NULL DEFAULT 0,
  erlang_intensity       numeric(10,4) NOT NULL DEFAULT 0,
  refreshed_at           timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT queue_metrics_pkey PRIMARY KEY (call_date, call_hour, queue)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date       ON daily_metrics(call_date);
CREATE INDEX IF NOT EXISTS idx_queue_metrics_date_queue ON queue_metrics(call_date, queue);

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_metrics  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_metrics' AND policyname = 'allow_all_daily_metrics'
  ) THEN
    CREATE POLICY allow_all_daily_metrics ON daily_metrics USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'queue_metrics' AND policyname = 'allow_all_queue_metrics'
  ) THEN
    CREATE POLICY allow_all_queue_metrics ON queue_metrics USING (true) WITH CHECK (true);
  END IF;
END $$;

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
  SELECT
    call_date,
    COALESCE(NULLIF(call_direction, ''), 'inbound') AS call_direction,
    COALESCE(NULLIF(queue, ''),          'Sin cola') AS queue,
    COUNT(*)                                          AS total_calls,
    COUNT(*) FILTER (WHERE attended = TRUE)           AS attended_calls,
    COUNT(*) FILTER (WHERE attended = FALSE)          AS abandoned_calls,
    ROUND(AVG(duration_seconds)::numeric,    2)       AS avg_duration_seconds,
    ROUND(AVG(queue_time_seconds)::numeric,  2)       AS avg_queue_time_seconds,
    ROUND(AVG(handle_time_seconds)::numeric, 2)       AS avg_handle_time_seconds,
    SUM(duration_seconds)                             AS total_duration_seconds,
    ROUND(
      (COUNT(*) FILTER (WHERE attended = TRUE AND queue_time_seconds <= 30)
       * 100.0 / NULLIF(COUNT(*), 0))::numeric,
      2
    )                                                 AS service_level_pct,
    now()                                             AS refreshed_at
  FROM  call_records
  WHERE call_date IS NOT NULL
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
  SELECT
    call_date,
    call_hour,
    COALESCE(NULLIF(queue, ''), 'Sin cola')           AS queue,
    COUNT(*)                                          AS total_calls,
    COUNT(*) FILTER (WHERE attended = TRUE)           AS attended_calls,
    ROUND(AVG(queue_time_seconds)::numeric, 2)        AS avg_queue_time_seconds,
    ROUND(
      (SUM(handle_time_seconds) / 3600.0)::numeric,
      4
    )                                                 AS erlang_intensity,
    now()                                             AS refreshed_at
  FROM  call_records
  WHERE call_date IS NOT NULL
    AND call_hour IS NOT NULL
  GROUP BY call_date, call_hour, queue;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_all_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM refresh_daily_metrics();
  PERFORM refresh_queue_metrics();
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_all_metrics()   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_daily_metrics() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_queue_metrics() TO authenticated, anon;
