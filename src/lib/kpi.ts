// SERVICE LEVEL CALCULATION: PERCEPTUAL TIME MODEL
//
// ⚠️ CRITICAL UNIFICATION (2026-05-01):
// This file implements a unified Service Level (SL%) calculation that accounts for
// the actual customer experience, not just technical queue metrics.
//
// Why Perceptual Time?
// - Technical SL% (queue_time only) masked a 20.4% bounce rate (1000+ failed alerts)
// - Customers experience wait during both queue time AND alert time (phone ringing)
// - When an agent doesn't answer the alert, those seconds are REAL waiting for the customer
// - This model explains the 23.2% abandonment rate more honestly
//
// Calculation:
// SL% = (Calls with queue_time + alert_time ≤ 20s) / (Valid inbound calls) × 100
//
// Filters Applied to "Valid Calls":
// 1. Only INBOUND direction
// 2. Only ATTENDED (r.attended === true)
// 3. Exclude SHORT ABANDONS (< 5s in queue - not counted in metrics)
// 4. Exclude IVR DROPS (flow_exit === false - didn't reach queue)
//
// Related Metrics (also use Perceptual Time):
// - AWT: Average Wait Time (all valid calls)
// - ASA: Average Speed of Answer (attended calls only)
// - ATA: Average Time to Abandon (abandoned calls only)
//
// Functions Affected:
// - calculateServiceLevelPerceptual(): New unified function (single source of truth)
// - calculateServiceLevel(): Now delegates to calculateServiceLevelPerceptual() [DEPRECATED]
// - calculateQueueHealthMetrics(): Updated to use perceptual filters & time model

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

