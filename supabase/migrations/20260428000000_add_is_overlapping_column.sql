/*
  # Add is_overlapping column to call_records

  Adds the `is_overlapping` column to track calls that overlap with other calls
  from the same executive on the same day.
*/

-- Add is_overlapping column to call_records
ALTER TABLE call_records
ADD COLUMN IF NOT EXISTS is_overlapping boolean NOT NULL DEFAULT false;

-- Create index for filtering overlapping calls
CREATE INDEX IF NOT EXISTS idx_call_records_is_overlapping
  ON call_records(is_overlapping);
