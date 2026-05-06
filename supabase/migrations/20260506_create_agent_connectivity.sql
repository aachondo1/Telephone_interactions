/*
  # Agent Connectivity Schema

  Stores agent status timeline data from "Resumen de línea de tiempo de estado de agente.csv"
  with hourly slicing to calculate real occupancy metrics.

  Rows where status = 'Desconectado' are filtered out at import time (not stored).
*/

CREATE TABLE IF NOT EXISTS agent_connectivity_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  record_count int NOT NULL DEFAULT 0,
  date_range_start date,
  date_range_end date
);

ALTER TABLE agent_connectivity_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read connectivity uploads"
  ON agent_connectivity_uploads FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert connectivity uploads"
  ON agent_connectivity_uploads FOR INSERT TO anon WITH CHECK (true);

/* Raw imported records from CSV */
CREATE TABLE IF NOT EXISTS agent_connectivity_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES agent_connectivity_uploads(id) ON DELETE CASCADE,
  agent_id text NOT NULL DEFAULT '',
  agent_name text NOT NULL DEFAULT '',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'Disponible',
  duration_raw int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_connectivity_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read raw connectivity"
  ON agent_connectivity_raw FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert raw connectivity"
  ON agent_connectivity_raw FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_connectivity_raw_upload_id ON agent_connectivity_raw(upload_id);
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_raw_agent_id ON agent_connectivity_raw(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_raw_start_time ON agent_connectivity_raw(start_time);

/* Hourly sliced data (calculated from raw records) */
CREATE TABLE IF NOT EXISTS agent_connectivity_hourly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES agent_connectivity_uploads(id) ON DELETE CASCADE,
  agent_id text NOT NULL DEFAULT '',
  agent_name text NOT NULL DEFAULT '',
  date date NOT NULL,
  hour int NOT NULL,
  status text NOT NULL DEFAULT 'Disponible',
  seconds_in_bucket int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_connectivity_hourly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hourly connectivity"
  ON agent_connectivity_hourly FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert hourly connectivity"
  ON agent_connectivity_hourly FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_connectivity_hourly_upload_id ON agent_connectivity_hourly(upload_id);
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_hourly_date ON agent_connectivity_hourly(date);
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_hourly_hour ON agent_connectivity_hourly(hour);
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_hourly_agent_id ON agent_connectivity_hourly(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_connectivity_hourly_status ON agent_connectivity_hourly(status);
