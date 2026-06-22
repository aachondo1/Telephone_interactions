-- Fix 1: Add missing DELETE RLS policies so the delete-before-insert
-- deduplication pattern in saveAgentConnectivityUpload actually works.
-- Without these, Supabase silently returns 0 rows deleted (no error),
-- causing every re-upload to accumulate duplicate rows.

CREATE POLICY "Anyone can delete connectivity uploads"
  ON agent_connectivity_uploads FOR DELETE TO anon USING (true);

CREATE POLICY "Anyone can delete raw connectivity"
  ON agent_connectivity_raw FOR DELETE TO anon USING (true);

CREATE POLICY "Anyone can delete hourly connectivity"
  ON agent_connectivity_hourly FOR DELETE TO anon USING (true);

-- Same fix for agent_status tables (same RLS pattern, same risk)
CREATE POLICY "Anyone can delete agent status uploads"
  ON agent_status_uploads FOR DELETE TO anon USING (true);

CREATE POLICY "Anyone can delete agent status records"
  ON agent_status_records FOR DELETE TO anon USING (true);

-- Fix 2: Remove duplicate rows that accumulated from previous uploads
-- (keeps the row with the smallest id per unique slot)
WITH to_delete AS (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY agent_id, date, hour, status
             ORDER BY id
           ) AS rn
    FROM agent_connectivity_hourly
  ) ranked
  WHERE rn > 1
)
DELETE FROM agent_connectivity_hourly WHERE id IN (SELECT id FROM to_delete);

-- Fix 3: Add UNIQUE constraint so future inserts can use upsert safely
ALTER TABLE agent_connectivity_hourly
  ADD CONSTRAINT unique_hourly_slot UNIQUE (agent_id, date, hour, status);

-- Same dedup for raw events
WITH to_delete AS (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY agent_id, start_time, status
             ORDER BY id
           ) AS rn
    FROM agent_connectivity_raw
  ) ranked
  WHERE rn > 1
)
DELETE FROM agent_connectivity_raw WHERE id IN (SELECT id FROM to_delete);

ALTER TABLE agent_connectivity_raw
  ADD CONSTRAINT unique_raw_event UNIQUE (agent_id, start_time, status);
