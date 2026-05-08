-- Add status_secondary column to agent_connectivity_raw
-- Stores secondary status from Genesys Cloud exports
-- e.g. 'Gestión Administrativa', 'Web', null when not provided or same as primary

ALTER TABLE agent_connectivity_raw
  ADD COLUMN IF NOT EXISTS status_secondary text;

COMMENT ON TABLE agent_connectivity_raw IS
  'Raw agent status events from Genesys Cloud CSV exports. All statuses including Desconectado are stored.';
