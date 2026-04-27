/*
  # Agent Status Schema

  Stores aggregated agent connectivity data from the "Resumen de Estado por Agente" report.
  Only the three fields the business cares about are persisted:
    - connected  = en la cola + fuera de la cola
    - in_queue   = time available for / receiving calls
    - out_of_queue = connected but not taking calls (other tasks)
*/

CREATE TABLE IF NOT EXISTS agent_status_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  record_count int NOT NULL DEFAULT 0,
  date_range_start date,
  date_range_end date
);

ALTER TABLE agent_status_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read agent status uploads"
  ON agent_status_uploads FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert agent status uploads"
  ON agent_status_uploads FOR INSERT TO anon WITH CHECK (true);

CREATE TABLE IF NOT EXISTS agent_status_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES agent_status_uploads(id) ON DELETE CASCADE,
  agent_id text NOT NULL DEFAULT '',
  agent_name text NOT NULL DEFAULT '',
  date_range_start date,
  date_range_end date,
  connected_seconds int NOT NULL DEFAULT 0,
  in_queue_seconds int NOT NULL DEFAULT 0,
  out_of_queue_seconds int NOT NULL DEFAULT 0
);

ALTER TABLE agent_status_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read agent status records"
  ON agent_status_records FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert agent status records"
  ON agent_status_records FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_status_records_upload_id ON agent_status_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_records_agent_name ON agent_status_records(agent_name);
