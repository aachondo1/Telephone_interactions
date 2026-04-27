import type { CallRecord } from './supabase';

export type ExecutiveStat = {
  executive: string;
  count: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  percentage: number;
  inboundCount: number;
  outboundCount: number;
  unattendedCount: number;
  unattendedPercent: number;
  completenessRate: number;
};

export type QueueStat = {
  queue: string;
  count: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  percentage: number;
  inboundCount: number;
  outboundCount: number;
  unattendedCount: number;
  unattendedPercent: number;
  completenessRate: number;
};

export type QueueHeatmapCell = {
  hour: number;
  weekday: number;
  count: number;
};

export type QueueHeatmapRow = {
  queue: string;
  cells: QueueHeatmapCell[];
};

export type QueueHeatmapData = {
  data: QueueHeatmapRow[];
  maxCount: number;
};

export type QueueUnattendedCell = {
  hour: number;
  weekday: number;
  total: number;
  unattended: number;
  rate: number;
};

export type QueueUnattendedRow = {
  queue: string;
  cells: QueueUnattendedCell[];
};

export type QueueUnattendedHeatmapData = {
  data: QueueUnattendedRow[];
};

export type QueueHourlyStats = {
  hour: number;
  label: string;
  avg: number;
  min: number;
  max: number;
};

export type QueueVariabilityRow = {
  queue: string;
  totalCalls: number;
  hourlyStats: QueueHourlyStats[];
};

export type QueueVariabilityData = {
  queues: QueueVariabilityRow[];
};

export type AttendancePeriodPoint = {
  key: string;
  label: string;
  [queue: string]: number | string | null;
};

export type QueueAttendanceEvolutionData = {
  weeklyPeriods: AttendancePeriodPoint[];
  monthlyPeriods: AttendancePeriodPoint[];
  queues: string[];
};

export type HourBucket = {
  hour: number;
  label: string;
  count: number;
};

export type DailyBucket = {
  date: string;
  count: number;
};

export type DirectionStat = {
  direction: string;
  count: number;
  percentage: number;
};

export type ExecutiveDailyTalkTime = {
  date: string;
  [executive: string]: number | string;
};

export type ExecutiveHourlyTalkTime = {
  hour: number;
  label: string;
  [executive: string]: number | string;
};

export type ExecutiveWeekdayTalkTime = {
  day: number;
  label: string;
  [executive: string]: number | string;
};

export type KPISummary = {
  totalCalls: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  completenessRate: number;
  unattendedCount: number;
  unattendedPercent: number;
  maxDurationSeconds: number;
  maxDurationFormatted: string;
  minDurationSeconds: number;
  minDurationFormatted: string;
  executiveStats: ExecutiveStat[];
  queueStats: QueueStat[];
  queuePerformanceHeatmap: QueueHeatmapData;
  queueUnattendedHeatmap: QueueUnattendedHeatmapData;
  queueLoadVariability: QueueVariabilityData;
  queueAttendanceEvolution: QueueAttendanceEvolutionData;
  hourlyDistribution: HourBucket[];
  dailyDistribution: DailyBucket[];
  directionStats: DirectionStat[];
  executiveDailyTalkTime: ExecutiveDailyTalkTime[];
  executiveHourlyTalkTime: ExecutiveHourlyTalkTime[];
  executiveWeekdayTalkTime: ExecutiveWeekdayTalkTime[];
  topExecutivesByVolume: string[];
  allExecutivesWithData: string[];
};

export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isInbound(direction: string): boolean {
  const d = (direction || '').toLowerCase();
  return d === 'inbound' || d === 'entrante';
}

