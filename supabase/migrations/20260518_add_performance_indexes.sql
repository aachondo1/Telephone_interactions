-- Phase 3: composite indexes for performance optimization

-- Speeds up Erlang-C demand calculation (attended calls by date+hour)
CREATE INDEX IF NOT EXISTS idx_call_records_date_hour
  ON call_records(call_date, call_hour);

-- Speeds up executive stats queries by date
CREATE INDEX IF NOT EXISTS idx_call_records_date_executive
  ON call_records(call_date, executive);

-- Speeds up queue KPI calculations filtering by queue and attendance
CREATE INDEX IF NOT EXISTS idx_call_records_queue_attended
  ON call_records(queue, attended);

-- Speeds up getAgentCountsByHourAndDay: avoids two separate single-column scans
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_hourly_date_hour
  ON agent_connectivity_hourly(date, hour);

-- Speeds up status filter in getAgentCountsByHourAndDay
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_hourly_status_date
  ON agent_connectivity_hourly(status, date);
