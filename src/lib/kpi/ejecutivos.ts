import type { CallRecord, AgentStatusRecord } from '../supabase';
import { type ExecutiveOccupancyData, type ExecutiveOccupancyEntry } from './types';
import { timeStringToMinutes } from './shared';
import { generateAuditFlags } from './audit-flags';

const MAX_REASONABLE_ALERT_SECONDS = 120;

export function calculateExecutiveOccupancy(records: CallRecord[]): ExecutiveOccupancyData {
  if (records.length === 0) return { entries: [] };

  const execDayMap = new Map<string, Set<string>>();
  const execDayTalkMap = new Map<string, Map<string, number>>();
  const execDayAlertMap = new Map<string, Map<string, number>>();

  for (const r of records) {
    if (!r.executive || r.executive === 'SIN ATENDER' || !r.call_date || !r.attended) continue;

    if (!execDayMap.has(r.executive)) {
      execDayMap.set(r.executive, new Set());
      execDayTalkMap.set(r.executive, new Map());
      execDayAlertMap.set(r.executive, new Map());
    }

    execDayMap.get(r.executive)!.add(r.call_date);

    const dayTalkMap = execDayTalkMap.get(r.executive)!;
    const dayAlertMap = execDayAlertMap.get(r.executive)!;
    if (!dayTalkMap.has(r.call_date)) dayTalkMap.set(r.call_date, 0);
    if (!dayAlertMap.has(r.call_date)) dayAlertMap.set(r.call_date, 0);

    const callTime = timeStringToMinutes(r.call_time);
    if (callTime === null) continue;

    const handleTimeSeconds = Math.max(r.handle_time_seconds || 0, r.duration_seconds + 45);
    const handleMin = Math.ceil(handleTimeSeconds / 60);
    dayTalkMap.set(r.call_date, dayTalkMap.get(r.call_date)! + handleMin);

    let alertTimeSeconds = r.alert_time_seconds ?? 0;
    if (alertTimeSeconds > MAX_REASONABLE_ALERT_SECONDS || alertTimeSeconds > handleTimeSeconds) {
      alertTimeSeconds = 0;
    }
    const alertMin = Math.ceil(alertTimeSeconds / 60);
    dayAlertMap.set(r.call_date, dayAlertMap.get(r.call_date)! + alertMin);
  }

  const WEEKLY_SHIFT_MINUTES = 2280;

  const entries = Array.from(execDayMap.entries())
    .map(([executive, uniqueDays]) => {
      const daysWithActivity = uniqueDays.size;
      if (daysWithActivity < 3) return null;

      const dayTalkMap = execDayTalkMap.get(executive)!;
      const dayAlertMap = execDayAlertMap.get(executive)!;
      const totalTalkMin = Array.from(dayTalkMap.values()).reduce((sum, min) => sum + min, 0);
      const totalAlertMin = Array.from(dayAlertMap.values()).reduce((sum, min) => sum + min, 0);
      const avgDailyTalkMin = Math.round(totalTalkMin / daysWithActivity);
      const avgDailyAlertMin = Math.round(totalAlertMin / daysWithActivity);
      const weeklyAvgTalkMin = avgDailyTalkMin * 5;
      const weeklyAvgAlertMin = avgDailyAlertMin * 5;
      const weeklyAhtPMin = weeklyAvgTalkMin + weeklyAvgAlertMin;

      return {
        executive,
        avgOccupancyPct: Math.min(100, Math.round((weeklyAhtPMin / WEEKLY_SHIFT_MINUTES) * 100)),
        weeklyTalkMinutes: weeklyAvgTalkMin,
        weeklyAlertMinutes: weeklyAvgAlertMin,
        weeklyAhtPMinutes: weeklyAhtPMin,
        weeklyFreeMinutes: Math.max(0, WEEKLY_SHIFT_MINUTES - weeklyAhtPMin),
        weeklyShiftMinutes: WEEKLY_SHIFT_MINUTES,
        daysWithCalls: daysWithActivity,
        occupancyAlertFlag: Math.round((weeklyAhtPMin / WEEKLY_SHIFT_MINUTES) * 100) >= 85,
      };
    })
    .filter(e => e !== null) as ExecutiveOccupancyEntry[];

  entries.sort((a, b) => b.avgOccupancyPct - a.avgOccupancyPct);

  return { entries };
}

export interface AgentAuditFlag {
  agentId: string;
  agentName: string;
  flagType: 'ghost_connection' | 'overtime_no_calls' | 'unusual_hours';
  severity: 'warning' | 'critical';
  message: string;
  excessMinutes?: number;
}

export function calculateAgentAuditFlags(records: AgentStatusRecord[]): AgentAuditFlag[] {
  if (records.length === 0) return [];

  const agentMap = new Map<string, AgentStatusRecord[]>();
  for (const record of records) {
    const key = record.agent_id;
    if (!agentMap.has(key)) agentMap.set(key, []);
    agentMap.get(key)!.push(record);
  }

  const allFlags: AgentAuditFlag[] = [];

  for (const [agentId, agentRecords] of agentMap.entries()) {
    const agentName = agentRecords[0]?.agent_name || agentId;
    const totalConnectedSeconds = agentRecords.reduce((sum, r) => sum + r.connected_seconds, 0);

    if (totalConnectedSeconds === 0) continue;

    const dateRanges = agentRecords
      .filter(r => r.date_range_start && r.date_range_end)
      .map(r => ({
        start: r.date_range_start!,
        end: r.date_range_end!,
      }));

    if (dateRanges.length === 0) continue;

    const dateStart = dateRanges.map(d => d.start).sort()[0];
    const dateEnd = dateRanges.map(d => d.end).sort().reverse()[0];

    const totalCallSeconds = agentRecords.reduce((sum, r) => sum + r.in_queue_seconds, 0);

    const flags = generateAuditFlags(agentId, agentName, {
      dateStart,
      dateEnd,
      totalConnectedSeconds,
      totalCallSeconds,
    });

    allFlags.push(...flags);
  }

  return allFlags;
}
