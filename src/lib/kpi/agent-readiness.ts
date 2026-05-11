import type { AgentConnectivityHourly } from '../supabase';

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

const READY_STATES = ['disponible', 'en la cola'];

function isReadyState(status: string): boolean {
  const lower = (status || '').toLowerCase();
  return READY_STATES.some(state => lower.includes(state));
}

export function calculateReadinessPercentage(
  connectivity: AgentConnectivityHourly[]
): { data: ReadinessCellData[][]; agents: string[]; hours: number[] } {
  if (connectivity.length === 0) {
    return { data: [], agents: [], hours: [] };
  }

  // Build agent -> hour -> { queueSeconds, availableSeconds, dayCount }
  type HourData = {
    queueSeconds: number;
    availableSeconds: number;
    dates: Set<string>;
  };
  type AgentHourMap = Map<string, Map<number, HourData>>;

  const agentHourMap: AgentHourMap = new Map();
  const allHours = new Set<number>();
  const allAgents = new Set<string>();

  for (const c of connectivity) {
    if (!c.agent_name) continue;

    allAgents.add(c.agent_name);
    allHours.add(c.hour);

    if (!agentHourMap.has(c.agent_name)) {
      agentHourMap.set(c.agent_name, new Map());
    }

    const hourMap = agentHourMap.get(c.agent_name)!;
    if (!hourMap.has(c.hour)) {
      hourMap.set(c.hour, {
        queueSeconds: 0,
        availableSeconds: 0,
        dates: new Set(),
      });
    }

    const hourData = hourMap.get(c.hour)!;
    const seconds = c.seconds_in_bucket || 0;

    if (isReadyState(c.status)) {
      // "En la cola" and "Disponible" both count as ready
      if ((c.status || '').toLowerCase().includes('cola')) {
        hourData.queueSeconds += seconds;
      } else {
        hourData.availableSeconds += seconds;
      }
    }

    if (c.date) {
      hourData.dates.add(c.date);
    }
  }

  // Sort agents and hours
  const sortedAgents = Array.from(allAgents).sort();
  const sortedHours = Array.from(allHours).sort((a, b) => a - b);

  // Build matrix: agents x hours
  const matrix: ReadinessCellData[] = [];

  for (const agentName of sortedAgents) {
    const hourMap = agentHourMap.get(agentName)!;
    for (const hour of sortedHours) {
      if (!hourMap.has(hour)) continue;

      const hourData = hourMap.get(hour)!;
      const readySeconds = hourData.queueSeconds + hourData.availableSeconds;
      const totalSeconds = 3600; // 1 hour
      const readinessPercent = readySeconds > 0
        ? Math.round((readySeconds / totalSeconds) * 100)
        : 0;
      const dayCount = hourData.dates.size;

      matrix.push({
        agentName,
        hour,
        readinessPercent: readinessPercent <= 100 ? readinessPercent : null,
        dayCount,
        queueSeconds: hourData.queueSeconds,
        availableSeconds: hourData.availableSeconds,
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
      agentMap.set(cell.agentName, {
        percentages: [],
        hours: [],
        dayCount: cell.dayCount,
      });
    }

    const data = agentMap.get(cell.agentName)!;
    if (cell.readinessPercent !== null) {
      data.percentages.push(cell.readinessPercent);
      data.hours.push(cell.hour);
    }
  }

  const summary: ReadinessSummaryRow[] = Array.from(agentMap.entries()).map(
    ([agentName, data]) => {
      const avgReadiness =
        data.percentages.length > 0
          ? Math.round(
              data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length
            )
          : 0;

      const minReadinessIdx = data.percentages.indexOf(
        Math.min(...data.percentages)
      );
      const maxReadinessIdx = data.percentages.indexOf(
        Math.max(...data.percentages)
      );

      const minReadinessHour =
        minReadinessIdx >= 0 ? data.hours[minReadinessIdx] : 0;
      const maxReadinessHour =
        maxReadinessIdx >= 0 ? data.hours[maxReadinessIdx] : 0;

      return {
        agentName,
        avgReadiness,
        minReadinessHour,
        maxReadinessHour,
        workingDays: data.dayCount,
        requiresReview: avgReadiness < 70,
      };
    }
  );

  return summary.sort((a, b) => a.agentName.localeCompare(b.agentName));
}
