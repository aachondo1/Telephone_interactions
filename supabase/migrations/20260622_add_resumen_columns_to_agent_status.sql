-- Support "Resumen de estados del agente" import format from Genesys Cloud.
-- This format provides occupancy, not-responding time, and login/logout timestamps
-- instead of the traditional connected/in-queue/out-of-queue duration columns.

ALTER TABLE agent_status_records
  ADD COLUMN IF NOT EXISTS no_respond_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS occupancy          DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS login_time         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS logout_time        TIMESTAMPTZ;
