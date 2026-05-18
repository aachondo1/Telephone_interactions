import { useState, useEffect } from 'react';
import { calculateKPIs, getEmptyKPISummary } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';

export function useKPIs(filteredRecords: CallRecord[]) {
  const [kpis, setKpis] = useState(() => getEmptyKPISummary());

  useEffect(() => {
    calculateKPIs(filteredRecords)
      .then(result => setKpis(result))
      .catch(err => console.error('Error calculating KPIs:', err));
  }, [filteredRecords]);

  return { kpis };
}
