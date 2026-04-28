-- Clean Database Script
-- This script deletes all data while preserving the table structure
-- Can be run directly in Supabase SQL Editor

-- Disable foreign key constraints temporarily (if needed)
-- Note: Supabase/PostgreSQL handles CASCADE automatically

-- Delete records in order of dependencies
DELETE FROM processed_call_signatures;
DELETE FROM call_records;
DELETE FROM call_uploads;
DELETE FROM agent_status_records;
DELETE FROM agent_status_uploads;

-- Verify deletion
SELECT 'call_uploads' as table_name, COUNT(*) as row_count FROM call_uploads
UNION ALL
SELECT 'call_records', COUNT(*) FROM call_records
UNION ALL
SELECT 'processed_call_signatures', COUNT(*) FROM processed_call_signatures
UNION ALL
SELECT 'agent_status_uploads', COUNT(*) FROM agent_status_uploads
UNION ALL
SELECT 'agent_status_records', COUNT(*) FROM agent_status_records;
