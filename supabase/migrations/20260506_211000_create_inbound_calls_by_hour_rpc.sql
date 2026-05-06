/*
  Create RPC function to get inbound calls grouped by date and hour

  Used by dead availability detection to cross-reference agent connectivity
  with actual call volume. If an hour has zero inbound calls but the agent
  was available, that time is "dead availability" and shouldn't count against occupancy.
*/

CREATE OR REPLACE FUNCTION get_inbound_calls_by_hour(
  date_start date,
  date_end date
)
RETURNS TABLE (
  date date,
  hour smallint,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    call_records.call_date,
    call_records.call_hour,
    COUNT(*) as count
  FROM call_records
  WHERE call_records.call_direction = 'inbound'
    AND call_records.call_date >= date_start
    AND call_records.call_date <= date_end
  GROUP BY call_records.call_date, call_records.call_hour
  ORDER BY call_records.call_date, call_records.call_hour;
END;
$$ LANGUAGE plpgsql;