export function calculateQueuePerformanceHeatmap(records: CallRecord[]): QueueHeatmapData {
  if (records.length === 0) {
    return { data: [], maxCount: 0 };
  }

  const queueMap = new Map<string, Map<number, Map<number, number>>>();

  for (const r of records) {
    const queue = r.queue || 'Sin cola';
    const hour = r.call_hour ?? -1;
    const date = r.call_date;

    if (hour < 0 || hour > 23 || !date) continue;

    const d = new Date(date + 'T00:00:00');
    const weekday = d.getDay();

    if (!queueMap.has(queue)) {
      queueMap.set(queue, new Map());
    }
    const hourMap = queueMap.get(queue)!;
    if (!hourMap.has(hour)) {
      hourMap.set(hour, new Map());
    }
    const weekdayMap = hourMap.get(hour)!;
    weekdayMap.set(weekday, (weekdayMap.get(weekday) ?? 0) + 1);
  }

  const queueStats: Array<[string, number]> = Array.from(queueMap.entries())
    .map(([queue, hourMap]) => {
      const total = Array.from(hourMap.values())
        .reduce((sum, weekdayMap) => sum + Array.from(weekdayMap.values()).reduce((a, b) => a + b, 0), 0);
      return [queue, total];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let maxCount = 0;
  const data: QueueHeatmapRow[] = queueStats.map(([queue]) => {
    const hourMap = queueMap.get(queue)!;
    const cells: QueueHeatmapCell[] = [];

    for (let hour = 0; hour < 24; hour++) {
      for (let weekday = 0; weekday < 7; weekday++) {
        const count = hourMap.get(hour)?.get(weekday) ?? 0;
        cells.push({ hour, weekday, count });
        maxCount = Math.max(maxCount, count);
      }
    }

    return { queue, cells };
  });

  return { data, maxCount };
}

export function calculateQueueUnattendedHeatmap(records: CallRecord[]): QueueUnattendedHeatmapData {
  if (records.length === 0) return { data: [] };

  const queueMap = new Map<string, Map<number, Map<number, { total: number; unattended: number }>>>();

  for (const r of records) {
    const queue = r.queue || 'Sin cola';
    const hour = r.call_hour ?? -1;
    const date = r.call_date;
    if (hour < 0 || hour > 23 || !date) continue;

    const weekday = new Date(date + 'T00:00:00').getDay();
    if (!queueMap.has(queue)) queueMap.set(queue, new Map());
    const hourMap = queueMap.get(queue)!;
    if (!hourMap.has(hour)) hourMap.set(hour, new Map());
    const wdMap = hourMap.get(hour)!;
    const cur = wdMap.get(weekday) ?? { total: 0, unattended: 0 };
    wdMap.set(weekday, { total: cur.total + 1, unattended: cur.unattended + (!r.attended ? 1 : 0) });
  }

  const topQueues = Array.from(queueMap.entries())
    .map(([queue, hourMap]) => {
      const total = Array.from(hourMap.values())
        .reduce((s, wdMap) => s + Array.from(wdMap.values()).reduce((a, b) => a + b.total, 0), 0);
      return [queue, total] as [string, number];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const data: QueueUnattendedRow[] = topQueues.map(([queue]) => {
    const hourMap = queueMap.get(queue)!;
    const cells: QueueUnattendedCell[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let weekday = 0; weekday < 7; weekday++) {
        const stats = hourMap.get(hour)?.get(weekday) ?? { total: 0, unattended: 0 };
        const rate = stats.total > 0 ? Math.round((stats.unattended / stats.total) * 100) : -1;
        cells.push({ hour, weekday, ...stats, rate });
      }
    }
    return { queue, cells };
  });

  return { data };
}

export function calculateQueueLoadVariability(records: CallRecord[]): QueueVariabilityData {
  if (records.length === 0) return { queues: [] };

  const queueDateHourMap = new Map<string, Map<string, Map<number, number>>>();

  for (const r of records) {
    const queue = r.queue || 'Sin cola';
    const hour = r.call_hour ?? -1;
    const date = r.call_date;
    if (hour < 0 || hour > 23 || !date) continue;

    if (!queueDateHourMap.has(queue)) queueDateHourMap.set(queue, new Map());
    const dateMap = queueDateHourMap.get(queue)!;
    if (!dateMap.has(date)) dateMap.set(date, new Map());
    const hourMap = dateMap.get(date)!;
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }

  const topQueues = Array.from(queueDateHourMap.entries())
    .map(([queue, dateMap]) => {
      const total = Array.from(dateMap.values())
        .reduce((s, hm) => s + Array.from(hm.values()).reduce((a, b) => a + b, 0), 0);
      return [queue, total] as [string, number];
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const queues: QueueVariabilityRow[] = topQueues.map(([queue, totalCalls]) => {
    const dateMap = queueDateHourMap.get(queue)!;
    const allDates = Array.from(dateMap.keys());

    const hourlyStats: QueueHourlyStats[] = Array.from({ length: 24 }, (_, hour) => {
      const countsPerDay = allDates.map(d => dateMap.get(d)?.get(hour) ?? 0);
      const activeDays = countsPerDay.filter(c => c > 0);
      const avg = Math.round(countsPerDay.reduce((a, b) => a + b, 0) / allDates.length);
      const min = activeDays.length > 0 ? Math.min(...activeDays) : 0;
      const max = activeDays.length > 0 ? Math.max(...activeDays) : 0;
      return { hour, label: `${String(hour).padStart(2, '0')}:00`, avg, min, max };
    });

    return { queue, totalCalls, hourlyStats };
  });

  return { queues };
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function weekLabel(mondayKey: string): string {
  const d = new Date(mondayKey + 'T00:00:00');
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${MONTH_LABELS[parseInt(month) - 1]} ${year}`;
}

export function calculateQueueAttendanceEvolution(records: CallRecord[]): QueueAttendanceEvolutionData {
  if (records.length === 0) return { weeklyPeriods: [], monthlyPeriods: [], queues: [] };

  const queueTotals = new Map<string, number>();
  for (const r of records) {
    if (!r.queue || !r.call_date) continue;
    queueTotals.set(r.queue, (queueTotals.get(r.queue) ?? 0) + 1);
  }
  const topQueues = Array.from(queueTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([q]) => q);
  const topQueueSet = new Set(topQueues);

  type PeriodStats = Map<string, Map<string, { total: number; attended: number }>>;

  const weekMap: PeriodStats = new Map();
  const monthMap: PeriodStats = new Map();

  for (const r of records) {
    if (!r.queue || !r.call_date || !topQueueSet.has(r.queue)) continue;

    const weekKey = getMondayKey(r.call_date);
    const monthKey = r.call_date.substring(0, 7);

    for (const [map, key] of [[weekMap, weekKey], [monthMap, monthKey]] as [PeriodStats, string][]) {
      if (!map.has(key)) map.set(key, new Map());
      const qm = map.get(key)!;
      const cur = qm.get(r.queue) ?? { total: 0, attended: 0 };
      qm.set(r.queue, { total: cur.total + 1, attended: cur.attended + (r.attended ? 1 : 0) });
    }
  }

  function buildPeriods(map: PeriodStats, labelFn: (k: string) => string, minCalls: number): AttendancePeriodPoint[] {
    return Array.from(map.keys()).sort().map(key => {
      const qm = map.get(key)!;
      const point: AttendancePeriodPoint = { key, label: labelFn(key) };
      for (const queue of topQueues) {
        const s = qm.get(queue);
        point[queue] = s && s.total >= minCalls ? Math.round((s.attended / s.total) * 100) : null;
      }
      return point;
    });
  }

  return {
    weeklyPeriods: buildPeriods(weekMap, weekLabel, 5),
    monthlyPeriods: buildPeriods(monthMap, monthLabel, 10),
    queues: topQueues,
  };
}

export function calculateKPIs(records: CallRecord[]): KPISummary {
  const total = records.length;
  const empty: KPISummary = {
    totalCalls: 0,
    avgDurationSeconds: 0,
    avgDurationFormatted: '00:00',
    completenessRate: 0,
    unattendedCount: 0,
    unattendedPercent: 0,
    maxDurationSeconds: 0,
    maxDurationFormatted: '00:00',
    minDurationSeconds: 0,
    minDurationFormatted: '00:00',
    executiveStats: [],
    queueStats: [],
    hourlyDistribution: [],
    dailyDistribution: [],
    directionStats: [],
    executiveDailyTalkTime: [],
    executiveHourlyTalkTime: [],
    executiveWeekdayTalkTime: [],
    topExecutivesByVolume: [],
    allExecutivesWithData: [],
  };
  if (total === 0) return empty;

  const durations = records.map(r => r.duration_seconds);
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const avgDurationSeconds = Math.round(totalDuration / total);
  const maxDurationSeconds = Math.max(...durations);
  const minDurationSeconds = Math.min(...durations);

  const completeCount = records.filter(r => r.export_complete).length;
  const completenessRate = Math.round((completeCount / total) * 100);

  const unattendedCount = records.filter(r => !r.attended).length;
  const unattendedPercent = Math.round((unattendedCount / total) * 100);

  // Executive stats
  const execMap = new Map<string, {
    count: number; totalDuration: number;
    inbound: number; outbound: number; unattended: number; complete: number;
  }>();
  for (const r of records) {
    const exec = r.executive || 'SIN ATENDER';
    const e = execMap.get(exec) ?? { count: 0, totalDuration: 0, inbound: 0, outbound: 0, unattended: 0, complete: 0 };
    execMap.set(exec, {
      count: e.count + 1,
      totalDuration: e.totalDuration + r.duration_seconds,
      inbound: e.inbound + (isInbound(r.call_direction) ? 1 : 0),
      outbound: e.outbound + (!isInbound(r.call_direction) ? 1 : 0),
      unattended: e.unattended + (!r.attended ? 1 : 0),
      complete: e.complete + (r.export_complete ? 1 : 0),
    });
  }
  const executiveStats: ExecutiveStat[] = Array.from(execMap.entries())
    .map(([executive, d]) => {
      const avg = Math.round(d.totalDuration / d.count);
      return {
        executive,
        count: d.count,
        avgDurationSeconds: avg,
        avgDurationFormatted: formatDuration(avg),
        totalDurationSeconds: d.totalDuration,
        totalDurationFormatted: formatDuration(d.totalDuration),
        percentage: Math.round((d.count / total) * 100),
        inboundCount: d.inbound,
        outboundCount: d.outbound,
        unattendedCount: d.unattended,
        unattendedPercent: Math.round((d.unattended / d.count) * 100),
        completenessRate: Math.round((d.complete / d.count) * 100),
      };
    })
    .filter(e => e.count >= 5)
    .sort((a, b) => b.count - a.count);

  // Queue stats
  const queueMap = new Map<string, {
    count: number; totalDuration: number;
    inbound: number; outbound: number; unattended: number; complete: number;
  }>();
  for (const r of records) {
    const q = r.queue || 'Sin cola';
    const e = queueMap.get(q) ?? { count: 0, totalDuration: 0, inbound: 0, outbound: 0, unattended: 0, complete: 0 };
    queueMap.set(q, {
      count: e.count + 1,
      totalDuration: e.totalDuration + r.duration_seconds,
      inbound: e.inbound + (isInbound(r.call_direction) ? 1 : 0),
      outbound: e.outbound + (!isInbound(r.call_direction) ? 1 : 0),
      unattended: e.unattended + (!r.attended ? 1 : 0),
      complete: e.complete + (r.export_complete ? 1 : 0),
    });
  }
  const totalQueueDuration = Array.from(queueMap.values()).reduce((sum, d) => sum + d.totalDuration, 0);
  const queueStats: QueueStat[] = Array.from(queueMap.entries())
    .map(([queue, d]) => {
      const avg = Math.round(d.totalDuration / d.count);
      return {
        queue,
        count: d.count,
        avgDurationSeconds: avg,
        avgDurationFormatted: formatDuration(avg),
        totalDurationSeconds: d.totalDuration,
        totalDurationFormatted: formatDuration(d.totalDuration),
        percentage: Math.round((d.totalDuration / totalQueueDuration) * 100),
        inboundCount: d.inbound,
        outboundCount: d.outbound,
        unattendedCount: d.unattended,
        unattendedPercent: Math.round((d.unattended / d.count) * 100),
        completenessRate: Math.round((d.complete / d.count) * 100),
      };
    })
    .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

  // Hourly distribution
  const hourMap = new Map<number, number>();
  for (const r of records) {
    if (r.call_hour !== null && r.call_hour !== undefined) {
      hourMap.set(r.call_hour, (hourMap.get(r.call_hour) ?? 0) + 1);
    }
  }
  const hourlyDistribution: HourBucket[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, '0')}:00`,
    count: hourMap.get(h) ?? 0,
  }));

  // Daily distribution
  const dateMap = new Map<string, number>();
  for (const r of records) {
    if (r.call_date) {
      dateMap.set(r.call_date, (dateMap.get(r.call_date) ?? 0) + 1);
    }
  }
  const dailyDistribution: DailyBucket[] = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Direction stats
  const dirMap = new Map<string, number>();
  for (const r of records) {
    const dir = r.call_direction || 'Desconocido';
    dirMap.set(dir, (dirMap.get(dir) ?? 0) + 1);
  }
  const directionStats: DirectionStat[] = Array.from(dirMap.entries())
    .map(([direction, count]) => ({
      direction,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Top 5 executives by volume (already filtered by >= 5 calls)
  const topExecutivesByVolume = executiveStats
    .filter(e => e.executive !== 'SIN ATENDER')
    .slice(0, 5)
    .map(e => e.executive);

  const topExecSet = new Set(topExecutivesByVolume);

  // Executive daily talk time (attended calls only, top 5 execs)
  const execDayMap = new Map<string, Map<string, number>>();
  for (const r of records) {
    if (!r.attended || !r.executive || !topExecSet.has(r.executive) || !r.call_date) continue;
    if (!execDayMap.has(r.call_date)) execDayMap.set(r.call_date, new Map());
    const dayMap = execDayMap.get(r.call_date)!;
    dayMap.set(r.executive, (dayMap.get(r.executive) ?? 0) + r.duration_seconds);
  }
  const allDates = Array.from(dateMap.keys()).sort();
  const executiveDailyTalkTime: ExecutiveDailyTalkTime[] = allDates.map(date => {
    const row: ExecutiveDailyTalkTime = { date };
    for (const exec of topExecutivesByVolume) {
      row[exec] = execDayMap.get(date)?.get(exec) ?? 0;
    }
    return row;
  });

  // Executive hourly talk time (attended calls only, all executives)
  const execHourMap = new Map<number, Map<string, number>>();
  for (const r of records) {
    if (!r.attended || !r.executive) continue;
    if (r.call_hour === null || r.call_hour === undefined) continue;
    if (!execHourMap.has(r.call_hour)) execHourMap.set(r.call_hour, new Map());
    const hMap = execHourMap.get(r.call_hour)!;
    hMap.set(r.executive, (hMap.get(r.executive) ?? 0) + r.duration_seconds);
  }
  const allExecutivesWithData = Array.from(
    new Set(records.filter(r => r.attended && r.executive).map(r => r.executive))
  ).sort();
  const executiveHourlyTalkTime: ExecutiveHourlyTalkTime[] = Array.from({ length: 24 }, (_, h) => {
    const row: ExecutiveHourlyTalkTime = { hour: h, label: `${String(h).padStart(2, '0')}:00` };
    for (const exec of allExecutivesWithData) {
      row[exec] = execHourMap.get(h)?.get(exec) ?? 0;
    }
    return row;
  });

  // Executive weekday talk time (attended calls only, all executives)
  const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const execWeekdayMap = new Map<number, Map<string, number>>();
  for (const r of records) {
    if (!r.attended || !r.executive || !r.call_date) continue;
    const d = new Date(r.call_date + 'T00:00:00');
    const weekday = d.getDay();
    if (!execWeekdayMap.has(weekday)) execWeekdayMap.set(weekday, new Map());
    const wdMap = execWeekdayMap.get(weekday)!;
    wdMap.set(r.executive, (wdMap.get(r.executive) ?? 0) + r.duration_seconds);
  }
  const executiveWeekdayTalkTime: ExecutiveWeekdayTalkTime[] = Array.from({ length: 7 }, (_, day) => {
    const row: ExecutiveWeekdayTalkTime = { day, label: weekdayLabels[day] };
    for (const exec of allExecutivesWithData) {
      row[exec] = execWeekdayMap.get(day)?.get(exec) ?? 0;
    }
    return row;
  });

  const queuePerformanceHeatmap = calculateQueuePerformanceHeatmap(records);
  const queueUnattendedHeatmap = calculateQueueUnattendedHeatmap(records);
  const queueLoadVariability = calculateQueueLoadVariability(records);
  const queueAttendanceEvolution = calculateQueueAttendanceEvolution(records);

  return {
    totalCalls: total,
    avgDurationSeconds,
    avgDurationFormatted: formatDuration(avgDurationSeconds),
    completenessRate,
    unattendedCount,
    unattendedPercent,
    maxDurationSeconds,
    maxDurationFormatted: formatDuration(maxDurationSeconds),
    minDurationSeconds,
    minDurationFormatted: formatDuration(minDurationSeconds),
    executiveStats,
    queueStats,
    queuePerformanceHeatmap,
    queueUnattendedHeatmap,
    queueLoadVariability,
    queueAttendanceEvolution,
    hourlyDistribution,
    dailyDistribution,
    directionStats,
    executiveDailyTalkTime,
    executiveHourlyTalkTime,
    executiveWeekdayTalkTime,
    topExecutivesByVolume,
    allExecutivesWithData,
  };
}