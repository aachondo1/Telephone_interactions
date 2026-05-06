import type { CallRecord } from '../supabase';
import {
  type KPISummary,
  type ServiceLevelData,
  type ServiceLevelPoint,
  type AbandonStats,
  type ExecutiveStat,
  type QueueStat,
  type HourBucket,
  type DailyBucket,
  type DailyAttendanceBucket,
  type DirectionStat,
  type ExecutiveDailyTalkTime,
  type ExecutiveHourlyTalkTime,
  type ExecutiveWeekdayTalkTime,
} from './types';
import { formatDuration, isInbound, calculateErlangsDivisor } from './shared';

export function getEmptyKPISummary(): KPISummary {
  return {
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
    weeklyAttentionHeatmap: { weeks: [], weekLabels: [], queues: [], data: [] },
    executiveOccupancy: { entries: [] },
    hourlyDemand: { points: [], peakErlangs: 0, weekdayCounts: { lun: 0, mar: 0, mie: 0, jue: 0, vie: 0 }, agentCountsByHour: {} },
    interventionMetrics: [],
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
}
import { isCorruptedTechnicalCall } from './calidad';
import {
  calculateQueuePerformanceHeatmap,
  calculateQueueUnattendedHeatmap,
  calculateQueueLoadVariability,
  calculateQueueAttendanceEvolution,
  calculateWeeklyAttentionHeatmap,
  calculateTopCallers,
} from './colas';
import { calculateExecutiveOccupancy } from './ejecutivos';
import { calculateHourlyDemand, calculateInterventionImpact } from './planificacion';

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
    if (!isInbound(r.call_direction)) continue;
    if (!r.attended) continue;
    const isShortAbandon = r.queue_time_seconds === null || r.queue_time_seconds < SHORT_ABANDON_THRESHOLD;
    if (isShortAbandon) continue;
    if (r.flow_exit === false) continue;
    if (r.call_hour === null || r.call_hour === undefined) continue;

    const totalWaitTime = (r.queue_time_seconds ?? 0) + (r.alert_time_seconds ?? 0);

    const h = r.call_hour;
    const hourData = hourMap.get(h)!;
    hourData.total += 1;

    if (totalWaitTime <= SL_THRESHOLD_SECONDS) {
      hourData.within20s += 1;
    }

    hourData.totalWaitTimes.push(totalWaitTime);
    hourData.queueTimes.push(r.queue_time_seconds ?? 0);
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

export function calculateServiceLevel(records: CallRecord[]): ServiceLevelData {
  return calculateServiceLevelPerceptual(records);
}

export function calculateAbandonStats(records: CallRecord[]): AbandonStats {
  let totalUnattended = 0;
  let abandonedInQueue = 0;
  let abandonedInAlert = 0;
  let abandonedInIVR = 0;

  for (const r of records) {
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

export async function calculateKPIs(records: CallRecord[]): Promise<KPISummary> {
  const inboundRecords = records.filter(r =>
    !r.call_direction?.toLowerCase().includes('saliente') &&
    !r.call_direction?.toLowerCase().includes('outbound')
  );

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
  if (total === 0) return getEmptyKPISummary();

  const durations = validRecords.map(r => r.duration_seconds);
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const avgDurationSeconds = Math.round(totalDuration / total);
  const maxDurationSeconds = durations.reduce((a, b) => Math.max(a, b), 0);
  const minDurationSeconds = durations.reduce((a, b) => Math.min(a, b), Infinity);

  const queueTimes = validRecords.map(r => r.queue_time_seconds ?? 0);
  const handleTimes = validRecords.map(r => r.handle_time_seconds ?? 0);
  const alertTimes = validRecords.map(r => r.alert_time_seconds ?? 0);
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

  // Top 5 executives by volume
  const topExecutivesByVolume = executiveStats
    .filter(e => e.executive !== 'SIN ATENDER')
    .slice(0, 5)
    .map(e => e.executive);

  const topExecSet = new Set(topExecutivesByVolume);

  // Executive daily talk time
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

  // Executive hourly talk time
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

  // Executive weekday talk time
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
  const weeklyAttentionHeatmap = calculateWeeklyAttentionHeatmap(validRecords);
  const executiveOccupancy = calculateExecutiveOccupancy(validRecords);
  const hourlyDemand = await calculateHourlyDemand(validRecords);

  const dateDates = validRecords.filter(r => r.call_date).map(r => r.call_date!);
  const minDate = dateDates.length > 0 ? dateDates.sort()[0] : '2024-01-01';
  const maxDate = dateDates.length > 0 ? dateDates.sort().reverse()[0] : '2024-01-01';
  const erlangsDivisor = calculateErlangsDivisor(minDate, maxDate);

  const interventionMetrics = calculateInterventionImpact(validRecords, erlangsDivisor);
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
    weeklyAttentionHeatmap,
    executiveOccupancy,
    hourlyDemand,
    interventionMetrics,
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
