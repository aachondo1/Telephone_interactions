import type { CallRecord } from './supabase';

export type ServiceLevelPoint = {
  hour: number;
  label: string;
  totalInQueue: number;
  answeredWithin20s: number;
  serviceLevel: number;
  avgQueueTime: number;
  medianQueueTime: number;
};

export type ServiceLevelData = {
  overallSL: number;
  points: ServiceLevelPoint[];
};

export type AbandonStats = {
  totalUnattended: number;
  abandonedInQueue: number;
  abandonedInAlert: number;
  abandonedInIVR: number;
  reentries: number;
};

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
  avgHandleTimeSeconds: number;
  avgQueueTimeSeconds: number;
  avgAlertTimeSeconds: number;
  avgAlertSegments: number;
  bounceCount: number;
  bounceRate: number;
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
  avgQueueTimeSeconds: number;
  avgHandleTimeSeconds: number;
  avgAlertTimeSeconds: number;
  avgAlertSegments: number;
  bounceRate: number;
  abandonQueueRate: number;
  abandonAlertRate: number;
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

export type ExecutiveOccupancyEntry = {
  executive: string;
  avgOccupancyPct: number;
  weeklyTalkMinutes: number;
  weeklyFreeMinutes: number;
  weeklyShiftMinutes: number;
  daysWithCalls: number;
};

export type ExecutiveOccupancyData = {
  entries: ExecutiveOccupancyEntry[];
};

export type HourlyDemandPoint = {
  hour: number;
  label: string;
  lun: number | null;
  mar: number | null;
  mie: number | null;
  jue: number | null;
  vie: number | null;
};

export type HourlyDemandData = {
  points: HourlyDemandPoint[];
  peakErlangs: number;
  weekdayCounts: { lun: number; mar: number; mie: number; jue: number; vie: number };
};

export type TopCallerQueueEntry = {
  queue: string;
  count: number;
};

export type TopCallerExecutiveEntry = {
  executive: string;
  count: number;
};

