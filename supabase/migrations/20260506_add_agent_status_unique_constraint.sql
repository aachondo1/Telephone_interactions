-- Add unique constraint to prevent duplicate agent status records
-- Ensures that (agent_id, date_range_start, date_range_end) combination is unique
-- This prevents the same executive from being loaded multiple times with the same date range

ALTER TABLE agent_status_records
ADD CONSTRAINT unique_agent_date_range UNIQUE (agent_id, date_range_start, date_range_end);

-- Create index to support the unique constraint (Postgres does this automatically, but explicit is better)
CREATE INDEX IF NOT EXISTS idx_agent_status_unique_check
ON agent_status_records(agent_id, date_range_start, date_range_end);
