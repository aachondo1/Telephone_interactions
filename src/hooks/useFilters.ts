import { useState, useMemo } from 'react';
import { DEFAULT_FILTERS, applyFilters, type FilterState } from '../lib/filterUtils';
import type { CallRecord, AgentStatusRecord } from '../lib/supabase';

export function useFilters(records: CallRecord[], agentStatusRecords: AgentStatusRecord[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filteredRecords = useMemo(
    () => applyFilters(records, filters),
    [records, filters]
  );

  // skipDateFilter=true: ExecutiveDashboard aplica su propio rango para calcular deltas de período anterior
  const baseFilteredRecords = useMemo(
    () => applyFilters(records, filters, true),
    [records, filters]
  );

  // AgentStatusRecord es agregado por upload (sin granularidad diaria),
  // se incluye si su período se superpone con el rango seleccionado.
  const filteredAgentStatusRecords = useMemo(() => {
    const { dateStart, dateEnd, executives } = filters;
    if (!dateStart && !dateEnd && executives.length === 0) return agentStatusRecords;

    return agentStatusRecords.filter(r => {
      let dateMatch = true;
      if (dateStart || dateEnd) {
        const rStart = (r.date_range_start ?? '').slice(0, 10);
        const rEnd   = (r.date_range_end   ?? '').slice(0, 10);
        if (rStart || rEnd) {
          const filterStart = dateStart ? dateStart.slice(0, 10) : '';
          const filterEnd   = dateEnd   ? dateEnd.slice(0, 10)   : '';
          const overlapEnd   = !filterStart || !rEnd   || rEnd   >= filterStart;
          const overlapStart = !filterEnd   || !rStart || rStart <= filterEnd;
          dateMatch = overlapEnd && overlapStart;
        }
      }

      let execMatch = true;
      if (executives.length > 0) {
        const lowerExecutives = executives.map((e: string) => e.toLowerCase().trim());
        const lowerAgentName = (r.agent_name || '').toLowerCase().trim();
        execMatch = lowerExecutives.includes(lowerAgentName);
      }

      return dateMatch && execMatch;
    });
  }, [agentStatusRecords, filters]);

  return { filters, setFilters, filteredRecords, baseFilteredRecords, filteredAgentStatusRecords };
}
