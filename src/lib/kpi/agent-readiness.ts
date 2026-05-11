import type { AgentConnectivityHourly } from '../supabase';
import { getBusinessHours } from '../businessHours';

export interface ReadinessCellData {
  agentName: string;
  hour: number;
  readinessPercent: number | null;
  dayCount: number;
  queueSeconds: number;
  availableSeconds: number;
}

export interface ReadinessSummaryRow {
  agentName: string;
  avgReadiness: number;
  minReadinessHour: number;
  maxReadinessHour: number;
  workingDays: number;
  requiresReview: boolean;
}

const IN_QUEUE_STATES = ['en la cola', 'en queue', 'queue'];

function isInQueueState(status: string): boolean {
  const lower = (status || '').toLowerCase();
  return IN_QUEUE_STATES.some(state => lower.includes(state));
}

// Returns true if any part of the bucket [hour:00, hour+1:00) falls within business hours for that date
function isHourWithinBusinessHours(dateStr: string, hour: number): boolean {
  const date = new Date(dateStr + 'T12:00:00');
  const config = getBusinessHours(date);

  // Closed day (weekends or holidays)
  if (config.endHour === 0 && config.endMinute === 0) return false;

  const hourStart = hour;
  const hourEnd = hour + 1;
  const startInHours = config.startHour + config.startMinute / 60;
  const endInHours = config.endHour + config.endMinute / 60;

  return hourStart < endInHours && hourEnd > startInHours;
}

export function calculateReadinessPercentage(
  connectivity: AgentConnectivityHourly[]
): { data: ReadinessCellData[][]; agents: string[]; hours: number[] } {
  if (connectivity.length === 0) {
    return { data: [], agents: [], hours: [] };
  }

  // Filter to only records within business hours
  const withinHours = connectivity.filter(
    c => c.date && isHourWithinBusinessHours(c.date, c.hour)
  );

  if (withinHours.length === 0) {
    return { data: [], agents: [], hours: [] };
  }

  // Build agent -> hour -> { inQueueSeconds, dates }
  type HourData = {
    inQueueSeconds: number;
    dates: Set<string>;
  };

  const agentHourMap = new Map<string, Map<number, HourData>>();
  const allHours = new Set<number>();
  const allAgents = new Set<string>();

  for (const c of withinHours) {
    if (!c.agent_name) continue;

    allAgents.add(c.agent_name);
    allHours.add(c.hour);

    if (!agentHourMap.has(c.agent_name)) {
      agentHourMap.set(c.agent_name, new Map());
    }

    const hourMap = agentHourMap.get(c.agent_name)!;
    if (!hourMap.has(c.hour)) {
      hourMap.set(c.hour, { inQueueSeconds: 0, dates: new Set() });
    }

    const hourData = hourMap.get(c.hour)!;
    const seconds = c.seconds_in_bucket || 0;

    if (isInQueueState(c.status)) {
      hourData.inQueueSeconds += seconds;
    }

    if (c.date) hourData.dates.add(c.date);
  }

  const sortedAgents = Array.from(allAgents).sort();
  const sortedHours = Array.from(allHours).sort((a, b) => a - b);

  // Build flat cell array (all agents × all hours)
  const matrix: ReadinessCellData[] = [];

  for (const agentName of sortedAgents) {
    const hourMap = agentHourMap.get(agentName)!;

    for (const hour of sortedHours) {
      if (!hourMap.has(hour)) {
        // Agent has no data at all for this hour — leave as null
        matrix.push({
          agentName,
          hour,
          readinessPercent: null,
          dayCount: 0,
          queueSeconds: 0,
          availableSeconds: 0,
        });
        continue;
      }

      const hourData = hourMap.get(hour)!;
      const dayCount = hourData.dates.size;

      // Percentage of time in queue relative to a full hour; cap at 100
      const readinessPercent = Math.min(100, Math.round((hourData.inQueueSeconds / 3600) * 100));

      matrix.push({
        agentName,
        hour,
        readinessPercent: dayCount > 0 ? readinessPercent : null,
        dayCount,
        queueSeconds: hourData.inQueueSeconds,
        availableSeconds: 0, // Not used, kept for interface compatibility
      });
    }
  }

  return {
    data: [matrix],
    agents: sortedAgents,
    hours: sortedHours,
  };
}

export function calculateReadinessSummary(
  cellData: ReadinessCellData[]
): ReadinessSummaryRow[] {
  const agentMap = new Map<string, {
    percentages: number[];
    hours: number[];
    dayCount: number;
  }>();

  for (const cell of cellData) {
    if (!agentMap.has(cell.agentName)) {
      agentMap.set(cell.agentName, { percentages: [], hours: [], dayCount: cell.dayCount });
    }
    const data = agentMap.get(cell.agentName)!;
    if (cell.readinessPercent !== null) {
      data.percentages.push(cell.readinessPercent);
      data.hours.push(cell.hour);
    }
    // Keep the max dayCount seen across hours for this agent
    if (cell.dayCount > data.dayCount) data.dayCount = cell.dayCount;
  }

  return Array.from(agentMap.entries())
    .map(([agentName, data]) => {
      const avgReadiness =
        data.percentages.length > 0
          ? Math.round(data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length)
          : 0;

      const minIdx = data.percentages.indexOf(Math.min(...data.percentages));
      const maxIdx = data.percentages.indexOf(Math.max(...data.percentages));

      return {
        agentName,
        avgReadiness,
        minReadinessHour: minIdx >= 0 ? data.hours[minIdx] : 0,
        maxReadinessHour: maxIdx >= 0 ? data.hours[maxIdx] : 0,
        workingDays: data.dayCount,
        requiresReview: avgReadiness < 70,
      };
    })
    .sort((a, b) => a.agentName.localeCompare(b.agentName));
}