export type TopCallerEntry = {
  aniHash: string;
  aniMasked: string;
  callCount: number;
  attendedCount: number;
  unattendedCount: number;
  queues: TopCallerQueueEntry[];
  executives: TopCallerExecutiveEntry[];
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

export type DailyAttendanceBucket = {
  date: string;
  attended: number;
  unattended: number;
  total: number;
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
  avgQueueTimeSeconds: number;
  avgQueueTimeFormatted: string;
  avgHandleTimeSeconds: number;
  avgHandleTimeFormatted: string;
  avgAlertTimeSeconds: number;
  avgHoldTimeSeconds: number;
  maxQueueTimeSeconds: number;
  maxQueueTimeFormatted: string;
  maxHoldTimeSeconds: number;
  maxHoldTimeFormatted: string;
  executiveStats: ExecutiveStat[];
  queueStats: QueueStat[];
  queuePerformanceHeatmap: QueueHeatmapData;
  queueUnattendedHeatmap: QueueUnattendedHeatmapData;
  queueLoadVariability: QueueVariabilityData;
  queueAttendanceEvolution: QueueAttendanceEvolutionData;
  executiveOccupancy: ExecutiveOccupancyData;
  hourlyDemand: HourlyDemandData;
  hourlyDistribution: HourBucket[];
  dailyDistribution: DailyBucket[];
  dailyAttendedVsUnattended: DailyAttendanceBucket[];
  directionStats: DirectionStat[];
  executiveDailyTalkTime: ExecutiveDailyTalkTime[];
  executiveHourlyTalkTime: ExecutiveHourlyTalkTime[];
  executiveWeekdayTalkTime: ExecutiveWeekdayTalkTime[];
  topExecutivesByVolume: string[];
  allExecutivesWithData: string[];
  topCallers: TopCallerEntry[];
  serviceLevel: ServiceLevelData;
  abandonStats: AbandonStats;
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
      return [queue, total] as [string, number];
    })
    .sort((a, b) => (b as [string, number])[1] - (a as [string, number])[1])
    .slice(0, 10);

  let maxCount = 0;
  const data: QueueHeatmapRow[] = queueStats.map(([queue]) => {
    const hourMap = queueMap.get(queue)!;
    const cells: QueueHeatmapCell[] = [];

    for (let hour = 8; hour <= 18; hour++) {
      for (let weekday = 1; weekday <= 5; weekday++) {
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
    for (let hour = 8; hour <= 18; hour++) {
      for (let weekday = 1; weekday <= 5; weekday++) {
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

    const hourlyStats: QueueHourlyStats[] = Array.from({ length: 11 }, (_, i) => {
      const hour = i + 8;
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

function timeStringToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function calculateExecutiveOccupancy(records: CallRecord[]): ExecutiveOccupancyData {
  if (records.length === 0) return { entries: [] };

  const execDayMap = new Map<string, Set<string>>();
  const execDayTalkMap = new Map<string, Map<string, number>>();

  for (const r of records) {
    if (!r.executive || r.executive === 'SIN ATENDER' || !r.call_date || !r.attended) continue;

    if (!execDayMap.has(r.executive)) {
      execDayMap.set(r.executive, new Set());
      execDayTalkMap.set(r.executive, new Map());
    }

    execDayMap.get(r.executive)!.add(r.call_date);

    const dayMap = execDayTalkMap.get(r.executive)!;
    if (!dayMap.has(r.call_date)) dayMap.set(r.call_date, 0);

    const callTime = timeStringToMinutes(r.call_time);
    if (callTime === null) continue;

    const handleTimeSeconds = Math.max(r.handle_time_seconds || 0, r.duration_seconds + 45);
    const handleMin = Math.ceil(handleTimeSeconds / 60);
    dayMap.set(r.call_date, dayMap.get(r.call_date)! + handleMin);
  }

  const WEEKLY_SHIFT_MINUTES = 2280;

  const entries: ExecutiveOccupancyEntry[] = Array.from(execDayMap.entries())
    .map(([executive, uniqueDays]) => {
      const daysWithActivity = uniqueDays.size;
      if (daysWithActivity < 3) return null;

      const dayTalkMap = execDayTalkMap.get(executive)!;
      const totalTalkMin = Array.from(dayTalkMap.values()).reduce((sum, min) => sum + min, 0);
      const avgDailyTalkMin = Math.round(totalTalkMin / daysWithActivity);
      const weeklyAvgTalkMin = avgDailyTalkMin * 5;

      return {
        executive,
        avgOccupancyPct: Math.min(100, Math.round((weeklyAvgTalkMin / WEEKLY_SHIFT_MINUTES) * 100)),
        weeklyTalkMinutes: weeklyAvgTalkMin,
        weeklyFreeMinutes: Math.max(0, WEEKLY_SHIFT_MINUTES - weeklyAvgTalkMin),
        weeklyShiftMinutes: WEEKLY_SHIFT_MINUTES,
        daysWithCalls: daysWithActivity,
      };
    })
    .filter((e): e is ExecutiveOccupancyEntry => e !== null)
    .sort((a, b) => b.avgOccupancyPct - a.avgOccupancyPct);

  return { entries };
}

export function calculateHourlyDemand(records: CallRecord[]): HourlyDemandData {
  const empty: HourlyDemandData = {
    points: [], peakErlangs: 0,
    weekdayCounts: { lun: 0, mar: 0, mie: 0, jue: 0, vie: 0 },
  };
  if (records.length === 0) return empty;

  const datesByWeekday = new Map<number, Set<string>>();
  for (const r of records) {
    if (!r.call_date) continue;
    const day = new Date(r.call_date + 'T00:00:00').getDay();
    if (day < 1 || day > 5) continue;
    if (!datesByWeekday.has(day)) datesByWeekday.set(day, new Set());
    datesByWeekday.get(day)!.add(r.call_date);
  }

  const weekdayCounts = {
    lun: datesByWeekday.get(1)?.size ?? 0,
    mar: datesByWeekday.get(2)?.size ?? 0,
    mie: datesByWeekday.get(3)?.size ?? 0,
    jue: datesByWeekday.get(4)?.size ?? 0,
    vie: datesByWeekday.get(5)?.size ?? 0,
  };

  const durationMap = new Map<number, Map<number, number>>();
  for (const r of records) {
    if (!r.call_date || r.call_hour === null || r.call_hour === undefined) continue;
    const day = new Date(r.call_date + 'T00:00:00').getDay();
    if (day < 1 || day > 5) continue;
    if (!durationMap.has(day)) durationMap.set(day, new Map());
    const hm = durationMap.get(day)!;
    hm.set(r.call_hour, (hm.get(r.call_hour) ?? 0) + r.duration_seconds);
  }

  const dayKeys = [1, 2, 3, 4, 5] as const;
  const dayNames = ['lun', 'mar', 'mie', 'jue', 'vie'] as const;
  const dayCounts = [weekdayCounts.lun, weekdayCounts.mar, weekdayCounts.mie, weekdayCounts.jue, weekdayCounts.vie];
  let peakErlangs = 0;

  const points: HourlyDemandPoint[] = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    const point: HourlyDemandPoint = { hour, label: `${String(hour).padStart(2, '0')}:00`, lun: null, mar: null, mie: null, jue: null, vie: null };
    dayKeys.forEach((day, idx) => {
      const count = dayCounts[idx];
      if (count === 0) return;
      const totalSec = durationMap.get(day)?.get(hour) ?? 0;
      if (totalSec === 0) return;
      const erlangs = Math.round((totalSec / 3600 / count) * 10) / 10;
      point[dayNames[idx]] = erlangs;
      if (erlangs > peakErlangs) peakErlangs = erlangs;
    });
    return point;
  });

  return { points, peakErlangs, weekdayCounts };
}

// Chilean mobile numbers have 11 digits after stripping country code (56 + 9 + 8 digits).
// The masked version preserves the original length (Xs + last 4), so length 11 = mobile.
function isMobileNumber(aniMasked: string): boolean {
  return aniMasked.length === 11;
}

export function calculateTopCallers(records: CallRecord[], limit = 10, mobileOnly = false): TopCallerEntry[] {
  type Accumulator = {
    aniMasked: string;
    callCount: number;
    attendedCount: number;
    unattendedCount: number;
    queues: Map<string, number>;
    executives: Map<string, number>;
  };

  const callerMap = new Map<string, Accumulator>();

  for (const r of records) {
    if (!r.ani_hash) continue;
    if (mobileOnly && !isMobileNumber(r.ani_masked)) continue;

    let acc = callerMap.get(r.ani_hash);
    if (!acc) {
      acc = {
        aniMasked: r.ani_masked,
        callCount: 0,
        attendedCount: 0,
        unattendedCount: 0,
        queues: new Map(),
        executives: new Map(),
      };
      callerMap.set(r.ani_hash, acc);
    }

    acc.callCount++;
    if (r.attended) {
      acc.attendedCount++;
      if (r.executive && r.executive !== 'SIN ATENDER') {
        acc.executives.set(r.executive, (acc.executives.get(r.executive) ?? 0) + 1);
      }
    } else {
      acc.unattendedCount++;
    }

    if (r.queue) {
      acc.queues.set(r.queue, (acc.queues.get(r.queue) ?? 0) + 1);
    }
  }

  return Array.from(callerMap.values())
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, limit)
    .map(acc => ({
      aniHash: '',
      aniMasked: acc.aniMasked,
      callCount: acc.callCount,
      attendedCount: acc.attendedCount,
      unattendedCount: acc.unattendedCount,
      queues: Array.from(acc.queues.entries())
        .map(([queue, count]) => ({ queue, count }))
        .sort((a, b) => b.count - a.count),
      executives: Array.from(acc.executives.entries())
        .map(([executive, count]) => ({ executive, count }))
        .sort((a, b) => b.count - a.count),
    }));
}

export function calculateServiceLevel(records: CallRecord[]): ServiceLevelData {
  const hourMap = new Map<number, { total: number; within20s: number; queueTimes: number[] }>();

  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { total: 0, within20s: 0, queueTimes: [] });
  }

  for (const r of records) {
    // CRITICAL: Only inbound calls. Outbound calls (agente initiated) bypass queue.
    // Including outbound artificially lowers Service Level metric.
    if (!isInbound(r.call_direction)) continue;
    if (!r.attended) continue;
    if (r.call_hour === null || r.call_hour === undefined) continue;
    if (r.queue_time_seconds === null || r.queue_time_seconds === undefined || r.queue_time_seconds < 0) continue;

    const h = r.call_hour;
    const hourData = hourMap.get(h)!;
    hourData.total += 1;
    if (r.queue_time_seconds <= 20) {
      hourData.within20s += 1;
    }
    hourData.queueTimes.push(r.queue_time_seconds);
  }

  const points: ServiceLevelPoint[] = [];
  let totalInQueue = 0;
  let totalWithin20s = 0;

  for (let h = 0; h < 24; h++) {
    const hourData = hourMap.get(h)!;
    const sl = hourData.total > 0 ? Math.round((hourData.within20s / hourData.total) * 100) : 0;
    const avgQueue = hourData.total > 0
      ? Math.round(hourData.queueTimes.reduce((a, b) => a + b, 0) / hourData.total)
      : 0;
    hourData.queueTimes.sort((a, b) => a - b);
    const medianQueue = hourData.queueTimes.length > 0
      ? hourData.queueTimes[Math.floor(hourData.queueTimes.length / 2)]
      : 0;

    points.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      totalInQueue: hourData.total,
      answeredWithin20s: hourData.within20s,
      serviceLevel: sl,
      avgQueueTime: avgQueue,
      medianQueueTime: medianQueue,
    });

    totalInQueue += hourData.total;
    totalWithin20s += hourData.within20s;
  }

  const overallSL = totalInQueue > 0 ? Math.round((totalWithin20s / totalInQueue) * 100) : 0;

  return { overallSL, points };
}

export function calculateAbandonStats(records: CallRecord[]): AbandonStats {
  let totalUnattended = 0;
  let abandonedInQueue = 0;
  let abandonedInAlert = 0;
  let abandonedInIVR = 0;

  for (const r of records) {
    // CRITICAL: Only inbound calls. Outbound calls (agent-initiated) are not "abandoned" by definition.
    // Mixing inbound+outbound artificially lowers the Abandon Rate metric.
    if (!isInbound(r.call_direction)) continue;
    if (!r.attended) {
      totalUnattended += 1;
      if (r.abandon_type === 'queue') abandonedInQueue += 1;
      else if (r.abandon_type === 'alert') abandonedInAlert += 1;
      else if (r.abandon_type === 'ivr') abandonedInIVR += 1;
    }
  }

  const { reentries } = calculateRentryRate(records);

  return {
    totalUnattended,
    abandonedInQueue,
    abandonedInAlert,
    abandonedInIVR,
    reentries,
  };
}

// CAMBIO 4: Detectar cortes técnicos (1-5 seg sin alertas)
export function isCorruptedTechnicalCall(record: CallRecord): boolean {
  // Llamada "atendida" de 1-5 segundos sin alertas
  // = corte técnico registrado como atendida
  return (
    record.attended &&
    record.duration_seconds >= 1 &&
    record.duration_seconds <= 5 &&
    (!record.alert_time_seconds || record.alert_time_seconds === 0)
  );
}

export function calculateRentryRate(records: CallRecord[], hours: number = 24): { reentries: number; reentryRate: number } {
  const callsByAni = new Map<string, CallRecord[]>();

  for (const r of records) {
    if (!callsByAni.has(r.ani_hash)) {
      callsByAni.set(r.ani_hash, []);
    }
    callsByAni.get(r.ani_hash)!.push(r);
  }

  let reentries = 0;
  const hoursMs = hours * 3600 * 1000;

  for (const [, calls] of callsByAni.entries()) {
    const abandoned = calls.filter(c => !c.attended && c.abandon_type !== null);
    const attended = calls.filter(c => c.attended);

    for (const abandonedCall of abandoned) {
      if (!abandonedCall.call_date || !abandonedCall.call_time) continue;

      const abandonedTime = new Date(`${abandonedCall.call_date}T${abandonedCall.call_time}`).getTime();

      for (const attendedCall of attended) {
        if (!attendedCall.call_date || !attendedCall.call_time) continue;

        const attendedTime = new Date(`${attendedCall.call_date}T${attendedCall.call_time}`).getTime();

        if (attendedTime > abandonedTime && attendedTime - abandonedTime <= hoursMs) {
          reentries += 1;
          break;
        }
      }
    }
  }

  const abandonCount = records.filter(r => !r.attended && r.abandon_type !== null).length;
  const reentryRate = abandonCount > 0 ? Math.round((reentries / abandonCount) * 100) : 0;

  return { reentries, reentryRate };
}

export function calculateKPIs(records: CallRecord[]): KPISummary {
  // CAMBIO 1: Filtrar solo llamadas ENTRANTES para KPIs de servicio
  const inboundRecords = records.filter(r =>
    !r.call_direction?.toLowerCase().includes('saliente') &&
    !r.call_direction?.toLowerCase().includes('outbound')
  );

  // Excluir cortes técnicos
  const validRecords = inboundRecords.filter(r => !isCorruptedTechnicalCall(r));

  const technicalCuts = inboundRecords.length - validRecords.length;
  const outboundCount = records.length - inboundRecords.length;

  if (outboundCount > 0 || technicalCuts > 0) {
    console.log(
      `📊 KPI Metrics: ${records.length} total registros, ` +
      `${validRecords.length} válidas entrantes, ` +
      `${outboundCount} salientes excluidos, ` +
      `${technicalCuts} cortes técnicos excluidos`
    );
  }

  const total = validRecords.length;
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
    avgQueueTimeSeconds: 0,
    avgQueueTimeFormatted: '00:00',
    avgHandleTimeSeconds: 0,
    avgHandleTimeFormatted: '00:00',
    avgAlertTimeSeconds: 0,
    avgHoldTimeSeconds: 0,
    maxQueueTimeSeconds: 0,
    maxQueueTimeFormatted: '00:00',
    maxHoldTimeSeconds: 0,
    maxHoldTimeFormatted: '00:00',
    executiveStats: [],
    queueStats: [],
    queuePerformanceHeatmap: { data: [], maxCount: 0 },
    queueUnattendedHeatmap: { data: [] },
    queueLoadVariability: { queues: [] },
    queueAttendanceEvolution: { weeklyPeriods: [], monthlyPeriods: [], queues: [] },
    executiveOccupancy: { entries: [] },
    hourlyDemand: { points: [], peakErlangs: 0, weekdayCounts: { lun: 0, mar: 0, mie: 0, jue: 0, vie: 0 } },
    hourlyDistribution: [],
    dailyDistribution: [],
    dailyAttendedVsUnattended: [],
    directionStats: [],
    executiveDailyTalkTime: [],
    executiveHourlyTalkTime: [],
    executiveWeekdayTalkTime: [],
    topExecutivesByVolume: [],
    allExecutivesWithData: [],
    topCallers: [],
    serviceLevel: { overallSL: 0, points: [] },
    abandonStats: { totalUnattended: 0, abandonedInQueue: 0, abandonedInAlert: 0, abandonedInIVR: 0, reentries: 0 },
  };
  if (total === 0) return empty;

  const durations = validRecords.map(r => r.duration_seconds);
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const avgDurationSeconds = Math.round(totalDuration / total);
  const maxDurationSeconds = durations.reduce((a, b) => Math.max(a, b), 0);
  const minDurationSeconds = durations.reduce((a, b) => Math.min(a, b), Infinity);

  // Genesys metrics
  const queueTimes = validRecords.map(r => r.queue_time_seconds ?? 0);
  const handleTimes = validRecords.map(r => r.handle_time_seconds ?? 0);
  const alertTimes = validRecords.map(r => r.alert_time_seconds ?? 0);

  // "Zero Hold" Rule: Recalculate hold time dynamically to protect against Genesys rounding milliseconds.
  // Formula: hold_time = handle_time - 45 (ACW) - duration
  // Math.max(0, ...) prevents "negative hold" (-1s) from millisecond rounding errors in Genesys data.
  const holdTimes = validRecords.map(r => Math.max(0, (r.handle_time_seconds ?? 0) - 45 - (r.duration_seconds ?? 0)));

  const avgQueueTimeSeconds = queueTimes.length > 0
    ? Math.round(queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length)
    : 0;
  const maxQueueTimeSeconds = queueTimes.reduce((a, b) => Math.max(a, b), 0);
  const avgHandleTimeSeconds = handleTimes.length > 0
    ? Math.round(handleTimes.reduce((a, b) => a + b, 0) / handleTimes.length)
    : 0;
  const avgAlertTimeSeconds = alertTimes.length > 0
    ? Math.round(alertTimes.reduce((a, b) => a + b, 0) / alertTimes.length)
    : 0;
  const avgHoldTimeSeconds = holdTimes.length > 0
    ? Math.round(holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length)
    : 0;
  const maxHoldTimeSeconds = holdTimes.reduce((a, b) => Math.max(a, b), 0);

  const completeCount = validRecords.filter(r => r.export_complete).length;
  const completenessRate = Math.round((completeCount / total) * 100);

  const unattendedCount = validRecords.filter(r => !r.attended).length;
  const unattendedPercent = Math.round((unattendedCount / total) * 100);

  // Executive stats
  const execMap = new Map<string, {
    count: number; totalDuration: number;
    inbound: number; outbound: number; unattended: number; complete: number;
    totalHandleTime: number; totalQueueTime: number; totalAlertTime: number;
    totalAlertSegments: number; bounceCount: number; alertableCount: number;
  }>();
  for (const r of validRecords) {
    const exec = r.executive || 'SIN ATENDER';
    const e = execMap.get(exec) ?? {
      count: 0, totalDuration: 0, inbound: 0, outbound: 0, unattended: 0, complete: 0,
      totalHandleTime: 0, totalQueueTime: 0, totalAlertTime: 0,
      totalAlertSegments: 0, bounceCount: 0, alertableCount: 0,
    };
    execMap.set(exec, {
      count: e.count + 1,
      totalDuration: e.totalDuration + r.duration_seconds,
      inbound: e.inbound + (isInbound(r.call_direction) ? 1 : 0),
      outbound: e.outbound + (!isInbound(r.call_direction) ? 1 : 0),
      unattended: e.unattended + (!r.attended ? 1 : 0),
      complete: e.complete + (r.export_complete ? 1 : 0),
      totalHandleTime: e.totalHandleTime + (r.handle_time_seconds ?? 0),
      totalQueueTime: e.totalQueueTime + (r.queue_time_seconds ?? 0),
      totalAlertTime: e.totalAlertTime + (r.alert_time_seconds ?? 0),
      totalAlertSegments: e.totalAlertSegments + (r.alert_segments ?? 0),
      bounceCount: e.bounceCount + (r.is_bounce ? 1 : 0),
      alertableCount: e.alertableCount + ((r.alert_segments ?? 0) > 0 ? 1 : 0),
    });
  }
  const executiveStats: ExecutiveStat[] = Array.from(execMap.entries())
    .map(([executive, d]) => {
      const avg = Math.round(d.totalDuration / d.count);
      const avgHandleTime = Math.round(d.totalHandleTime / d.count);
      const avgQueueTime = Math.round(d.totalQueueTime / d.count);
      const avgAlertTime = Math.round(d.totalAlertTime / d.count);
      const avgAlertSegments = Math.round((d.totalAlertSegments / d.count) * 10) / 10;
      const bounceRate = d.alertableCount > 0 ? Math.round((d.bounceCount / d.alertableCount) * 100) : 0;
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
        avgHandleTimeSeconds: avgHandleTime,
        avgQueueTimeSeconds: avgQueueTime,
        avgAlertTimeSeconds: avgAlertTime,
        avgAlertSegments: avgAlertSegments,
        bounceCount: d.bounceCount,
        bounceRate: bounceRate,
      };
    })
    .filter(e => e.count >= 5)
    .sort((a, b) => b.count - a.count);

  // Queue stats
  const queueMap = new Map<string, {
    count: number; totalDuration: number;
    inbound: number; outbound: number; unattended: number; complete: number;
    totalHandleTime: number; totalQueueTime: number; totalAlertTime: number;
    totalAlertSegments: number; bounceCount: number; alertableCount: number;
    abandonQueueCount: number; abandonAlertCount: number;
  }>();
  for (const r of validRecords) {
    const q = r.queue || 'Sin cola';
    const e = queueMap.get(q) ?? {
      count: 0, totalDuration: 0, inbound: 0, outbound: 0, unattended: 0, complete: 0,
      totalHandleTime: 0, totalQueueTime: 0, totalAlertTime: 0,
      totalAlertSegments: 0, bounceCount: 0, alertableCount: 0,
      abandonQueueCount: 0, abandonAlertCount: 0,
    };
    queueMap.set(q, {
      count: e.count + 1,
      totalDuration: e.totalDuration + r.duration_seconds,
      inbound: e.inbound + (isInbound(r.call_direction) ? 1 : 0),
      outbound: e.outbound + (!isInbound(r.call_direction) ? 1 : 0),
      unattended: e.unattended + (!r.attended ? 1 : 0),
      complete: e.complete + (r.export_complete ? 1 : 0),
      totalHandleTime: e.totalHandleTime + (r.handle_time_seconds ?? 0),
      totalQueueTime: e.totalQueueTime + (r.queue_time_seconds ?? 0),
      totalAlertTime: e.totalAlertTime + (r.alert_time_seconds ?? 0),
      totalAlertSegments: e.totalAlertSegments + (r.alert_segments ?? 0),
      bounceCount: e.bounceCount + (r.is_bounce ? 1 : 0),
      alertableCount: e.alertableCount + ((r.alert_segments ?? 0) > 0 ? 1 : 0),
      abandonQueueCount: e.abandonQueueCount + (r.abandon_type === 'queue' ? 1 : 0),
      abandonAlertCount: e.abandonAlertCount + (r.abandon_type === 'alert' ? 1 : 0),
    });
  }
  const totalQueueDuration = Array.from(queueMap.values()).reduce((sum, d) => sum + d.totalDuration, 0);
  const queueStats: QueueStat[] = Array.from(queueMap.entries())
    .map(([queue, d]) => {
      const avg = Math.round(d.totalDuration / d.count);
      const avgHandleTime = Math.round(d.totalHandleTime / d.count);
      const avgQueueTime = Math.round(d.totalQueueTime / d.count);
      const avgAlertTime = Math.round(d.totalAlertTime / d.count);
      const avgAlertSegments = Math.round((d.totalAlertSegments / d.count) * 10) / 10;
      const bounceRate = d.alertableCount > 0 ? Math.round((d.bounceCount / d.alertableCount) * 100) : 0;
      const abandonQueueRate = d.unattended > 0 ? Math.round((d.abandonQueueCount / d.unattended) * 100) : 0;
      const abandonAlertRate = d.unattended > 0 ? Math.round((d.abandonAlertCount / d.unattended) * 100) : 0;
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
        avgQueueTimeSeconds: avgQueueTime,
        avgHandleTimeSeconds: avgHandleTime,
        avgAlertTimeSeconds: avgAlertTime,
        avgAlertSegments: avgAlertSegments,
        bounceRate: bounceRate,
        abandonQueueRate: abandonQueueRate,
        abandonAlertRate: abandonAlertRate,
      };
    })
    .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

  // Hourly distribution
  const hourMap = new Map<number, number>();
  for (const r of validRecords) {
    if (r.call_hour !== null && r.call_hour !== undefined) {
      hourMap.set(r.call_hour, (hourMap.get(r.call_hour) ?? 0) + 1);
    }
  }
  const hourlyDistribution: HourBucket[] = Array.from({ length: 11 }, (_, i) => {
    const h = i + 8;
    return { hour: h, label: `${String(h).padStart(2, '0')}:00`, count: hourMap.get(h) ?? 0 };
  });

  // Daily distribution
  const dateMap = new Map<string, number>();
  for (const r of validRecords) {
    if (r.call_date) {
      dateMap.set(r.call_date, (dateMap.get(r.call_date) ?? 0) + 1);
    }
  }
  const dailyDistribution: DailyBucket[] = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Daily attended vs unattended split
  const dailyAttMap = new Map<string, { attended: number; unattended: number }>();
  for (const r of validRecords) {
    if (!r.call_date) continue;
    const cur = dailyAttMap.get(r.call_date) ?? { attended: 0, unattended: 0 };
    dailyAttMap.set(r.call_date, {
      attended: cur.attended + (r.attended ? 1 : 0),
      unattended: cur.unattended + (!r.attended ? 1 : 0),
    });
  }
  const dailyAttendedVsUnattended: DailyAttendanceBucket[] = Array.from(dailyAttMap.entries())
    .map(([date, d]) => ({ date, attended: d.attended, unattended: d.unattended, total: d.attended + d.unattended }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Direction stats
  const dirMap = new Map<string, number>();
  for (const r of validRecords) {
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
  for (const r of validRecords) {
    if (!r.attended || !r.executive || !topExecSet.has(r.executive) || !r.call_date) continue;
    if (!execDayMap.has(r.call_date)) execDayMap.set(r.call_date, new Map());
    const dayMap = execDayMap.get(r.call_date)!;
    const handleTimeSeconds = Math.max(r.handle_time_seconds || 0, r.duration_seconds + 45);
    dayMap.set(r.executive, (dayMap.get(r.executive) ?? 0) + handleTimeSeconds);
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
  for (const r of validRecords) {
    if (!r.attended || !r.executive) continue;
    if (r.call_hour === null || r.call_hour === undefined) continue;
    if (!execHourMap.has(r.call_hour)) execHourMap.set(r.call_hour, new Map());
    const hMap = execHourMap.get(r.call_hour)!;
    const handleTimeSeconds = Math.max(r.handle_time_seconds || 0, r.duration_seconds + 45);
    hMap.set(r.executive, (hMap.get(r.executive) ?? 0) + handleTimeSeconds);
  }
  const allExecutivesWithData = Array.from(
    new Set(records.filter(r => r.attended && r.executive).map(r => r.executive))
  ).sort();
  const executiveHourlyTalkTime: ExecutiveHourlyTalkTime[] = Array.from({ length: 11 }, (_, i) => {
    const h = i + 8;
    const row: ExecutiveHourlyTalkTime = { hour: h, label: `${String(h).padStart(2, '0')}:00` };
    for (const exec of allExecutivesWithData) {
      row[exec] = execHourMap.get(h)?.get(exec) ?? 0;
    }
    return row;
  });

  // Executive weekday talk time (attended calls only, all executives)
  const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const execWeekdayMap = new Map<number, Map<string, number>>();
  for (const r of validRecords) {
    if (!r.attended || !r.executive || !r.call_date) continue;
    const d = new Date(r.call_date + 'T00:00:00');
    const weekday = d.getDay();
    if (!execWeekdayMap.has(weekday)) execWeekdayMap.set(weekday, new Map());
    const wdMap = execWeekdayMap.get(weekday)!;
    const handleTimeSeconds = Math.max(r.handle_time_seconds || 0, r.duration_seconds + 45);
    wdMap.set(r.executive, (wdMap.get(r.executive) ?? 0) + handleTimeSeconds);
  }
  const executiveWeekdayTalkTime: ExecutiveWeekdayTalkTime[] = [1, 2, 3, 4, 5].map(day => {
    const row: ExecutiveWeekdayTalkTime = { day, label: weekdayLabels[day] };
    for (const exec of allExecutivesWithData) {
      row[exec] = execWeekdayMap.get(day)?.get(exec) ?? 0;
    }
    return row;
  });

  const queuePerformanceHeatmap = calculateQueuePerformanceHeatmap(validRecords);
  const queueUnattendedHeatmap = calculateQueueUnattendedHeatmap(validRecords);
  const queueLoadVariability = calculateQueueLoadVariability(validRecords);
  const queueAttendanceEvolution = calculateQueueAttendanceEvolution(validRecords);
  const executiveOccupancy = calculateExecutiveOccupancy(validRecords);
  const hourlyDemand = calculateHourlyDemand(validRecords);
  const topCallers = calculateTopCallers(validRecords, 10);
  const serviceLevel = calculateServiceLevel(validRecords);
  const abandonStats = calculateAbandonStats(validRecords);

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
    avgQueueTimeSeconds,
    avgQueueTimeFormatted: formatDuration(avgQueueTimeSeconds),
    avgHandleTimeSeconds,
    avgHandleTimeFormatted: formatDuration(avgHandleTimeSeconds),
    avgAlertTimeSeconds,
    avgHoldTimeSeconds,
    maxQueueTimeSeconds,
    maxQueueTimeFormatted: formatDuration(maxQueueTimeSeconds),
    maxHoldTimeSeconds,
    maxHoldTimeFormatted: formatDuration(maxHoldTimeSeconds),
    executiveStats,
    queueStats,
    queuePerformanceHeatmap,
    queueUnattendedHeatmap,
    queueLoadVariability,
    queueAttendanceEvolution,
    executiveOccupancy,
    hourlyDemand,
    hourlyDistribution,
    dailyDistribution,
    dailyAttendedVsUnattended,
    directionStats,
    executiveDailyTalkTime,
    executiveHourlyTalkTime,
    executiveWeekdayTalkTime,
    topExecutivesByVolume,
    allExecutivesWithData,
    topCallers,
    serviceLevel,
    abandonStats,
  };
}

// CAMBIO 6: Crear función de reporte de data quality
export interface DataQualityReport {
  totalRecords: number;
  outboundCalls: number;
  inboundCalls: number;
  handleTimeCorrupted: number;
  technicalCuts: number;
  unclassifiedAbandons: number;
  criticalIssues: {
    handleTimeCorrupted: number;
    technicalCutsAsAttended: number;
  };
}

export function getDataQualityReport(records: CallRecord[]): DataQualityReport {
  const report = {
    totalRecords: records.length,
    outboundCalls: records.filter(r =>
      r.call_direction?.toLowerCase().includes('saliente') ||
      r.call_direction?.toLowerCase().includes('outbound')
    ).length,
    inboundCalls: records.filter(r =>
      !r.call_direction?.toLowerCase().includes('saliente') &&
      !r.call_direction?.toLowerCase().includes('outbound')
    ).length,
    handleTimeCorrupted: records.filter(r =>
      r.attended &&
      r.handle_time_seconds > 0 &&
      r.handle_time_seconds < r.duration_seconds
    ).length,
    technicalCuts: records.filter(r => isCorruptedTechnicalCall(r)).length,
    unclassifiedAbandons: records.filter(r =>
      !r.attended && !r.abandon_type
    ).length,
    criticalIssues: {
      handleTimeCorrupted: records.filter(r =>
        r.attended && r.handle_time_seconds < r.duration_seconds && r.handle_time_seconds > 0
      ).length,
      technicalCutsAsAttended: records.filter(r => isCorruptedTechnicalCall(r)).length,
    },
  };

  return report;
}

export type TrendDirection = 'up' | 'down' | 'stable';

export type TopBottomExecutive = {
  executive: string;
  attendanceRate: number;
  callCount: number;
  rank: number;
  trend: TrendDirection;
};

export type TopBottomQueue = {
  queue: string;
  attendanceRate: number;
  callCount: number;
  avgQueueTime: number;
  rank: number;
  trend: TrendDirection;
};

export type TopBottomData = {
  topExecutives: TopBottomExecutive[];
  bottomExecutives: TopBottomExecutive[];
  topQueues: TopBottomQueue[];
  bottomQueues: TopBottomQueue[];
  teamAverageAttendance: number;
};

function calculateTrend(current: number, _previous: number | null): TrendDirection {
  if (_previous === null) return 'stable';
  const diff = current - _previous;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'stable';
}

export function calculateTopBottom(records: CallRecord[], kpis: KPISummary): TopBottomData {
  // Recalcular desde cero usando registros originales
  const execMap = new Map<string, { total: number; attended: number; avgQueueTime: number; totalQueueTime: number }>();
  const queueMap = new Map<string, { total: number; attended: number; avgQueueTime: number; totalQueueTime: number }>();

  for (const r of records) {
    if (!r.executive) continue;

    const exec = r.executive;
    const queue = r.queue || 'Sin cola';
    const attended = r.attended ? 1 : 0;
    const queueTime = r.queue_time_seconds ?? 0;

    // Por ejecutivo
    if (!execMap.has(exec)) {
      execMap.set(exec, { total: 0, attended: 0, avgQueueTime: 0, totalQueueTime: 0 });
    }
    const execData = execMap.get(exec)!;
    execData.total += 1;
    execData.attended += attended;
    execData.totalQueueTime += queueTime;

    // Por cola
    if (!queueMap.has(queue)) {
      queueMap.set(queue, { total: 0, attended: 0, avgQueueTime: 0, totalQueueTime: 0 });
    }
    const queueData = queueMap.get(queue)!;
    queueData.total += 1;
    queueData.attended += attended;
    queueData.totalQueueTime += queueTime;
  }

  const teamAverageAttendance = kpis.totalCalls > 0
    ? Math.round(((kpis.totalCalls - kpis.unattendedCount) / kpis.totalCalls) * 100)
    : 0;

  // Convertir a formato de ranking para ejecutivos
  const executiveAttendance = Array.from(execMap.entries())
    .filter(([name]) => name !== 'SIN ATENDER')
    .map(([executive, data]) => {
      const attendanceRate = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
      const avgQueueTime = data.total > 0 ? Math.round(data.totalQueueTime / data.total) : 0;
      return {
        executive,
        attendanceRate,
        callCount: data.total,
        avgQueueTime,
        trend: calculateTrend(attendanceRate, null) as TrendDirection,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  const topExecutives: TopBottomExecutive[] = executiveAttendance.slice(0, 5).map((e, idx) => ({
    executive: e.executive,
    attendanceRate: e.attendanceRate,
    callCount: e.callCount,
    rank: idx + 1,
    trend: e.trend,
  }));

  const bottomExecutives: TopBottomExecutive[] = executiveAttendance.slice(-5).reverse().map((e, idx) => ({
    executive: e.executive,
    attendanceRate: e.attendanceRate,
    callCount: e.callCount,
    rank: executiveAttendance.length - 4 + idx,
    trend: e.trend,
  }));

  // Convertir a formato de ranking para colas
  const queueAttendance = Array.from(queueMap.entries())
    .filter(([name]) => name !== 'Sin cola')
    .map(([queue, data]) => {
      const attendanceRate = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
      const avgQueueTime = data.total > 0 ? Math.round(data.totalQueueTime / data.total) : 0;
      return {
        queue,
        attendanceRate,
        callCount: data.total,
        avgQueueTime,
        trend: calculateTrend(attendanceRate, null) as TrendDirection,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  const topQueues: TopBottomQueue[] = queueAttendance.slice(0, 5).map((q, idx) => ({
    queue: q.queue,
    attendanceRate: q.attendanceRate,
    callCount: q.callCount,
    avgQueueTime: q.avgQueueTime,
    rank: idx + 1,
    trend: q.trend,
  }));

  const bottomQueues: TopBottomQueue[] = queueAttendance.slice(-5).reverse().map((q, idx) => ({
    queue: q.queue,
    attendanceRate: q.attendanceRate,
    callCount: q.callCount,
    avgQueueTime: q.avgQueueTime,
    rank: queueAttendance.length - 4 + idx,
    trend: q.trend,
  }));

  return {
    topExecutives,
    bottomExecutives,
    topQueues,
    bottomQueues,
    teamAverageAttendance,
  };
}

export function logKPIDebugInfo(records: CallRecord[]): void {
  const quality = getDataQualityReport(records);
  const demand = calculateHourlyDemand(records);

  console.group('📊 KPI Debug Info');
  console.log('Data Quality:', quality);
  console.log('Peak hour Erlang:', demand.points.reduce((max, h) =>
    h.lun && h.lun > (max.lun ?? 0) ? h : max
  ));
  console.groupEnd();
}