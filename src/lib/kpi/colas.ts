import type { CallRecord } from '../supabase';
import {
  type QueueHeatmapData,
  type QueueHeatmapRow,
  type QueueHeatmapCell,
  type QueueUnattendedHeatmapData,
  type QueueUnattendedRow,
  type QueueUnattendedCell,
  type QueueVariabilityData,
  type QueueVariabilityRow,
  type QueueHourlyStats,
  type QueueAttendanceEvolutionData,
  type AttendancePeriodPoint,
  type WeeklyAttentionHeatmapData,
  type TopCallerEntry,
} from './types';
import { isInbound, getMondayKey, weekLabel, monthLabel, isMobileNumber } from './shared';

export function calculateQueuePerformanceHeatmap(records: CallRecord[]): QueueHeatmapData {
  if (records.length === 0) {
    return { data: [], maxCount: 0 };
  }

  const queueMap = new Map<string, Map<number, Map<number, number>>>();

  for (const r of records) {
    if (!r.queue || r.queue.trim() === '') continue;

    const queue = r.queue;
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
    if (!r.queue) continue;
    const queue = r.queue;
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

export function calculateWeeklyAttentionHeatmap(records: CallRecord[]): WeeklyAttentionHeatmapData {
  if (records.length === 0) return { weeks: [], weekLabels: [], queues: [], data: [] };

  const inboundRecords = records.filter(r => isInbound(r.call_direction));
  if (inboundRecords.length === 0) return { weeks: [], weekLabels: [], queues: [], data: [] };

  const queueTotals = new Map<string, number>();
  for (const r of inboundRecords) {
    if (!r.queue) continue;
    queueTotals.set(r.queue, (queueTotals.get(r.queue) ?? 0) + 1);
  }
  const topQueues = Array.from(queueTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([q]) => q);
  const topQueueSet = new Set(topQueues);

  const weekQueueMap = new Map<string, Map<string, { total: number; attended: number }>>();

  for (const r of inboundRecords) {
    if (!r.queue || !r.call_date || !topQueueSet.has(r.queue)) continue;

    const weekKey = getMondayKey(r.call_date);
    if (!weekQueueMap.has(weekKey)) {
      weekQueueMap.set(weekKey, new Map());
    }

    const queueMap = weekQueueMap.get(weekKey)!;
    const cur = queueMap.get(r.queue) ?? { total: 0, attended: 0 };
    const hasConversation = (r.conversation_total_seconds ?? 0) > 0;
    queueMap.set(r.queue, {
      total: cur.total + 1,
      attended: cur.attended + (hasConversation ? 1 : 0),
    });
  }

  const sortedWeeks = Array.from(weekQueueMap.keys()).sort();
  const weekLabels = sortedWeeks.map(weekLabel);

  const heatmapData = topQueues.map(queue => {
    const cells = sortedWeeks.map(weekKey => {
      const queueStats = weekQueueMap.get(weekKey)?.get(queue);
      const percentage = queueStats && queueStats.total > 0
        ? Math.round((queueStats.attended / queueStats.total) * 100)
        : null;
      return { weekKey, percentage };
    });

    return { queue, cells };
  });

  return {
    weeks: sortedWeeks,
    weekLabels,
    queues: topQueues,
    data: heatmapData,
  };
}

export function calculateTopCallers(
  records: CallRecord[],
  limit = 10,
  mobileOnly = false,
  inboundOnly = false,
  assignedToQueueOnly = true
): TopCallerEntry[] {
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
    if (inboundOnly && !isInbound(r.call_direction)) continue;
    if (assignedToQueueOnly && !r.queue) continue;

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
