-- Audit script to debug occupancy calculation for specific executives

-- 1. Check if handle_time_seconds is populated
SELECT
  executive,
  count(*) as total_calls,
  count(CASE WHEN handle_time_seconds > 0 THEN 1 END) as calls_with_handle_time,
  count(CASE WHEN handle_time_seconds = 0 THEN 1 END) as calls_with_zero_handle_time,
  count(CASE WHEN handle_time_seconds IS NULL THEN 1 END) as calls_with_null_handle_time,
  round(avg(CASE WHEN handle_time_seconds > 0 THEN handle_time_seconds ELSE NULL END)) as avg_handle_time_when_present,
  round(avg(duration_seconds)) as avg_duration_seconds
FROM call_records
WHERE executive IN ('Ana Farías Escobar', 'Mixsi Alarcón Romero', 'Francisca Soto Tabach')
  AND attended = true
GROUP BY executive
ORDER BY executive;

-- 2. Check alert_time_seconds as well
SELECT
  executive,
  count(*) as total_calls,
  count(CASE WHEN alert_time_seconds > 0 THEN 1 END) as calls_with_alert_time,
  round(avg(CASE WHEN alert_time_seconds > 0 THEN alert_time_seconds ELSE NULL END)) as avg_alert_time_when_present
FROM call_records
WHERE executive IN ('Ana Farías Escobar', 'Mixsi Alarcón Romero', 'Francisca Soto Tabach')
  AND attended = true
GROUP BY executive
ORDER BY executive;

-- 3. Check activity by week for Ana Farías (sample)
SELECT
  DATE_TRUNC('week', call_date)::date as week_start,
  count(*) as calls_that_week,
  count(DISTINCT call_date) as days_with_calls,
  round(sum(COALESCE(handle_time_seconds, duration_seconds))::numeric / 60) as total_minutes_week
FROM call_records
WHERE executive = 'Ana Farías Escobar'
  AND attended = true
GROUP BY DATE_TRUNC('week', call_date)
ORDER BY week_start DESC;
