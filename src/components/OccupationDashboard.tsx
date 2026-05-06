import { useMemo, useState, useEffect } from 'react';
import type { CallRecord, AgentConnectivityHourly } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { SectionHeader } from './SectionHeader';
import { BarChart3 } from 'lucide-react';
import {
  OccupationFilterPanel,
  type OccupationFilters,
} from './OccupationFilterPanel';
import { OccupationKPICards, type OccupationKPIData } from './OccupationKPICards';
import { AgentGanttChart, type AgentGanttData, type DemandPoint } from './AgentGanttChart';
import { AgentPerformanceMatrix, type PerformancePoint } from './AgentPerformanceMatrix';
import { AgentAuditTable, type AuditTableRow } from './AgentAuditTable';

type Props = {
  records: CallRecord[];
  connectivityData: AgentConnectivityHourly[];
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
  connectivity: AgentConnectivityHourly[],
  filters: OccupationFilters
) {
  const uniqueQueues = Array.from(new Set(records.map((r) => r.queue).filter(Boolean)));

  // Filter records by selected queue
  const filteredRecords = filters.group
    ? records.filter((r) => r.queue === filters.group)
    : records;

  // Attended calls only
  const attendedRecords = filteredRecords.filter((r) => r.attended && r.executive && r.executive !== 'SIN ATENDER');

  // ----- KPI 1: Ocupación Efectiva -----
  // (Conversación + ACW) / Tiempo total disponible en conectividad
  const totalTalkACWSeconds = attendedRecords.reduce(
    (sum, r) => sum + (r.duration_seconds || 0) + (r.acw_seconds || 0),
    0
  );
  const totalConnectedSeconds = connectivity.reduce(
    (sum, c) => sum + (c.seconds_in_bucket || 0),
    0
  );
  const effectiveOccupancy =
    totalConnectedSeconds > 0
      ? Math.min(100, Math.round((totalTalkACWSeconds / totalConnectedSeconds) * 100))
      : 0;

  // ----- KPI 2: Shrinkage -----
  // Time NOT in queue/available vs total connected
  const pauseSeconds = connectivity
    .filter((c) => {
      const s = (c.status || '').toLowerCase();
      return (
        !s.includes('cola') &&
        !s.includes('disponible') &&
        !s.includes('queue') &&
        !s.includes('available')
      );
    })
    .reduce((sum, c) => sum + (c.seconds_in_bucket || 0), 0);
  const shrinkagePercent =
    totalConnectedSeconds > 0
      ? Math.min(100, Math.round((pauseSeconds / totalConnectedSeconds) * 100))
      : 0;

  // ----- KPI 3: Evasión ('No Responde') -----
  // Agentes que aparecen en users_not_respond y su alert_time_seconds
  const evasionSeconds = filteredRecords
    .filter((r) => r.users_not_respond && r.users_not_respond.trim() !== '')
    .reduce((sum, r) => sum + (r.alert_time_seconds || 0), 0);
  const AHT_SECONDS = 600; // 10 min default AHT
  const evasionCalls = Math.floor(evasionSeconds / AHT_SECONDS);
  const evasionTime = formatHHMM(evasionSeconds);

  // ----- KPI 4: Horas Fantasma -----
  // Connected seconds outside business hours (before 08:30 or after 18:00)
  const ghostSeconds = connectivity
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
  // Group by agent_name, then by date, then by hour → determine dominant status per hour
  type AgentHourMap = Map<string, Map<string, Map<number, { status: string; seconds: number }>>>;
  const agentDateHourMap: AgentHourMap = new Map();

  for (const c of connectivity) {
    if (!c.agent_name) continue;
    if (!agentDateHourMap.has(c.agent_name)) agentDateHourMap.set(c.agent_name, new Map());
    const dateMap = agentDateHourMap.get(c.agent_name)!;
    const dateKey = c.date || 'unknown';
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
    const hourMap = dateMap.get(dateKey)!;
    // Keep the status with the most seconds for that hour
    const existing = hourMap.get(c.hour);
    if (!existing || c.seconds_in_bucket > existing.seconds) {
      hourMap.set(c.hour, { status: c.status, seconds: c.seconds_in_bucket });
    }
  }

  // Build call time lookup per agent per hour (to mark productive hours)
  const agentHourCallMap = new Map<string, Set<number>>();
  for (const r of attendedRecords) {
    if (!r.executive || r.call_hour == null) continue;
    if (!agentHourCallMap.has(r.executive)) agentHourCallMap.set(r.executive, new Set());
    agentHourCallMap.get(r.executive)!.add(r.call_hour);
  }

  // Take most recent date per agent for Gantt display
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

  // Show max 12 agents in Gantt
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
  // Per-agent occupancy and connected hours
  const agentConnectedSeconds = new Map<string, number>();
  const agentTalkSeconds = new Map<string, number>();

  for (const c of connectivity) {
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

      const pauseSec = connectivity
        .filter((c) => c.agent_name === agent && (c.hour < 8 || c.hour >= 18))
        .reduce((sum, c) => sum + (c.seconds_in_bucket || 0), 0);
      const agentShrinkage =
        connSec > 0 ? Math.min(100, Math.round((pauseSec / connSec) * 100)) : 0;

      const agentEvasionSec = filteredRecords
        .filter((r) => r.users_not_respond && r.users_not_respond.includes(agent))
        .reduce((sum, r) => sum + (r.alert_time_seconds || 0), 0);
      const evasion = formatHHMM(agentEvasionSec);

      const agentGhostSec = connectivity
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

  return {
    kpiData,
    ganttData: displayedGantt,
    demandData,
    performanceData,
    auditData,
    uniqueQueues,
  };
}

export function OccupationDashboard({ records, connectivityData }: Props) {
  const [filters, setFilters] = useState<OccupationFilters>({
    dateRange: 'thisWeek',
    group: '',
  });

  const [connectivity, setConnectivity] = useState<AgentConnectivityHourly[]>(connectivityData || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectivityData || connectivityData.length === 0) {
      setLoading(true);
      supabase
        .from('agent_connectivity_hourly')
        .select('*')
        .limit(5000)
        .then(({ data }) => {
          setConnectivity(data || []);
        })
        .catch(() => setConnectivity([]))
        .finally(() => setLoading(false));
    }
  }, [connectivityData]);

  const {
    kpiData,
    ganttData,
    demandData,
    performanceData,
    auditData,
    uniqueQueues,
  } = useMemo(
    () => calculateOccupancyMetrics(records, connectivity, filters),
    [records, connectivity, filters]
  );

  const hasData = records.length > 0 || connectivity.length > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BarChart3}
        title="Ocupación de Agentes"
        description="Panel completo de ocupación, conectividad y auditoría forense"
      />

      <OccupationFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        availableGroups={uniqueQueues}
      />

      {loading && (
        <div className="bg-sky-50 border border-sky-100 rounded-lg px-6 py-4 text-sm text-sky-700">
          Cargando datos de conectividad…
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
          <AgentGanttChart agents={ganttData} demandData={demandData} />
          <AgentPerformanceMatrix data={performanceData} />
          <AgentAuditTable rows={auditData} />
        </>
      )}
    </div>
  );
}