// UNIFIED SERVICE LEVEL CALCULATION (Perceptual Time)
// Includes both queue_time_seconds + alert_time_seconds to reflect actual customer wait
// Filters: Inbound only, excludes short abandons (<5s), excludes IVR drops
export function calculateServiceLevelPerceptual(records: CallRecord[]): ServiceLevelData {
  const SHORT_ABANDON_THRESHOLD = 5;
  const SL_THRESHOLD_SECONDS = 20;

  const hourMap = new Map<number, {
    total: number;
    within20s: number;
    totalWaitTimes: number[];
    queueTimes: number[];
  }>();

  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { total: 0, within20s: 0, totalWaitTimes: [], queueTimes: [] });
  }

  for (const r of records) {
    // Filter 1: Only inbound calls
    if (!isInbound(r.call_direction)) continue;

    // Filter 2: Only attended calls
    if (!r.attended) continue;

    // Filter 3: Exclude short abandons (< 5 seconds)
    const isShortAbandon = r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD;
    if (isShortAbandon) continue;

    // Filter 4: Exclude IVR drops (flow_exit === false)
    const exitedInIVR = r.flow_exit === false;
    if (exitedInIVR) continue;

    // Validation: Must have valid hour
    if (r.call_hour === null || r.call_hour === undefined) continue;

    // Calculate perceptual wait time: queue + alert
    const queueTime = r.queue_time_seconds ?? 0;
    const alertTime = r.alert_time_seconds ?? 0;
    const totalWaitTime = queueTime + alertTime;

    const h = r.call_hour;
    const hourData = hourMap.get(h)!;
    hourData.total += 1;

    // Check if within SL threshold (20 seconds)
    if (totalWaitTime <= SL_THRESHOLD_SECONDS) {
      hourData.within20s += 1;
    }

    hourData.totalWaitTimes.push(totalWaitTime);
    hourData.queueTimes.push(queueTime);
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
    hourData.totalWaitTimes.sort((a, b) => a - b);
    const medianQueue = hourData.totalWaitTimes.length > 0
      ? hourData.totalWaitTimes[Math.floor(hourData.totalWaitTimes.length / 2)]
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

// DEPRECATED: Use calculateServiceLevelPerceptual instead
// This function only considered queue_time and missed critical filters
export function calculateServiceLevel(records: CallRecord[]): ServiceLevelData {
  return calculateServiceLevelPerceptual(records);
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

// Operational KPIs
export type OperationalKPIs = {
  bounceRatePercent: number;
  menuAbandonRatePercent: number;
  alertSuccessRatio: number;
};

// Queue Health Dashboard Types
export type QueueHealthMetric = {
  queue: string;
  serviceLevelPercent: number;
  abandonmentRatePercent: number;
  awtSeconds: number;
  awtFormatted: string;
  asaSeconds: number;
  asaFormatted: string;
  ataSeconds: number;
  ataFormatted: string;
  erlangC: number;
  staffingEfficiency: number;
  slTrend: 'up' | 'down' | 'stable';
  totalCalls: number;
  attendedCalls: number;
  abandonedCalls: number;
};

export type AbandonFunnelData = {
  // Level 1: Raw Inbound
  totalInbound: number;
  ivrMenuAbandons: number; // flow_exit !== true + ivr_time > 10s
  ivrErrors: number; // flow_exit !== true + ivr_time <= 10s
  shortAbandons: number; // Queue abandons < 5s

  // Level 2: Valid Calls (New 100% Reference)
  validCalls: number;

  // Level 3: Final Distribution
  attendedCalls: number;
  realAbandonedCalls: number;

  // Perceptual Metrics
  asaPerceptualSeconds: number; // Average queue + alert time for attended
  ataPerceptualSeconds: number; // Average queue + alert time for abandoned
  avgIvrSeconds: number; // Average wait in IVR before exit

  // Data Integrity Check
  integrityCheck: {
    expected: number;
    actual: number;
    isValid: boolean;
  };
};

export type TechnicalLeaksData = {
  shortAbandons: number;
  ivrDrops: number;
  totalTechnicalLeaks: number;
  percentOfInbound: number;
};

export type QueueHealthInsight = {
  type: 'staffing' | 'availability' | 'quality';
  severity: 'critical' | 'warning' | 'info';
  queue: string;
  hour?: number;
  message: string;
  metric: string;
  value: number | string;
  threshold: number | string;
};

export function calculateQueueHealthMetrics(records: CallRecord[]): QueueHealthMetric[] {
  if (records.length === 0) return [];

  // Calcular período de tiempo para normalización
  const dates = records
    .filter(r => r.call_date)
    .map(r => new Date(r.call_date + 'T00:00:00').getTime())
    .sort((a, b) => a - b);

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const daysInPeriod = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24) + 1);

  // Horario de negocios (jornada laboral actual en Chile)
  // 38 horas semanales / 5 días = 7.6 horas por día hábil
  // ⚠️ CRÍTICO: Este denominador determina la "intensidad de tráfico" (Erlang C)
  // Una jornada de 38 horas vs 45 horas implica mayor densidad de tráfico con el mismo volumen de llamadas
  const hoursPerBusinessDay = 7.6;
  const hoursInPeriod = daysInPeriod * hoursPerBusinessDay;

  // Umbrales para Service Level (estándar Chile)
  const SL_THRESHOLD_SECONDS = 20; // 80/20 - estándar de excelencia
  const SHORT_ABANDON_THRESHOLD = 5; // Abandonos cortos (< 5s) no cuentan

  const queueMap = new Map<string, CallRecord[]>();

  for (const r of records) {
    const queue = r.queue || 'Sin cola';
    if (!queueMap.has(queue)) queueMap.set(queue, []);
    queueMap.get(queue)!.push(r);
  }

  const metrics: QueueHealthMetric[] = [];

  for (const [queue, queueRecords] of queueMap) {
    const inboundCalls = queueRecords.filter(r => isInbound(r.call_direction));

    // UNIFIED FILTER: Define what constitutes a "Valid Call" (reached queue, passed through IVR)
    // Filters:
    // 1. Inbound only
    // 2. Reached queue (flow_exit !== false)
    // 3. Exclude short abandons (< 5 seconds - noise)
    // Valid calls = Attended calls + Real Abandoned calls (queue/alert only)

    // Attended calls: Must reach queue, be attended, not short abandon
    const attendedCalls = inboundCalls.filter(r => {
      if (!r.attended) return false;
      const isShortAbandon = r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD;
      if (isShortAbandon) return false;
      const exitedInIVR = r.flow_exit === false;
      if (exitedInIVR) return false;
      return true;
    }).length;

    // Real Abandoned calls: Unattended but reached queue, abandoned in queue/alert, not short abandon
    const realAbandonedCalls = inboundCalls.filter(r =>
      !r.attended && (r.abandon_type === 'queue' || r.abandon_type === 'alert') &&
      r.flow_exit !== false && // Must have reached queue (NOT IVR drop)
      (r.queue_time_seconds === null || r.queue_time_seconds >= SHORT_ABANDON_THRESHOLD) // NOT short abandon
    ).length;

    // CRITICAL: Single denominator for both SL% and Abandonment Rate
    // These are the calls that reached the queue and didn't short-abandon
    const totalValidCalls = attendedCalls + realAbandonedCalls;

    // Service Level: Perceptual wait time (queue + alert) <= 20s / Total valid calls
    const answeredWithin20s = inboundCalls.filter(r => {
      // Must be attended and pass the valid call filters
      if (!r.attended) return false;
      const isShortAbandon = r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD;
      if (isShortAbandon) return false;
      const exitedInIVR = r.flow_exit === false;
      if (exitedInIVR) return false;

      // Check perceptual wait time
      const queueTime = r.queue_time_seconds ?? 0;
      const alertTime = r.alert_time_seconds ?? 0;
      const totalWaitTime = queueTime + alertTime;
      return totalWaitTime <= SL_THRESHOLD_SECONDS;
    }).length;

    const serviceLevelPercent = totalValidCalls > 0
      ? Math.round((answeredWithin20s / totalValidCalls) * 100)
      : 0;

    // Tasa de Abandono: Real abandonadas en cola/alerta / Total válidas
    // Uses same denominator as SL% to ensure: SL% + Abandonment% = 100% (mathematically consistent)
    const abandonmentRatePercent = totalValidCalls > 0
      ? Math.round((realAbandonedCalls / totalValidCalls) * 100)
      : 0;

    const abandonedCalls = realAbandonedCalls;

    // AWT Global: Promedio de espera PERCEPTUAL (queue + alert) de TODAS las llamadas válidas
    // (both attended and real abandoned - reflects overall queue experience)
    const allValidRecords = inboundCalls.filter(r => {
      const isShortAbandon = r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD;
      if (isShortAbandon) return false;
      const exitedInIVR = r.flow_exit === false;
      if (exitedInIVR) return false;
      return true;
    });

    const allWaitTimes = allValidRecords
      .map(r => {
        const queueTime = r.queue_time_seconds ?? 0;
        const alertTime = r.alert_time_seconds ?? 0;
        return queueTime + alertTime;
      })
      .filter(t => t >= 0);

    const awtSeconds = allWaitTimes.length > 0
      ? Math.round(allWaitTimes.reduce((a, b) => a + b, 0) / allWaitTimes.length)
      : 0;

    // ASA: Promedio de espera PERCEPTUAL solo de llamadas ATENDIDAS (velocidad del equipo)
    const answeredWaitTimes = allValidRecords
      .filter(r => r.attended)
      .map(r => {
        const queueTime = r.queue_time_seconds ?? 0;
        const alertTime = r.alert_time_seconds ?? 0;
        return queueTime + alertTime;
      })
      .filter(t => t >= 0);

    const asaSeconds = answeredWaitTimes.length > 0
      ? Math.round(answeredWaitTimes.reduce((a, b) => a + b, 0) / answeredWaitTimes.length)
      : 0;

    // ATA: Promedio de espera PERCEPTUAL de llamadas ABANDONADAS en cola/alerta (paciencia del cliente)
    const abandonedWaitTimes = allValidRecords
      .filter(r => !r.attended && (r.abandon_type === 'queue' || r.abandon_type === 'alert'))
      .map(r => {
        const queueTime = r.queue_time_seconds ?? 0;
        const alertTime = r.alert_time_seconds ?? 0;
        return queueTime + alertTime;
      })
      .filter(t => t >= 0);

    const ataSeconds = abandonedWaitTimes.length > 0
      ? Math.round(abandonedWaitTimes.reduce((a, b) => a + b, 0) / abandonedWaitTimes.length)
      : 0;

    const handleTimes = allValidRecords
      .filter(r => r.handle_time_seconds !== null && r.handle_time_seconds >= 0)
      .map(r => r.handle_time_seconds!);

    // Erlang C: intensidad de tráfico normalizado por horas del período
    // Fórmula: SUM(handle_time_seconds) / (3600 × Horas del Período)
    // Esto da el promedio de Erlangs por hora
    const totalHandleTime = handleTimes.reduce((a, b) => a + b, 0);
    const erlangC = Math.round((totalHandleTime / (3600 * hoursInPeriod)) * 10) / 10;

    // Staffing Efficiency: Erlang C normalized (traffic intensity as % of 1.0)
    const staffingEfficiency = (erlangC / 1.0) * 100;

    // SL% Trend: Compare against 80% benchmark
    const slTrend: 'up' | 'down' | 'stable' = serviceLevelPercent >= 80
      ? 'up'
      : serviceLevelPercent >= 70
        ? 'stable'
        : 'down';

    metrics.push({
      queue,
      serviceLevelPercent,
      abandonmentRatePercent,
      awtSeconds,
      awtFormatted: formatDuration(awtSeconds),
      asaSeconds,
      asaFormatted: formatDuration(asaSeconds),
      ataSeconds,
      ataFormatted: formatDuration(ataSeconds),
      erlangC,
      staffingEfficiency,
      slTrend,
      totalCalls: totalValidCalls,
      attendedCalls,
      abandonedCalls,
    });
  }

  return metrics.sort((a, b) => b.totalCalls - a.totalCalls);
}

