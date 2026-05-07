import { useMemo, useState, useEffect } from 'react';
import type { CallRecord, AgentConnectivityHourly, AgentStatusRecord } from '../lib/supabase';
import { supabase } from '../lib/supabase';
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
  connectivityData: AgentConnectivityHourly[];
  agentStatusRecords: AgentStatusRecord[];
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
  agentStatusRecords: AgentStatusRecord[]
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

  // ----- Step 3: Connectivity filtered to records' date range -----
  const recordDates = filteredRecords.map((r) => r.call_date).filter(Boolean) as string[];
  const dateMin = recordDates.length ? recordDates.reduce((a, b) => (a < b ? a : b)) : '';
  const dateMax = recordDates.length ? recordDates.reduce((a, b) => (a > b ? a : b)) : '';
  const filteredConnectivity = dateMin
    ? connectivity.filter((c) => c.date && c.date >= dateMin && c.date <= dateMax)
    : connectivity;

  // keyConnectivity: only key agents, date-filtered
  const keyConnectivity = keyAgentNames.size > 0
    ? filteredConnectivity.filter((c) => c.agent_name && keyAgentNames.has(c.agent_name))
    : filteredConnectivity;

  // Attended calls only
  const attendedRecords = filteredRecords.filter((r) => r.attended && r.executive && r.executive !== 'SIN ATENDER');
  // Key agent attended records (for KPI numerators)
  const keyAttendedRecords = keyAgentNames.size > 0
    ? attendedRecords.filter((r) => r.executive && keyAgentNames.has(r.executive))
    : attendedRecords;

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
  };

  // ----- Gantt: Build agent periods from hourly connectivity -----
  type AgentHourMap = Map<string, Map<string, Map<number, { status: string; seconds: number }>>>;
  const agentDateHourMap: AgentHourMap = new Map();

  for (const c of filteredConnectivity) {
    if (!c.agent_name) continue;
    if (!agentDateHourMap.has(c.agent_name)) agentDateHourMap.set(c.agent_name, new Map());
    const dateMap = agentDateHourMap.get(c.agent_name)!;
    const dateKey = c.date || 'unknown';
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
    const hourMap = dateMap.get(dateKey)!;
    const existing = hourMap.get(c.hour);
    if (!existing || c.seconds_in_bucket > existing.seconds) {
      hourMap.set(c.hour, { status: c.status, seconds: c.seconds_in_bucket });
    }
  }

  const agentHourCallMap = new Map<string, Set<number>>();
  for (const r of attendedRecords) {
    if (!r.executive || r.call_hour == null) continue;
    if (!agentHourCallMap.has(r.executive)) agentHourCallMap.set(r.executive, new Set());
    agentHourCallMap.get(r.executive)!.add(r.call_hour);
  }

  const ganttData: AgentGanttData[] = [];
  for (const [agentName, dateMap] of agentDateHourMap.entries()) {
    const sortedDates = Array.from(dateMap.keys()).sort().reverse();
    const latestDate = sortedDates[0];
    if (!latestDate) continue;
    const hourMap = dateMap.get(latestDate)!;
    const productiveHours = agentHourCallMap.get(agentName) || new Set();

    const periods = Array.from(hourMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, { status }]) => {
        const ganttStatus = productiveHours.has(hour) ? 'productivo' : mapConnectivityStatus(status);
        return {
          startHour: hour,
          startMinute: 0,
          endHour: hour + 1,
          endMinute: 0,
          status: ganttStatus as 'productivo' | 'ocioso' | 'pausa' | 'no_responde',
        };
      });

    if (periods.length > 0) {
      ganttData.push({ agentName, periods });
    }
  }

  const displayedGantt = ganttData.slice(0, 12);

  // ----- Demand Curve: inbound calls per hour -----
  const callsByHour = new Map<number, number>();
  for (const r of filteredRecords) {
    if (r.call_hour == null) continue;
    callsByHour.set(r.call_hour, (callsByHour.get(r.call_hour) || 0) + 1);
  }
  const demandData: DemandPoint[] = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + i;
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      inboundCalls: callsByHour.get(hour) || 0,
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
  };
}

export function OccupationDashboard({ records, allRecords, connectivityData, agentStatusRecords }: Props) {

  const [connectivity, setConnectivity] = useState<AgentConnectivityHourly[]>(connectivityData || []);
  const [loading, setLoading] = useState(false);
  const [connectivityError, setConnectivityError] = useState<string | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  // Derive date bounds from the filtered records (already date-filtered by global FilterBar)
  const dateMin = useMemo(() => {
    const dates = records.map(r => r.call_date).filter(Boolean) as string[];
    return dates.length ? dates.reduce((a, b) => (a < b ? a : b)).slice(0, 10) : '';
  }, [records]);

  const dateMax = useMemo(() => {
    const dates = records.map(r => r.call_date).filter(Boolean) as string[];
    return dates.length ? dates.reduce((a, b) => (a > b ? a : b)).slice(0, 10) : '';
  }, [records]);

  useEffect(() => {
    if (!connectivityData || connectivityData.length === 0) {
      setLoading(true);
      setConnectivityError(null);
      let query = supabase.from('agent_connectivity_hourly').select('*');
      if (dateMin) query = query.gte('date', dateMin);
      if (dateMax) query = query.lte('date', dateMax);
      query
        .limit(50000)
        .then(({ data, error }) => {
          if (error) {
            console.error('[connectivity] Supabase error:', error);
            setConnectivityError(error.message);
            setConnectivity([]);
          } else {
            setConnectivity(data || []);
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[connectivity] Network error:', msg);
          setConnectivityError(msg);
          setConnectivity([]);
        })
        .finally(() => setLoading(false));
    }
  }, [connectivityData, dateMin, dateMax]);

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
  } = useMemo(
    () => calculateOccupancyMetrics(records, allRecords, connectivity, agentStatusRecords),
    [records, allRecords, connectivity, agentStatusRecords]
  );

  const hasData = records.length > 0 || connectivity.length > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BarChart3}
        title="Ocupación de Agentes"
        description="Panel completo de ocupación, conectividad y auditoría forense"
      />

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
            connectivityData={filteredConnectivity}
            granularity={trendGranularity}
            onGranularityChange={setTrendGranularity}
          />
          <CascadeAgentChart data={cascadeStats} depthData={cascadeDepth} />
          <AgentGanttChart agents={ganttData} demandData={demandData} />
          <AgentAvailabilityChart data={availabilityData} />
          <AgentPerformanceMatrix data={performanceData} />
          <AgentAuditTable rows={auditData} cascadeStats={cascadeStats} />
        </>
      )}
    </div>
  );
}
