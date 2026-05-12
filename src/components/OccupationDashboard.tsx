import { useMemo, useState, useEffect } from 'react';
import type { CallRecord, AgentConnectivityHourly, AgentStatusRecord } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import type { FilterState } from './FilterBar';
import { getEffectiveDateRange } from './FilterBar';
import { identifyChronicOffenders } from '../lib/kpi/chronic-offenders';
import { SectionHeader } from './SectionHeader';
import { BarChart3 } from 'lucide-react';
import { OccupationKPICards, type OccupationKPIData } from './OccupationKPICards';
import { AgentGanttChart, type AgentGanttData, type DemandPoint } from './AgentGanttChart';
import { AgentPerformanceMatrix, type PerformancePoint } from './AgentPerformanceMatrix';
import { AgentAuditTable, type AuditTableRow } from './AgentAuditTable';
import { CascadeAgentChart } from './CascadeAgentChart';
import { AgentAvailabilityChart } from './AgentAvailabilityChart';
import { AgentTimeDistributionChart } from './AgentTimeDistributionChart';
import { AgentTimeTrendChart } from './AgentTimeTrendChart';
import { ProductivityMatrix, type ProductivityPoint } from './ProductivityMatrix';
import { countWorkingDaysInRange, getUnifiedQueueBase, getUnifiedStates } from '../lib/kpi/shared';

export type AgentCascadeStat = {
  agent: string;
  timesAlerted: number;
  timesAnswered: number;
  timesEvaded: number;
  responseRate: number;
};

export type CascadeDepthPoint = {
  label: string;
  value: number;
  percent: number;
  color: string;
};

export type AgentAvailabilityEntry = {
  agentName: string;
  inQueueSeconds: number;
  outQueueSeconds: number;
  disconnectedSeconds: number;
  totalExpectedSeconds: number;
  workingDays: number;
};

type Props = {
  records: CallRecord[];
  allRecords: CallRecord[];
  agentStatusRecords: AgentStatusRecord[];
  connectivityRefreshKey?: number;
  executiveFilter?: string[];
  filters: FilterState;
};

// Maps Genesys Cloud status strings to Gantt status categories
function mapConnectivityStatus(
  status: string
): 'productivo' | 'ocioso' | 'pausa' | 'no_responde' {
  const s = status.toLowerCase();
  if (s.includes('cola') || s.includes('queue') || s.includes('disponible') || s.includes('available')) {
    return 'ocioso';
  }
  if (s.includes('pausa') || s.includes('break') || s.includes('comida') || s.includes('meal') || s.includes('reunión') || s.includes('meeting') || s.includes('capacitación') || s.includes('training')) {
    return 'pausa';
  }
  if (s.includes('no responde') || s.includes('not responding') || s.includes('away') || s.includes('ausente')) {
    return 'no_responde';
  }
  return 'ocioso';
}

function formatHHMM(totalSeconds: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes };
}

