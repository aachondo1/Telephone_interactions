import type { CallRecord } from '../supabase';
import { type HourlyDemandData, type HourlyDemandPoint, type InterventionMetrics } from './types';

const MAX_REASONABLE_ALERT_SECONDS = 120;

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
    if (!r.attended) continue;
    if (!r.call_date || r.call_hour === null || r.call_hour === undefined) continue;
    const day = new Date(r.call_date + 'T00:00:00').getDay();
    if (day < 1 || day > 5) continue;
    if (!durationMap.has(day)) durationMap.set(day, new Map());
    const hm = durationMap.get(day)!;

    const handleTimeSeconds = Math.max(r.handle_time_seconds || 0, r.duration_seconds + 45);
    let alertTimeSeconds = r.alert_time_seconds ?? 0;
    if (alertTimeSeconds > MAX_REASONABLE_ALERT_SECONDS || alertTimeSeconds > handleTimeSeconds) {
      alertTimeSeconds = 0;
    }
    const ahtPSeconds = handleTimeSeconds + alertTimeSeconds;

    hm.set(r.call_hour, (hm.get(r.call_hour) ?? 0) + ahtPSeconds);
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
      const hourCapacitySeconds = 3600 * count;
      const erlangs = Math.round((totalSec / hourCapacitySeconds) * 10) / 10;
      point[dayNames[idx]] = erlangs;
      if (erlangs > peakErlangs) peakErlangs = erlangs;
    });
    return point;
  });

  return { points, peakErlangs, weekdayCounts };
}

export function calculateInterventionImpact(
  records: CallRecord[],
  erlangsDivisor: number
): InterventionMetrics[] {
  if (records.length === 0) return [];

  const queueMetrics = new Map<string, {
    callsWithAlert: number;
    callsWithoutAlert: number;
    totalAlertSeconds: number;
    totalHandleSeconds: number;
    count: number;
    uniqueDays: Set<string>;
  }>();

  for (const r of records) {
    if (!r.queue || !r.call_date) continue;

    if (!queueMetrics.has(r.queue)) {
      queueMetrics.set(r.queue, {
        callsWithAlert: 0,
        callsWithoutAlert: 0,
        totalAlertSeconds: 0,
        totalHandleSeconds: 0,
        count: 0,
        uniqueDays: new Set(),
      });
    }

    const metrics = queueMetrics.get(r.queue)!;
    metrics.uniqueDays.add(r.call_date);
    metrics.count += 1;

    const handleTimeSeconds = Math.max(r.handle_time_seconds || 0, r.duration_seconds + 45);
    metrics.totalHandleSeconds += handleTimeSeconds;

    let alertTimeSeconds = r.alert_time_seconds ?? 0;
    if (alertTimeSeconds > MAX_REASONABLE_ALERT_SECONDS || alertTimeSeconds > handleTimeSeconds) {
      alertTimeSeconds = 0;
    }

    if (alertTimeSeconds > 0) {
      metrics.callsWithAlert += 1;
    } else {
      metrics.callsWithoutAlert += 1;
    }
    metrics.totalAlertSeconds += alertTimeSeconds;
  }

  const result: InterventionMetrics[] = Array.from(queueMetrics.entries())
    .map(([queueName, metrics]) => {
      const avgAlertTimeSeconds = metrics.count > 0 ? Math.round(metrics.totalAlertSeconds / metrics.count) : 0;
      const avgHandleTimeSeconds = metrics.count > 0 ? Math.round(metrics.totalHandleSeconds / metrics.count) : 0;
      const alertTimeAsPercentageOfAHT = (metrics.totalHandleSeconds + metrics.totalAlertSeconds) > 0
        ? Math.round((metrics.totalAlertSeconds / (metrics.totalHandleSeconds + metrics.totalAlertSeconds)) * 1000) / 10
        : 0;

      return {
        queueName,
        callsWithAlert: metrics.callsWithAlert,
        callsWithoutAlert: metrics.callsWithoutAlert,
        avgAlertTimeSeconds,
        avgHandleTimeSeconds,
        alertTimeAsPercentageOfAHT,
        erlangsByAlerts: Math.round((metrics.totalAlertSeconds / erlangsDivisor) * 100) / 100,
        erlangsByHandle: Math.round((metrics.totalHandleSeconds / erlangsDivisor) * 100) / 100,
        erlangTotal: Math.round(((metrics.totalHandleSeconds + metrics.totalAlertSeconds) / erlangsDivisor) * 100) / 100,
      };
    })
    .sort((a, b) => b.erlangTotal - a.erlangTotal);

  return result;
}