export function calculateAbandonFunnel(records: CallRecord[]): AbandonFunnelData {
  const SHORT_ABANDON_THRESHOLD = 5;
  const AUTOSERVICE_MIN_IVR_TIME = 45; // segundos: si IVR > 45s, cliente probablemente usó autoservicio
  const ABANDON_MAX_IVR_TIME = 10; // segundos: si IVR < 10s, probablemente abandono prematuro

  // LEVEL 1: Raw Inbound (100% base)
  const inboundCalls = records.filter(r => isInbound(r.call_direction));
  const totalInbound = inboundCalls.length;

  // Quality Filters (Removing Non-Valid Calls)
  // CRITICAL: IVR en BiceHipotecaria SOLO enruta. Sin autoservicio, cualquier flow_exit !== true es una pérdida.
  //
  // 1. Abandono en Menú (Fuga): flow_exit !== true + ivr_time > 10s
  //    = Cliente intentó navegar menú, se confundió/aburrió, colgó
  //
  // 2. Error de Marcación: flow_exit !== true + ivr_time <= 10s
  //    = Cliente colgó apenas escuchó saludo (toque accidental o cambio de idea)

  const ivrMenuAbandons = inboundCalls.filter(r => {
    const escapedIVR = r.flow_exit !== true;
    const spentTimeInMenu = (r.ivr_time_seconds ?? 0) > ABANDON_MAX_IVR_TIME;
    return escapedIVR && spentTimeInMenu;
  }).length;

  const ivrErrors = inboundCalls.filter(r => {
    const escapedIVR = r.flow_exit !== true;
    const quickExit = (r.ivr_time_seconds ?? 0) <= ABANDON_MAX_IVR_TIME;
    return escapedIVR && quickExit;
  }).length;

  // Total IVR losses
  const totalIvrLosses = ivrMenuAbandons + ivrErrors;

  // 2. Short Abandons: Llamadas que SÍ llegaron a cola pero abandonadas en < 5s
  const shortAbandons = inboundCalls.filter(r =>
    r.flow_exit !== false && // DID reach queue
    !r.attended &&
    (r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD)
  ).length;

  // LEVEL 2: Valid Calls (New 100% reference for rest of funnel)
  // Valid = Inbound - IVR Losses (Menu Abandons + Errors) - Short Queue Abandons
  // Only calls that reached the queue AND survived initial 5s threshold count as "valid"
  const validCallRecords = inboundCalls.filter(r =>
    r.flow_exit !== false && // DID reach queue (flow_exit = true or neutral)
    (r.queue_time_seconds === null || r.queue_time_seconds >= SHORT_ABANDON_THRESHOLD) // NOT short abandon
  );
  const validCalls = validCallRecords.length;

  // LEVEL 3: Final Distribution (from Valid Calls)
  // Attended: Valid calls that were answered
  const attendedCalls = validCallRecords.filter(r => r.attended).length;

  // Real Abandoned: Valid calls that were NOT attended (abandoned in queue/alert after 5s)
  const realAbandonedCalls = validCallRecords.filter(r => !r.attended).length;

  // PERCEPTUAL METRICS
  // ASA Perceptual: Average of (queue_time + alert_time) for attended calls only
  const attendedRecords = validCallRecords.filter(r => r.attended);
  const attendedWaitTimes = attendedRecords
    .map(r => {
      const queueTime = r.queue_time_seconds ?? 0;
      const alertTime = r.alert_time_seconds ?? 0;
      return queueTime + alertTime;
    })
    .filter(t => t >= 0);

  const asaPerceptualSeconds = attendedWaitTimes.length > 0
    ? Math.round(attendedWaitTimes.reduce((a, b) => a + b, 0) / attendedWaitTimes.length)
    : 0;

  // ATA Perceptual: Average of (queue_time + alert_time) for abandoned calls only
  const abandonedRecords = validCallRecords.filter(r => !r.attended);
  const abandonedWaitTimes = abandonedRecords
    .map(r => {
      const queueTime = r.queue_time_seconds ?? 0;
      const alertTime = r.alert_time_seconds ?? 0;
      return queueTime + alertTime;
    })
    .filter(t => t >= 0);

  const ataPerceptualSeconds = abandonedWaitTimes.length > 0
    ? Math.round(abandonedWaitTimes.reduce((a, b) => a + b, 0) / abandonedWaitTimes.length)
    : 0;

  // Average IVR Time: Only for calls that exited in IVR
  const ivrRecords = inboundCalls.filter(r => r.flow_exit === false);
  const ivrWaitTimes = ivrRecords
    .map(r => r.ivr_time_seconds ?? 0)
    .filter(t => t >= 0);

  const avgIvrSeconds = ivrWaitTimes.length > 0
    ? Math.round(ivrWaitTimes.reduce((a, b) => a + b, 0) / ivrWaitTimes.length)
    : 0;

  // DATA INTEGRITY CHECK
  // Total Inbound must equal: (Menu Abandons + Errors) + Short Abandons + Attended + Real Abandoned
  const integrityExpected = totalInbound;
  const integrityActual = ivrMenuAbandons + ivrErrors + shortAbandons + attendedCalls + realAbandonedCalls;
  const integrityCheck = {
    expected: integrityExpected,
    actual: integrityActual,
    isValid: integrityExpected === integrityActual,
  };

  return {
    totalInbound,
    ivrMenuAbandons,
    ivrErrors,
    shortAbandons,
    validCalls,
    attendedCalls,
    realAbandonedCalls,
    asaPerceptualSeconds,
    ataPerceptualSeconds,
    avgIvrSeconds,
    integrityCheck,
  };
}

