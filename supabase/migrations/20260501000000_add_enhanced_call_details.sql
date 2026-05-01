-- Add enhanced call detail columns for improved analytics
-- Includes IVR tracking, disconnection type, transfer info, and timing details

ALTER TABLE call_records
  ADD COLUMN ivr_total_seconds INT DEFAULT 0,
  ADD COLUMN users_not_respond TEXT,
  ADD COLUMN transfers INT DEFAULT 0,
  ADD COLUMN abandon_time_seconds INT DEFAULT 0,
  ADD COLUMN conversation_total_seconds INT DEFAULT 0,
  ADD COLUMN disconnection_type TEXT,
  ADD COLUMN finalization_date DATE,
  ADD COLUMN partial_result_timestamp TIMESTAMPTZ,
  ADD COLUMN filters TEXT,
  ADD COLUMN campaign TEXT,
  ADD COLUMN conversation_initiator TEXT;

-- Create indexes for common filters on new columns
CREATE INDEX idx_call_records_ivr_total ON call_records(ivr_total_seconds);
CREATE INDEX idx_call_records_disconnection_type ON call_records(disconnection_type);
CREATE INDEX idx_call_records_transfers ON call_records(transfers);
CREATE INDEX idx_call_records_campaign ON call_records(campaign);
CREATE INDEX idx_call_records_finalization_date ON call_records(finalization_date);