function calculateOccupancyMetrics(
  records: CallRecord[],
  allRecords: CallRecord[],
  connectivity: AgentConnectivityHourly[],
  agentStatusRecords: AgentStatusRecord[],
  rangeStart: string | null,
  rangeEnd: string | null
) {
  // records are already filtered by the global FilterBar
  const filteredRecords = records;

  // ----- Step 1: Cascade stats per agent (inbound only) — moved to TOP for key-agent derivation -----
  const MIN_ALERTS = 5;
  const inboundRecords = filteredRecords.filter((r) =>
    ['inbound', 'entrante'].includes((r.call_direction || '').toLowerCase())
  );
  const agentCascadeMap = new Map<string, { alerted: number; answered: number; evaded: number }>();

  for (const r of inboundRecords) {
    const alertedList = r.alerted_users
      ? r.alerted_users.split(/[,;]/).map((u) => u.trim()).filter(Boolean)
      : [];
    for (const agent of alertedList) {
      if (!agentCascadeMap.has(agent)) agentCascadeMap.set(agent, { alerted: 0, answered: 0, evaded: 0 });
      agentCascadeMap.get(agent)!.alerted++;
    }
    if (r.attended && r.executive && r.executive !== 'SIN ATENDER') {
      if (!agentCascadeMap.has(r.executive)) agentCascadeMap.set(r.executive, { alerted: 0, answered: 0, evaded: 0 });
      agentCascadeMap.get(r.executive)!.answered++;
    }
    if (r.users_not_respond) {
      for (const agent of r.users_not_respond.split(/[,;]/).map((u) => u.trim()).filter(Boolean)) {
        if (!agentCascadeMap.has(agent)) agentCascadeMap.set(agent, { alerted: 0, answered: 0, evaded: 0 });
        agentCascadeMap.get(agent)!.evaded++;
      }
    }
  }

  // ----- Step 2: Identify chronic offenders (agentes con >= 50 alarmas perdidas en últimos 30 días) -----
  const chronicOffendersNorm = identifyChronicOffenders(allRecords).map(name => name.toLowerCase().trim());
  const keyAgentNames = new Set<string>(chronicOffendersNorm);

  // ----- Step 3: Connectivity is already filtered by useEffect via dateMin/dateMax -----
  const filteredConnectivity = connectivity;

  const isWithinCentralBusinessHours = (dateStr: string, hour: number) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    if (dow >= 1 && dow <= 4) return hour >= 8 && hour < 18;
    if (dow === 5) return hour >= 8 && hour < 14;
    return false;
  };

  const connectivityBusinessHours = filteredConnectivity.filter(
    (c) => c.date && isWithinCentralBusinessHours(c.date, c.hour)
  );

  // keyConnectivity: only key agents, date-filtered
  const keyConnectivity = keyAgentNames.size > 0
    ? filteredConnectivity.filter((c) => c.agent_name && keyAgentNames.has(c.agent_name))
    : filteredConnectivity;

  // Attended calls only
  const attendedRecords = filteredRecords.filter((r) => r.attended && r.executive && r.executive !== 'SIN ATENDER');

  // ----- KPI 1 & 2: Ocupación Efectiva y Shrinkage -----
  // Denominador: connected_seconds de agentStatusRecords, filtrado a agentes clave (>50 alarmas perdidas en últimos 30d).
  // keyAgentNames ya contiene nombres normalizados (lowercase) de la cohorte.

  const keyStatusRecords = agentStatusRecords.filter(
    r => keyAgentNames.has((r.agent_name || '').toLowerCase().trim())
  );

  // Detectar fallback: si no hay coincidencias de agentStatusRecords, usar todos
  const hadFallback = keyStatusRecords.length === 0;
  const statusSource = hadFallback ? agentStatusRecords : keyStatusRecords;

  const totalConnectedSeconds = statusSource.reduce((s, r) => s + (r.connected_seconds || 0), 0);
  const totalOutQueueSeconds = statusSource.reduce((s, r) => s + (r.out_of_queue_seconds || 0), 0);

  // Numerador de ocupación: talk + ACW, condicional según fallback
  let totalTalkACWSeconds = 0;
  if (hadFallback) {
    // Si hay fallback: sumar tiempo de TODOS los attended records
    totalTalkACWSeconds = attendedRecords.reduce(
      (sum, r) => sum + (r.duration_seconds || 0) + (r.acw_seconds || 0),
      0
    );
  } else {
    // Si no hay fallback: sumar solo records cuyo executive está en la cohorte
    totalTalkACWSeconds = attendedRecords
      .filter(r => r.executive && keyAgentNames.has((r.executive || '').toLowerCase().trim()))
      .reduce((sum, r) => sum + (r.duration_seconds || 0) + (r.acw_seconds || 0), 0);
  }

  const effectiveOccupancy =
    totalConnectedSeconds > 0
      ? Math.min(100, Math.round((totalTalkACWSeconds / totalConnectedSeconds) * 100))
      : 0;

  // Shrinkage = tiempo fuera de cola / tiempo conectado total
  const shrinkagePercent =
    totalConnectedSeconds > 0
      ? Math.min(100, Math.round((totalOutQueueSeconds / totalConnectedSeconds) * 100))
      : 0;

  // ----- KPI 3: Evasión ('No Responde') — inbound only -----
  const evasionSeconds = inboundRecords
    .filter((r) => r.users_not_respond && r.users_not_respond.trim() !== '')
    .reduce((sum, r) => sum + (r.alert_time_seconds || 0), 0);
  const AHT_SECONDS = 600; // 10 min default AHT
  const evasionCalls = Math.floor(evasionSeconds / AHT_SECONDS);
  const evasionTime = formatHHMM(evasionSeconds);

  // ----- KPI 4: Horas Fantasma -----
  // Connected seconds outside business hours · solo agentes con ≥10 alertas inbound
  const ghostSeconds = keyConnectivity
    .filter((c) => c.hour < 8 || c.hour >= 18)
    .reduce((sum, c) => sum + (c.seconds_in_bucket || 0), 0);
  const ghostImpact =
    totalConnectedSeconds > 0
      ? Math.round((ghostSeconds / totalConnectedSeconds) * 100)
      : 0;
  const ghostTime = formatHHMM(ghostSeconds);

  const kpiData: OccupationKPIData = {
    effectiveOccupancy,
    occupancyTrend: 0,
    shrinkagePercent,
    shrinkageTrend: 0,
    evasionTime,
    evasionCalls,
    ghostHours: ghostTime,
    ghostImpact,
    cascadeResponseRate: 0, // overwritten in enrichedKpiData below
    totalAlerted: 0,        // overwritten in enrichedKpiData below
  };

  // ----- Gantt: Build agent periods from hourly connectivity -----
  // New structure: agentName -> hour -> { totalSeconds, inQueueSeconds, dayCount, statuses }
  type HourData = {
    totalSeconds: number;
    inQueueSeconds: number;
    dayCount: number;
    statuses: Map<string, number>; // status -> seconds
  };
  type AgentHourMap = Map<string, Map<number, HourData>>;
  const agentDateHourMap: AgentHourMap = new Map();
  const agentDateSet = new Map<string, Set<string>>(); // agentName -> Set<dates>

  for (const c of connectivityBusinessHours) {
    if (!c.agent_name) continue;
    if (!agentDateHourMap.has(c.agent_name)) agentDateHourMap.set(c.agent_name, new Map());
    const hourMap = agentDateHourMap.get(c.agent_name)!;
    if (!hourMap.has(c.hour)) {
      hourMap.set(c.hour, {
        totalSeconds: 0,
        inQueueSeconds: 0,
        dayCount: 0,
        statuses: new Map(),
      });
    }
    const hourData = hourMap.get(c.hour)!;
    hourData.totalSeconds += c.seconds_in_bucket || 0;

    const s = (c.status || '').toLowerCase();
    const isInQueue = s.includes('cola') || s.includes('queue');
    if (isInQueue) hourData.inQueueSeconds += c.seconds_in_bucket || 0;

    const status = c.status || 'unknown';
    hourData.statuses.set(status, (hourData.statuses.get(status) || 0) + (c.seconds_in_bucket || 0));

    // Track distinct dates per agent
    if (!agentDateSet.has(c.agent_name)) agentDateSet.set(c.agent_name, new Set());
    if (c.date) agentDateSet.get(c.agent_name)!.add(c.date);
  }

  // Calculate dayCount for each agent+hour
  for (const [agentName, hourMap] of agentDateHourMap.entries()) {
    const uniqueDates = agentDateSet.get(agentName) || new Set();
    for (const hourData of hourMap.values()) {
      hourData.dayCount = uniqueDates.size;
    }
  }

  const agentHourCallMap = new Map<string, Set<number>>();
  for (const r of attendedRecords) {
    if (!r.executive || r.call_hour == null) continue;
    if (!agentHourCallMap.has(r.executive)) agentHourCallMap.set(r.executive, new Set());
    agentHourCallMap.get(r.executive)!.add(r.call_hour);
  }

  const ganttData: AgentGanttData[] = [];
  const hourlyQueuePercentSums = new Map<number, { sum: number; count: number }>();

  // Filtro > 10% en cola
  const validAgents = new Set<string>();
  const agentTotals = new Map<string, { connected: number; inQueue: number }>();
  for (const c of connectivityBusinessHours) {
    if (!c.agent_name) continue;
    if (!agentTotals.has(c.agent_name)) agentTotals.set(c.agent_name, { connected: 0, inQueue: 0 });
    const stats = agentTotals.get(c.agent_name)!;
    stats.connected += c.seconds_in_bucket || 0;
    const s = (c.status || '').toLowerCase();
    if (s.includes('cola') || s.includes('queue')) {
      stats.inQueue += c.seconds_in_bucket || 0;
    }
  }
  for (const [agentName, stats] of agentTotals.entries()) {
    if (stats.connected > 0 && (stats.inQueue / stats.connected) > 0.10) {
      validAgents.add(agentName);
    }
  }

  for (const [agentName, hourMap] of agentDateHourMap.entries()) {
    if (!validAgents.has(agentName)) continue;

    const periods = Array.from(hourMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, hourData]) => {
        let enColaSec = 0;
        let dispSec = 0;
        let otrosSec = 0;

        for (const [status, seconds] of hourData.statuses.entries()) {
          const s = status.toLowerCase();
          if (s.includes('cola') || s.includes('queue')) {
            enColaSec += seconds;
          } else if (s.includes('disponible') || s.includes('available')) {
            dispSec += seconds;
          } else {
            otrosSec += seconds;
          }
        }

        const total = enColaSec + dispSec + otrosSec;
        let enColaPercent = 0;
        let disponiblePercent = 0;
        let otrosPercent = 0;

        if (total > 0) {
          enColaPercent = Math.round((enColaSec / total) * 100);
          disponiblePercent = Math.round((dispSec / total) * 100);
          otrosPercent = 100 - enColaPercent - disponiblePercent; // Ensure it sums to 100
        }

        // Add to average calculation
        if (!hourlyQueuePercentSums.has(hour)) {
          hourlyQueuePercentSums.set(hour, { sum: 0, count: 0 });
        }
        const hourStats = hourlyQueuePercentSums.get(hour)!;
        hourStats.sum += enColaPercent;
        hourStats.count++;

        return {
          startHour: hour,
          startMinute: 0,
          endHour: hour + 1,
          endMinute: 0,
          enColaPercent,
          disponiblePercent,
          otrosPercent,
        };
      });

    if (periods.length > 0) {
      ganttData.push({ agentName, periods });
    }
  }

  // Calculate Average Row
  const averageRow = Array.from(hourlyQueuePercentSums.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, stats]) => {
      const avgEnCola = stats.count > 0 ? Math.round(stats.sum / stats.count) : 0;
      return {
        startHour: hour,
        startMinute: 0,
        endHour: hour + 1,
        endMinute: 0,
        enColaPercent: avgEnCola,
        disponiblePercent: 0, // Not displayed in average row
        otrosPercent: 0,
      };
    });

  const displayedGantt = ganttData.slice(0, 12);

  // ----- Demand Curve: inbound calls per hour (average by day) -----
  const isWithinBusinessHours = (dateStr: string, hour: number) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    if (dow >= 1 && dow <= 4) return hour >= 8 && hour < 18;
    if (dow === 5) return hour >= 8 && hour < 14;
    return false;
  };

  const datesInRecords = inboundRecords
    .map((r) => r.call_date)
    .filter((d): d is string => Boolean(d));

  const sortedDates = datesInRecords.length > 0 ? [...datesInRecords].sort() : null;
  const inferredRangeStart = sortedDates && sortedDates.length > 0 ? sortedDates[0] : null;
  const inferredRangeEnd =
    sortedDates && sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
  const demandRangeStart = rangeStart ?? inferredRangeStart;
  const demandRangeEnd = rangeEnd ?? inferredRangeEnd;

  const workingDayCounts =
    demandRangeStart && demandRangeEnd ? countWorkingDaysInRange(demandRangeStart, demandRangeEnd) : null;

  const denominatorForHour = (hour: number) => {
    if (!workingDayCounts) return 0;
    if (hour >= 8 && hour < 14) return workingDayCounts.mondayToThursday + workingDayCounts.fridays;
    if (hour >= 14 && hour < 18) return workingDayCounts.mondayToThursday;
    return 0;
  };

  const answeredByHour = new Map<number, number>();
  const abandonedByHour = new Map<number, number>();

  const queueBase = getUnifiedQueueBase(inboundRecords);
  const states = getUnifiedStates(queueBase);
  const realAbandons = [...states.notAssigned, ...states.assignedNoConversation];
  const realAnswered = states.conversationReal;

  const addHourlyCount = (map: Map<number, number>, r: CallRecord) => {
    if (r.call_hour == null || r.call_date == null) return;
    if (!isWithinBusinessHours(r.call_date, r.call_hour)) return;
    map.set(r.call_hour, (map.get(r.call_hour) || 0) + 1);
  };

  for (const r of realAnswered) addHourlyCount(answeredByHour, r);
  for (const r of realAbandons) addHourlyCount(abandonedByHour, r);

  const demandData: DemandPoint[] = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + i;
    const denom = denominatorForHour(hour);
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      inboundCalls: 0,
      answered: denom > 0 ? Math.round((answeredByHour.get(hour) || 0) / denom) : 0,
      abandoned: denom > 0 ? Math.round((abandonedByHour.get(hour) || 0) / denom) : 0,
    };
  });

  // ----- Performance Matrix -----
  const agentConnectedSeconds = new Map<string, number>();
  const agentTalkSeconds = new Map<string, number>();

  for (const c of filteredConnectivity) {
    if (!c.agent_name) continue;
    agentConnectedSeconds.set(
      c.agent_name,
      (agentConnectedSeconds.get(c.agent_name) || 0) + (c.seconds_in_bucket || 0)
    );
  }
  for (const r of attendedRecords) {
    if (!r.executive) continue;
    agentTalkSeconds.set(
      r.executive,
      (agentTalkSeconds.get(r.executive) || 0) + (r.duration_seconds || 0) + (r.acw_seconds || 0)
    );
  }

  const avgConnHours =
    agentConnectedSeconds.size > 0
      ? Array.from(agentConnectedSeconds.values()).reduce((s, v) => s + v, 0) /
        agentConnectedSeconds.size /
        3600
      : 0;
  const avgOcc =
    agentConnectedSeconds.size > 0
      ? Array.from(agentConnectedSeconds.entries()).reduce((s, [name, conn]) => {
          const talk = agentTalkSeconds.get(name) || 0;
          return s + (conn > 0 ? (talk / conn) * 100 : 0);
        }, 0) / agentConnectedSeconds.size
      : 0;

  const performanceData: PerformancePoint[] = Array.from(agentConnectedSeconds.entries()).map(
    ([name, connSec]) => {
      const talk = agentTalkSeconds.get(name) || 0;
      const occ = connSec > 0 ? Math.min(100, Math.round((talk / connSec) * 100)) : 0;
      const hours = Math.round((connSec / 3600) * 10) / 10;

      let quadrant: 'heroes' | 'efficient' | 'inflators' | 'underperformers' = 'efficient';
      if (occ >= avgOcc && hours >= avgConnHours) quadrant = 'heroes';
      else if (occ < avgOcc && hours >= avgConnHours) quadrant = 'inflators';
      else if (occ < avgOcc && hours < avgConnHours) quadrant = 'underperformers';

      return { name, occupancy: occ, activeHours: hours, quadrant };
    }
  );

  // ----- Audit Table -----
  const auditData: AuditTableRow[] = Array.from(agentConnectedSeconds.entries()).map(
    ([agent, connSec]) => {
      const validatedTotalMinutes = Math.floor(connSec / 60);
      const validatedTurnHours = Math.floor(validatedTotalMinutes / 60);
      const validatedTurnMinutes = validatedTotalMinutes % 60;

      const pauseSec = filteredConnectivity
        .filter((c) => c.agent_name === agent && (c.hour < 8 || c.hour >= 18))
        .reduce((sum, c) => sum + (c.seconds_in_bucket || 0), 0);
      const agentShrinkage =
        connSec > 0 ? Math.min(100, Math.round((pauseSec / connSec) * 100)) : 0;

      const agentEvasionSec = inboundRecords
        .filter((r) => r.users_not_respond && r.users_not_respond.includes(agent))
        .reduce((sum, r) => sum + (r.alert_time_seconds || 0), 0);
      const evasion = formatHHMM(agentEvasionSec);

      const agentGhostSec = filteredConnectivity
        .filter((c) => c.agent_name === agent && (c.hour < 8 || c.hour >= 18))
        .reduce((sum, c) => sum + (c.seconds_in_bucket || 0), 0);
      const ghost = formatHHMM(agentGhostSec);

      const requiresReview = ghost.hours * 60 + ghost.minutes > 30 || agentShrinkage > 20;

      return {
        agent,
        validatedTurnHours,
        validatedTurnMinutes,
        shrinkagePercent: agentShrinkage,
        evasionMinutes: evasion.minutes,
        evasionSeconds: 0,
        ghostMinutes: ghost.hours * 60 + ghost.minutes,
        ghostSeconds: 0,
        requiresReview,
      };
    }
  );

  // ----- Cascade depth: only calls that reached cascade (alert_segments >= 1, inbound) -----
  let hop1 = 0, hop2 = 0, hop3plus = 0;
  for (const r of inboundRecords) {
    const segs = r.alert_segments ?? 0;
    if (segs < 1) continue;
    if (segs === 1) hop1++;
    else if (segs === 2) hop2++;
    else hop3plus++;
  }
  const depthTotal = hop1 + hop2 + hop3plus;
  const pct = (n: number) => depthTotal > 0 ? Math.round((n / depthTotal) * 100) : 0;
  const cascadeDepth: CascadeDepthPoint[] = [
    { label: '1ra oferta',  value: hop1,     percent: pct(hop1),     color: '#00ABC8' },
    { label: '2da oferta',  value: hop2,     percent: pct(hop2),     color: '#5BCEE5' },
    { label: '3ra+ oferta', value: hop3plus, percent: pct(hop3plus), color: '#A8E4F0' },
  ];

  // ----- Cascade KPI -----
  const totalAlertedTeam = Array.from(agentCascadeMap.values()).reduce((s, v) => s + v.alerted, 0);
  const totalAnsweredTeam = Array.from(agentCascadeMap.values()).reduce((s, v) => s + v.answered, 0);
  const cascadeResponseRate = totalAlertedTeam > 0
    ? Math.round((totalAnsweredTeam / totalAlertedTeam) * 100)
    : 0;

  const cascadeStats: AgentCascadeStat[] = Array.from(agentCascadeMap.entries())
    .map(([agent, s]) => ({
      agent,
      timesAlerted: s.alerted,
      timesAnswered: s.answered,
      timesEvaded: s.evaded,
      responseRate: s.alerted > 0 ? Math.round((s.answered / s.alerted) * 100) : 0,
    }))
    .sort((a, b) => b.timesEvaded - a.timesEvaded);

  // ----- Availability map per agent (filteredConnectivity, agents with ≥MIN_ALERTS inbound alerts) -----
  const WORKING_SECONDS_MON_THU = 36000; // 10h (08:00–18:00)
  const WORKING_SECONDS_FRI = 21600;     // 6h  (08:00–14:00)
  const isFriday = (dateStr: string) => new Date(dateStr + 'T12:00:00').getDay() === 5;

  const agentDateConn = new Map<string, Map<string, { inQueue: number; outQueue: number }>>();
  for (const c of filteredConnectivity) {
    if (!c.agent_name || !c.date) continue;
    if (c.hour < 8 || c.hour >= 18) continue;
    if (isFriday(c.date) && c.hour >= 14) continue;

    if (!agentDateConn.has(c.agent_name)) agentDateConn.set(c.agent_name, new Map());
    const dateMap = agentDateConn.get(c.agent_name)!;
    if (!dateMap.has(c.date)) dateMap.set(c.date, { inQueue: 0, outQueue: 0 });
    const day = dateMap.get(c.date)!;

    const s = (c.status || '').toLowerCase();
    const isInQueue = s.includes('cola') || s.includes('queue') || s.includes('disponible') || s.includes('available');
    if (isInQueue) day.inQueue += c.seconds_in_bucket;
    else day.outQueue += c.seconds_in_bucket;
  }

  const availabilityData: AgentAvailabilityEntry[] = Array.from(agentDateConn.entries())
    .map(([agentName, dateMap]) => {
      let inQ = 0, outQ = 0, disconn = 0, expected = 0;
      for (const [date, stats] of dateMap.entries()) {
        const dayExpected = isFriday(date) ? WORKING_SECONDS_FRI : WORKING_SECONDS_MON_THU;
        const connected = stats.inQueue + stats.outQueue;
        inQ += stats.inQueue;
        outQ += stats.outQueue;
        disconn += Math.max(0, dayExpected - connected);
        expected += dayExpected;
      }
      return { agentName, inQueueSeconds: inQ, outQueueSeconds: outQ, disconnectedSeconds: disconn, totalExpectedSeconds: expected, workingDays: dateMap.size };
    })
    .filter((a) => (agentCascadeMap.get(a.agentName)?.alerted ?? 0) >= MIN_ALERTS);

  // ----- Merge cascade into auditData -----
  const enrichedAuditData: AuditTableRow[] = auditData.map((row) => {
    const cs = agentCascadeMap.get(row.agent) ?? { alerted: 0, answered: 0, evaded: 0 };
    return {
      ...row,
      timesAlerted: cs.alerted,
      timesAnswered: cs.answered,
      cascadeResponseRate: cs.alerted > 0 ? Math.round((cs.answered / cs.alerted) * 100) : 0,
    };
  });

  // Update kpiData with cascade rate
  const enrichedKpiData: OccupationKPIData = {
    ...kpiData,
    cascadeResponseRate,
    totalAlerted: totalAlertedTeam,
  };

  // ----- Productivity Matrix -----
  // Jornada_Teorica: Mon-Thu = 8h, Fri = 6h, for the full date range
  const jornadaTeóricaSeconds = (() => {
    if (!rangeStart || !rangeEnd) return 0;
    const { mondayToThursday, fridays } = countWorkingDaysInRange(rangeStart, rangeEnd);
    return mondayToThursday * 8 * 3600 + fridays * 6 * 3600;
  })();

  const agentProductivityMap = new Map<string, { connectedSeconds: number; workQueueSeconds: number }>();

  for (const c of connectivityBusinessHours) {
    if (!c.agent_name) continue;
    if (!agentProductivityMap.has(c.agent_name)) {
      agentProductivityMap.set(c.agent_name, { connectedSeconds: 0, workQueueSeconds: 0 });
    }
    const stats = agentProductivityMap.get(c.agent_name)!;
    stats.connectedSeconds += c.seconds_in_bucket || 0;

    const s = (c.status || '').toLowerCase();
    const isProductiveState =
      s.includes('on_queue') || s.includes('cola') || s.includes('queue') ||
      s.includes('interacting') || s.includes('interactuando') ||
      s.includes('communicating') || s.includes('comunicando');
    if (isProductiveState) {
      stats.workQueueSeconds += c.seconds_in_bucket || 0;
    }
  }

  const productivityData: ProductivityPoint[] = Array.from(agentProductivityMap.entries()).map(
    ([name, stats]) => {
      const connectedSeconds = stats.connectedSeconds;
      const disconnectedSeconds = jornadaTeóricaSeconds > 0
        ? Math.max(0, jornadaTeóricaSeconds - connectedSeconds)
        : 0;
      const connectionRatio = disconnectedSeconds > 0
        ? Math.round((connectedSeconds / disconnectedSeconds) * 100) / 100
        : 100;
      const workQueueHours = Math.round((stats.workQueueSeconds / 3600) * 100) / 100;

      return {
        name,
        connectionRatio,
        workQueueHours,
        connectedSeconds,
        disconnectedSeconds,
        workQueueSeconds: stats.workQueueSeconds,
      };
    }
  );

  return {
    kpiData: enrichedKpiData,
    ganttData: displayedGantt,
    demandData,
    performanceData,
    auditData: enrichedAuditData,
    cascadeStats,
    cascadeDepth,
    availabilityData,
    filteredConnectivity,
    averageRow,
    productivityData,
  };
}

