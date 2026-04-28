-- Add Genesys-specific columns to call_records table
ALTER TABLE call_records
  ADD COLUMN queue_time_seconds INT DEFAULT 0,
  ADD COLUMN handle_time_seconds INT DEFAULT 0,
  ADD COLUMN alert_segments INT DEFAULT 1,
  ADD COLUMN alert_time_seconds INT DEFAULT 0,
  ADD COLUMN flow_exit BOOLEAN DEFAULT true,
  ADD COLUMN alerted_users TEXT,
  ADD COLUMN abandon_type TEXT,
  ADD COLUMN is_bounce BOOLEAN DEFAULT false,
  ADD COLUMN hold_time_seconds INT DEFAULT 0,
  ADD COLUMN acw_seconds INT DEFAULT 0;

-- Create indexes for common filters
CREATE INDEX idx_call_records_abandon_type ON call_records(abandon_type);
CREATE INDEX idx_call_records_is_bounce ON call_records(is_bounce);
CREATE INDEX idx_call_records_queue_time ON call_records(queue_time_seconds);
CREATE INDEX idx_call_records_handle_time ON call_records(handle_time_seconds);
CREATE INDEX idx_call_records_alert_segments ON call_records(alert_segments);
