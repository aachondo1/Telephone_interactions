/*
  # Add Deduplication Tracking

  1. New Tables
    - `processed_call_signatures` - Tracks the last processed call for deduplication
      - `id` (uuid, primary key)
      - `ani_hash` (text) - Hashed phone number
      - `call_date` (date)
      - `call_time` (text)
      - `last_upload_id` (uuid) - FK to call_uploads
      - `processed_at` (timestamp)

  2. Indexes
    - Unique index on (ani_hash, call_date, call_time) for fast dedup lookups
    - Index on call_records (ani_hash, call_date, call_time) for integrity

  3. Security
    - Enable RLS on processed_call_signatures
    - Add policy for read/write access to call management operations
*/

-- Create processed_call_signatures table
CREATE TABLE IF NOT EXISTS processed_call_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ani_hash text NOT NULL,
  call_date date NOT NULL,
  call_time text NOT NULL,
  last_upload_id uuid NOT NULL REFERENCES call_uploads(id) ON DELETE RESTRICT,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create unique constraint for fast deduplication lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_calls_unique
  ON processed_call_signatures(ani_hash, call_date, call_time);

-- Index on call_records for query efficiency
CREATE INDEX IF NOT EXISTS idx_call_records_signature
  ON call_records(ani_hash, call_date, call_time);

-- Enable RLS
ALTER TABLE processed_call_signatures ENABLE ROW LEVEL SECURITY;

-- Allow operations (simplified policy for system operations)
CREATE POLICY "Allow processed call operations"
  ON processed_call_signatures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);