export function OccupationDashboard({ records, allRecords, agentStatusRecords, connectivityRefreshKey, executiveFilter, filters }: Props) {

  const [connectivity, setConnectivity] = useState<AgentConnectivityHourly[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectivityError, setConnectivityError] = useState<string | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [totalConnectivityCount, setTotalConnectivityCount] = useState<number>(0);

  const { start: dateMin, end: dateMax } = useMemo(() => getEffectiveDateRange(filters), [filters]);

  // Fetch total count of connectivity records available
  useEffect(() => {
    supabase
      .from('agent_connectivity_hourly')
      .select('*', { count: 'exact', head: true })
      .then(
        ({ count }) => setTotalConnectivityCount(count || 0),
        () => setTotalConnectivityCount(0)
      );
  }, []);

  useEffect(() => {
    if (!dateMin || !dateMax) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setConnectivityError(null);

    // Fetch all records using pagination (Supabase has 1000 record limit per request)
    const fetchAllConnectivity = async () => {
      let allData: AgentConnectivityHourly[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('agent_connectivity_hourly')
          .select('*')
          .gte('date', dateMin)
          .lte('date', dateMax)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          setConnectivityError(error.message);
          setConnectivity([]);
          return;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          page++;
          if (data.length < pageSize) hasMore = false;
        }
      }

      setConnectivity(allData);
    };

    fetchAllConnectivity().finally(() => setLoading(false));
  }, [dateMin, dateMax, connectivityRefreshKey]);

  const {
    kpiData,
    ganttData,
    demandData,
    performanceData,
    auditData,
    cascadeStats,
    cascadeDepth,
    availabilityData,
    filteredConnectivity,
    averageRow,
    productivityData,
  } = useMemo(
    () => calculateOccupancyMetrics(records, allRecords, connectivity, agentStatusRecords, dateMin, dateMax),
    [records, allRecords, connectivity, agentStatusRecords, dateMin, dateMax]
  );

  // Apply executive filter to connectivity data for the trend chart
  const trendConnectivity = useMemo(() => {
    if (!executiveFilter || executiveFilter.length === 0) return filteredConnectivity;
    const names = new Set(executiveFilter.map(n => n.toLowerCase().trim()));
    return filteredConnectivity.filter(c => c.agent_name && names.has(c.agent_name.toLowerCase().trim()));
  }, [filteredConnectivity, executiveFilter]);

  const hasData = records.length > 0 || connectivity.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          icon={BarChart3}
          title="Ocupación de Agentes"
          description="Panel completo de ocupación, conectividad y auditoría forense"
        />
        <div className="text-sm text-slate-600">
          <div>📞 Llamadas: {records.length.toLocaleString()} registros</div>
          <div>📊 Conectividad: {connectivity.length.toLocaleString()} de {totalConnectivityCount.toLocaleString()} registros</div>
        </div>
      </div>

      {loading && (
        <div className="bg-sky-50 border border-sky-100 rounded-lg px-6 py-4 text-sm text-sky-700">
          Cargando datos de conectividad…
        </div>
      )}

      {connectivityError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-6 py-4 text-sm text-amber-700">
          Error al cargar conectividad: {connectivityError}
        </div>
      )}

      {!hasData && !loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <BarChart3 size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-slate-600">Sin datos disponibles</p>
          <p className="text-sm text-slate-400 mt-1">
            Carga un reporte de llamadas y conectividad de agentes para ver esta sección.
          </p>
        </div>
      ) : (
        <>
          <OccupationKPICards data={kpiData} />
          <AgentTimeDistributionChart agentStatusRecords={agentStatusRecords} />
          <AgentTimeTrendChart
            connectivityData={trendConnectivity}
            granularity={trendGranularity}
            onGranularityChange={setTrendGranularity}
          />
          <CascadeAgentChart data={cascadeStats} depthData={cascadeDepth} />
          <AgentGanttChart agents={ganttData} demandData={demandData} averageRow={averageRow} />
          <AgentAvailabilityChart data={availabilityData} />
          <AgentPerformanceMatrix data={performanceData} />
          <ProductivityMatrix data={productivityData} />
          <AgentAuditTable rows={auditData} cascadeStats={cascadeStats} />
        </>
      )}
    </div>
  );
}