export function calculateTechnicalLeaks(records: CallRecord[]): TechnicalLeaksData {
  const SHORT_ABANDON_THRESHOLD = 5;

  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  // Filtros MUTUAMENTE EXCLUYENTES para evitar duplicación
  // 1. IVR Drops: Llamadas que NO llegaron a la cola (flow_exit = false)
  const ivrDrops = inboundCalls.filter(r => r.flow_exit === false).length;

  // 2. Short Abandons: Llamadas que SÍ llegaron a cola (flow_exit != false)
  //    pero cliente cuelga en < 5 segundos (antes de procesamiento)
  const shortAbandons = inboundCalls.filter(r =>
    r.flow_exit !== false && // Asegurar que NO es IVR drop
    !r.attended &&
    (r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD)
  ).length;

  const totalTechnicalLeaks = shortAbandons + ivrDrops;
  const percentOfInbound = inboundCalls.length > 0
    ? Math.round((totalTechnicalLeaks / inboundCalls.length) * 100)
    : 0;

  return { shortAbandons, ivrDrops, totalTechnicalLeaks, percentOfInbound };
}

export function generateQueueHealthInsights(
  metrics: QueueHealthMetric[],
  funnelData: AbandonFunnelData,
  records: CallRecord[]
): QueueHealthInsight[] {
  const insights: QueueHealthInsight[] = [];

  // Alert 1: Understaffing
  for (const metric of metrics) {
    if (metric.serviceLevelPercent < 80 && metric.abandonmentRatePercent > 10) {
      insights.push({
        type: 'staffing',
        severity: 'critical',
        queue: metric.queue,
        message: `Falta Personal: La cola ${metric.queue} está subdimensionada. Los clientes cuelgan por exceso de espera.`,
        metric: 'Service Level & Abandonment Rate',
        value: `SL: ${metric.serviceLevelPercent}%, Abandonos: ${metric.abandonmentRatePercent}%`,
        threshold: 'SL > 80%, Abandonos < 10%',
      });
    }
  }

  // Alert 2: High bounce abandons
  const bounceAbandons = funnelData.bounceAbandons;
  const totalAbandons = funnelData.totalAbandons;
  if (totalAbandons > 0 && bounceAbandons / totalAbandons > 0.05) {
    insights.push({
      type: 'availability',
      severity: 'warning',
      queue: 'General',
      message: `Abandonos tras Rebote Elevados: Los clientes están siendo devueltos frecuentemente antes de ser atendidos. Revisar estrategia de enrutamiento y disponibilidad de agentes.`,
      metric: 'Bounce Abandon Rate',
      value: `${Math.round((bounceAbandons / totalAbandons) * 100)}%`,
      threshold: '< 5%',
    });
  }

  // Alert 3: Quality / Re-entry issues
  const topCallers = new Map<string, number>();
  for (const r of records) {
    if (r.ani_hash) {
      topCallers.set(r.ani_hash, (topCallers.get(r.ani_hash) || 0) + 1);
    }
  }
  const reentryPercent = topCallers.size > 0
    ? Array.from(topCallers.values()).filter(count => count > 1).length / topCallers.size * 100
    : 0;

  if (reentryPercent > 15) {
    insights.push({
      type: 'quality',
      severity: 'warning',
      queue: 'General',
      message: `Revisar Calidad: Los clientes están volviendo a llamar mucho. Posible falta de resolución o agentes muy dependientes del Hold.`,
      metric: 'Re-entry %',
      value: `${Math.round(reentryPercent)}%`,
      threshold: '< 15%',
    });
  }

  return insights;
}

