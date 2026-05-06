-- Add unique protection against duplicate agent status records.
--
-- Standard UNIQUE constraints treat NULL as distinct (NULL != NULL in SQL), so
-- UNIQUE(agent_id, date_range_start, date_range_end) would NOT prevent duplicates
-- when date columns are NULL (common in aggregated exports without date headers).
--
-- A functional unique index with COALESCE maps NULLs to a sentinel date,
-- making them comparable and truly preventing duplicates.

CREATE UNIQUE INDEX IF NOT EXISTS unique_agent_date_range
ON agent_status_records(
    agent_id,
    COALESCE(date_range_start, '1900-01-01'::date),
    COALESCE(date_range_end,   '1900-01-01'::date)
);
