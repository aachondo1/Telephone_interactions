import { supabase } from '../supabase';

const _agentCountCache = new Map<string, Map<string, number>>();

export function clearAgentCountCache(): void {
  _agentCountCache.clear();
}

export async function getAgentCountsByHourAndDay(
  dateRange: { start: string; end: string } | null
): Promise<Map<string, number>> {
  const cacheKey = dateRange ? `${dateRange.start}|${dateRange.end}` : '__all__';
  const cached = _agentCountCache.get(cacheKey);
  if (cached) return cached;

  const agentCountMap = new Map<string, number>();

  try {
    let query = supabase
      .from('agent_connectivity_hourly')
      .select('date, hour, agent_id, status')
      .in('status', ['Disponible', 'En la cola']);

    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching agent connectivity data:', error.message);
      return agentCountMap;
    }

    if (!data || data.length === 0) {
      _agentCountCache.set(cacheKey, agentCountMap);
      return agentCountMap;
    }

    interface KeyData {
      date: string;
      hour: number;
      agent_id: string;
      status: string;
    }

    const countMap = new Map<string, Set<string>>();

    for (const row of data as KeyData[]) {
      const dateObj = new Date(row.date + 'T00:00:00');
      const weekday = dateObj.getDay();
      if (weekday < 1 || weekday > 5) continue;

      const dayMap = { 1: 'lun', 2: 'mar', 3: 'mie', 4: 'jue', 5: 'vie' } as const;
      const dayKey = dayMap[weekday as keyof typeof dayMap];
      const key = `${dayKey}|${row.hour}`;

      if (!countMap.has(key)) {
        countMap.set(key, new Set());
      }

      countMap.get(key)!.add(row.agent_id);
    }

    for (const [key, agentSet] of countMap.entries()) {
      agentCountMap.set(key, agentSet.size);
    }

    _agentCountCache.set(cacheKey, agentCountMap);
  } catch (error) {
    console.error('Error in getAgentCountsByHourAndDay:', error);
  }

  return agentCountMap;
}