// Queue Wait Distribution (consistent with health metrics filtering)
export type QueueWaitDistributionData = {
  buckets: Array<{ label: string; count: number; percentage: number }>;
  slPercent: number;
  midPercent: number;
  longPercent: number;
  totalValidCalls: number;
};

// 1. Bounce Rate Operativo: % de llamadas atendidas que tuvieron al menos 1 rebote
export function calculateBounceRate(records: CallRecord[]): number {
  const inboundCalls = records.filter(r => isInbound(r.call_direction));
  const attendedCalls = inboundCalls.filter(r => r.attended).length;

  if (attendedCalls === 0) return 0;

  const bouncedCalls = inboundCalls.filter(r => r.attended && r.alert_segments > 1).length;
  return Math.round((bouncedCalls / attendedCalls) * 100);
}

// 2. Menu Abandon Rate: % de llamadas que abandonaron en IVR después de 10s (frustración/confusión)
export function calculateMenuAbandonRate(records: CallRecord[]): number {
  const MENU_INTERACTION_THRESHOLD = 10;
  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  if (inboundCalls.length === 0) return 0;

  const menuAbandons = inboundCalls.filter(r =>
    r.flow_exit !== true && // Did not reach queue
    (r.ivr_time_seconds ?? 0) > MENU_INTERACTION_THRESHOLD // Spent time navigating menu
  ).length;

  return Math.round((menuAbandons / inboundCalls.length) * 100);
}

