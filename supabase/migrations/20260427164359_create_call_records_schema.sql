/*
  # Call Records Dashboard Schema

  ## Summary
  Creates the database schema for the telephone interaction dashboard.

  ## New Tables

  ### `call_uploads`
  Stores metadata for each CSV file upload session.
  - `id` (uuid, primary key)
  - `filename` (text) - original CSV filename
  - `uploaded_at` (timestamptz) - when the file was uploaded
  - `record_count` (int) - total number of records in this upload
  - `date_range_start` (date) - earliest call date in the dataset
  - `date_range_end` (date) - latest call date in the dataset

  ### `call_records`
  Stores individual call records, normalized and anonymized.
  - `id` (uuid, primary key)
  - `upload_id` (uuid, FK to call_uploads) - which upload this belongs to
  - `call_date` (date) - extracted call date
  - `call_time` (time) - extracted call time
  - `call_hour` (smallint) - hour of day (0-23) for distribution charts
  - `executive` (text) - individual executive name (one record per executive per call)
  - `original_call_id` (text) - identifier to group multi-executive calls
  - `ani_hash` (text) - SHA-256 hash of the phone number for anonymization
  - `ani_masked` (text) - partially masked number e.g. +56 9 XXXX 4567
  - `call_direction` (text) - 'inbound' or 'outbound'
  - `queue` (text) - call queue / department
  - `duration_seconds` (int) - normalized duration in seconds
  - `duration_formatted` (text) - human-readable duration MM:SS or HH:MM:SS
  - `attended` (boolean) - false if no executive answered (SIN ATENDER)
  - `export_complete` (boolean) - whether "Exportacion completa" is SÍ

  ## Security
  - RLS enabled on both tables
  - Public read/insert policies (tool is publicly accessible, no auth)
  - No delete policy to protect historical data (only via explicit admin action)
*/

-- Call uploads table
CREATE TABLE IF NOT EXISTS call_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  record_count int NOT NULL DEFAULT 0,
  date_range_start date,
  date_range_end date
);

ALTER TABLE call_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read call uploads"
  ON call_uploads FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert call uploads"
  ON call_uploads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Call records table
CREATE TABLE IF NOT EXISTS call_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES call_uploads(id) ON DELETE CASCADE,
  call_date date,
  call_time time,
  call_hour smallint,
  executive text NOT NULL DEFAULT '',
  original_call_id text NOT NULL DEFAULT '',
  ani_hash text NOT NULL DEFAULT '',
  ani_masked text NOT NULL DEFAULT '',
  call_direction text NOT NULL DEFAULT '',
  queue text NOT NULL DEFAULT '',
  duration_seconds int NOT NULL DEFAULT 0,
  duration_formatted text NOT NULL DEFAULT '00:00',
  attended boolean NOT NULL DEFAULT true,
  export_complete boolean NOT NULL DEFAULT false
);

ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read call records"
  ON call_records FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert call records"
  ON call_records FOR INSERT
  TO anon
  WITH CHECK (true);

-- Index for fast filtering by upload
CREATE INDEX IF NOT EXISTS idx_call_records_upload_id ON call_records(upload_id);
-- Index for hourly distribution queries
CREATE INDEX IF NOT EXISTS idx_call_records_call_hour ON call_records(call_hour);
-- Index for executive queries
CREATE INDEX IF NOT EXISTS idx_call_records_executive ON call_records(executive);
-- Index for queue queries
CREATE INDEX IF NOT EXISTS idx_call_records_queue ON call_records(queue);