// 3. Alert Success Ratio: Probabilidad de que un ejecutivo atienda cuando le suena
export function calculateAlertSuccessRatio(records: CallRecord[]): number {
  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  if (inboundCalls.length === 0) return 0;

  let totalAlertSegments = 0;
  let totalNoRespond = 0;

  for (const r of inboundCalls) {
    totalAlertSegments += r.alert_segments || 0;

    // Parse alerted_users JSON to count "No responden"
    if (r.alerted_users) {
      try {
        const users = JSON.parse(r.alerted_users);
        totalNoRespond += (users['No responden'] || 0);
      } catch {
        // Ignore parse errors
      }
    }
  }

  if (totalAlertSegments === 0) return 0;

  const successRatio = 1 - (totalNoRespond / totalAlertSegments);
  return Math.round(successRatio * 100);
}

export function calculateOperationalKPIs(records: CallRecord[]): OperationalKPIs {
  return {
    bounceRatePercent: calculateBounceRate(records),
    menuAbandonRatePercent: calculateMenuAbandonRate(records),
    alertSuccessRatio: calculateAlertSuccessRatio(records),
  };
}

export function calculateQueueWaitDistribution(records: CallRecord[]): QueueWaitDistributionData {
  const SHORT_ABANDON_THRESHOLD = 5;
  const inboundCalls = records.filter(r => isInbound(r.call_direction));

  // CRITICAL: Use EXACT same filter as calculateAbandonFunnel's realAbandonedCalls
  // This is a DETAILED BREAKDOWN of the "Abandonos Reales" from Level 3 of the funnel
  //
  // Valid Calls: Inbound - IVR Fugues - Short Abandons
  const validCallRecords = inboundCalls.filter(r =>
    r.flow_exit !== false && // NOT IVR drop
    (r.queue_time_seconds === null || r.queue_time_seconds >= SHORT_ABANDON_THRESHOLD) // NOT short abandon
  );

  // Real Abandoned: Valid calls that were NOT attended
  const realAbandonedCalls = validCallRecords.filter(r => !r.attended);

  // Buckets: Time-to-Abandon using PERCEPTUAL wait time (queue + alert)
  // NOT just queue_time_seconds, because customer experiences both
  const buckets = [
    { label: '<10s', min: 0, max: 10 },
    { label: '10-20s', min: 10, max: 20 },
    { label: '20-30s', min: 20, max: 30 },
    { label: '30-60s', min: 30, max: 60 },
    { label: '60-120s', min: 60, max: 120 },
    { label: '120-300s', min: 120, max: 300 },
    { label: '300-600s', min: 300, max: 600 },
    { label: '>600s', min: 600, max: Infinity },
  ];

  const bucketData = buckets.map(b => {
    const count = realAbandonedCalls.filter(r => {
      const queueTime = r.queue_time_seconds ?? 0;
      const alertTime = r.alert_time_seconds ?? 0;
      const perceptualWait = queueTime + alertTime;
      return perceptualWait >= b.min && perceptualWait < b.max;
    }).length;
    return {
      label: b.label,
      count,
      percentage: realAbandonedCalls.length > 0 ? Math.round((count / realAbandonedCalls.length) * 100) : 0,
    };
  });

  // Service Level metrics for abandoned calls (using perceptual wait time):
  // ≤20s (SL compliance zone - could be recovered with immediate answer)
  // 20-60s (recovery window - customer still in reasonable patience range)
  // >60s (lost - customer frustration too high)
  const slCount = realAbandonedCalls.filter(r => {
    const queueTime = r.queue_time_seconds ?? 0;
    const alertTime = r.alert_time_seconds ?? 0;
    return (queueTime + alertTime) <= 20;
  }).length;
  const midCount = realAbandonedCalls.filter(r => {
    const queueTime = r.queue_time_seconds ?? 0;
    const alertTime = r.alert_time_seconds ?? 0;
    const perceptualWait = queueTime + alertTime;
    return perceptualWait > 20 && perceptualWait <= 60;
  }).length;
  const longCount = realAbandonedCalls.filter(r => {
    const queueTime = r.queue_time_seconds ?? 0;
    const alertTime = r.alert_time_seconds ?? 0;
    return (queueTime + alertTime) > 60;
  }).length;

  return {
    buckets: bucketData,
    slPercent: realAbandonedCalls.length > 0 ? Math.round((slCount / realAbandonedCalls.length) * 100) : 0,
    midPercent: realAbandonedCalls.length > 0 ? Math.round((midCount / realAbandonedCalls.length) * 100) : 0,
    longPercent: realAbandonedCalls.length > 0 ? Math.round((longCount / realAbandonedCalls.length) * 100) : 0,
    totalValidCalls: realAbandonedCalls.length,
  };
}