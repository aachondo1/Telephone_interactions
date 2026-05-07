import { useMemo, useState, useEffect } from 'react';
import type { CallRecord, AgentStatusRecord } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { SectionHeader } from './SectionHeader';
import { BarChart3 } from 'lucide-react';
import { OccupationKPICards, type OccupationKPIData } from './OccupationKPICards';
import { AgentGanttChart, type AgentGanttData, type DemandPoint } from './AgentGanttChart';
import { AgentPerformanceMatrix, type PerformancePoint } from './AgentPerformanceMatrix';
import { AgentAuditTable, type AuditTableRow } from './AgentAuditTable';

type Props = {
  records: CallRecord[];
  agentStatusRecords: AgentStatusRecord[];
  allRecords?: CallRecord[];
  allAgentStatus?: AgentStatusRecord[];
  dateRange?: { start: string; end: string };
};

function formatHHMM(totalSeconds: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes };
}

function getDateRangeFromRecords(records: CallRecord[]): { minDate: string | null; maxDate: string | null } {
  const dates = records.map(r => r.call_date).filter((d): d is string => d !== null);
  if (dates.length === 0) return { minDate: null, maxDate: null };
  const sorted = dates.sort();
  return { minDate: sorted[0], maxDate: sorted[sorted.length - 1] };
}

function formatDateSpan(start: string | null, end: string | null): string {
  if (!start && !end) return 'Sin datos de fecha';
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' });
  if (start && end && start === end) return `${fmt(start)}`;
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt(start || end || '');
}

function getPreviousPeriod(startDate: string | null, endDate: string | null): { start: string | null; end: string | null } {
  if (!startDate || !endDate) return { start: null, end: null };
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - duration + 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(prevStart), end: fmt(prevEnd) };
}

function calculateOccupancyMetrics(
  records: CallRecord[],
  agentStatus: AgentStatusRecord[],
  allRecords?: CallRecord[],
  allAgentStatus?: AgentStatusRecord[]
) {
  const attendedRecords = records.filter(
    (r) => r.attended && r.executive && r.executive !== 'SIN ATENDER'
  );

  // KPI 1: Ocupación Efectiva — (Talk + ACW) / Connected
  const totalTalkACWSeconds = attendedRecords.reduce(
    (sum, r) => sum + (r.duration_seconds || 0) + (r.acw_seconds || 0),
    0
  );
  const totalConnectedSeconds = agentStatus.reduce(
    (sum, a) => sum + (a.connected_seconds || 0),
    0
  );
  const effectiveOccupancy =
    totalConnectedSeconds > 0
      ? Math.min(100, Math.round((totalTalkACWSeconds / totalConnectedSeconds) * 100))
      : 0;

  // KPI 2: Shrinkage — Out-of-queue / Connected
  const totalOutOfQueueSeconds = agentStatus.reduce(
    (sum, a) => sum + (a.out_of_queue_seconds || 0),
    0
  );
  const shrinkagePercent =
    totalConnectedSeconds > 0
      ? Math.min(100, Math.round((totalOutOfQueueSeconds / totalConnectedSeconds) * 100))
      : 0;

  // KPI 3: Evasión — calls where agent didn't respond
  const evasionSeconds = records
    .filter((r) => r.users_not_respond && r.users_not_respond.trim() !== '')
    .reduce((sum, r) => sum + (r.alert_time_seconds || 0), 0);
  const evasionCalls = Math.floor(evasionSeconds / 600);
  const evasionTime = formatHHMM(evasionSeconds);

  // KPI 4: Inflación — out-of-queue time beyond 30% of connected (excess shrinkage)
  const ghostSeconds = Math.max(0, totalOutOfQueueSeconds - totalConnectedSeconds * 0.3);
  const ghostImpact =
    totalConnectedSeconds > 0
      ? Math.round((ghostSeconds / totalConnectedSeconds) * 100)
      : 0;
  const ghostTime = formatHHMM(ghostSeconds);

  // Calculate trends if we have full dataset
  let occupancyTrend = 0;
  let shrinkageTrend = 0;
  if (allRecords && allRecords.length > 0 && allAgentStatus && allAgentStatus.length > 0) {
    const currentPeriodDates = getDateRangeFromRecords(records);
    const { start: prevStart, end: prevEnd } = getPreviousPeriod(currentPeriodDates.minDate, currentPeriodDates.maxDate);

    if (prevStart && prevEnd) {
      const prevRecords = allRecords.filter(
        (r) => r.call_date && r.call_date >= prevStart && r.call_date <= prevEnd
      );
      const prevAttended = prevRecords.filter(
        (r) => r.attended && r.executive && r.executive !== 'SIN ATENDER'
      );
      const prevTalkACW = prevAttended.reduce((sum, r) => sum + (r.duration_seconds || 0) + (r.acw_seconds || 0), 0);
      const prevConnected = allAgentStatus.reduce((sum, a) => sum + (a.connected_seconds || 0), 0);
      const prevOccupancy = prevConnected > 0 ? Math.min(100, Math.round((prevTalkACW / prevConnected) * 100)) : 0;

      occupancyTrend = effectiveOccupancy - prevOccupancy;

      const prevOutOfQueue = allAgentStatus.reduce((sum, a) => sum + (a.out_of_queue_seconds || 0), 0);
      const prevShrinkage = prevConnected > 0 ? Math.min(100, Math.round((prevOutOfQueue / prevConnected) * 100)) : 0;
      shrinkageTrend = shrinkagePercent - prevShrinkage;
    }
  }

  const kpiData: OccupationKPIData = {
    effectiveOccupancy,
    occupancyTrend,
    shrinkagePercent,
    shrinkageTrend,
    evasionTime,
    evasionCalls,
    ghostHours: ghostTime,
    ghostImpact,
  };

  // Gantt: derive from call_records — mark hours when agent had calls as "productivo"
  const agentHourCalls = new Map<string, Set<number>>();
  for (const r of attendedRecords) {
    if (!r.executive || r.call_hour == null) continue;
    if (!agentHourCalls.has(r.executive)) agentHourCalls.set(r.executive, new Set());
    agentHourCalls.get(r.executive)!.add(r.call_hour);
  }

  const BUSINESS_HOURS = Array.from({ length: 10 }, (_, i) => 8 + i);
  const ganttData: AgentGanttData[] = Array.from(agentHourCalls.entries())
    .slice(0, 12)
    .map(([agentName, productiveHours]) => ({
      agentName,
      periods: BUSINESS_HOURS.map((hour) => ({
        startHour: hour,
        startMinute: 0,
        endHour: hour + 1,
        endMinute: 0,
        status: productiveHours.has(hour) ? ('productivo' as const) : ('ocioso' as const),
      })),
    }));

  // Demand curve: inbound calls per hour
  const callsByHour = new Map<number, number>();
  for (const r of records) {
    if (r.call_hour == null) continue;
    callsByHour.set(r.call_hour, (callsByHour.get(r.call_hour) || 0) + 1);
  }
  const demandData: DemandPoint[] = BUSINESS_HOURS.map((hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    inboundCalls: callsByHour.get(hour) || 0,
  }));

  // Performance Matrix: agent_status_records for hours, call_records for talk time
  const agentTalkSeconds = new Map<string, number>();
  for (const r of attendedRecords) {
    if (!r.executive) continue;
    agentTalkSeconds.set(
      r.executive,
      (agentTalkSeconds.get(r.executive) || 0) + (r.duration_seconds || 0) + (r.acw_seconds || 0)
    );
  }

  const avgConnHours =
    agentStatus.length > 0
      ? agentStatus.reduce((s, a) => s + a.connected_seconds, 0) / agentStatus.length / 3600
      : 0;
  const avgOcc =
    agentStatus.length > 0
      ? agentStatus.reduce((s, a) => {
          const talk = agentTalkSeconds.get(a.agent_name) || 0;
          return s + (a.connected_seconds > 0 ? (talk / a.connected_seconds) * 100 : 0);
        }, 0) / agentStatus.length
      : 0;

  const performanceData: PerformancePoint[] = agentStatus.map((a) => {
    const talk = agentTalkSeconds.get(a.agent_name) || 0;
    const occ =
      a.connected_seconds > 0
        ? Math.min(100, Math.round((talk / a.connected_seconds) * 100))
        : 0;
    const hours = Math.round((a.connected_seconds / 3600) * 10) / 10;
    let quadrant: 'heroes' | 'efficient' | 'inflators' | 'underperformers' = 'efficient';
    if (occ >= avgOcc && hours >= avgConnHours) quadrant = 'heroes';
    else if (occ < avgOcc && hours >= avgConnHours) quadrant = 'inflators';
    else if (occ < avgOcc && hours < avgConnHours) quadrant = 'underperformers';
    return { name: a.agent_name, occupancy: occ, activeHours: hours, quadrant };
  });

  // Audit Table
  const auditData: AuditTableRow[] = agentStatus.map((a) => {
    const validatedTotalMinutes = Math.floor(a.connected_seconds / 60);
    const agentShrinkage =
      a.connected_seconds > 0
        ? Math.min(100, Math.round((a.out_of_queue_seconds / a.connected_seconds) * 100))
        : 0;
    const agentEvasionSec = records
      .filter((r) => r.users_not_respond && r.users_not_respond.includes(a.agent_name))
      .reduce((sum, r) => sum + (r.alert_time_seconds || 0), 0);
    const evasion = formatHHMM(agentEvasionSec);
    const ghostSec = Math.max(0, a.out_of_queue_seconds - a.connected_seconds * 0.3);
    const ghost = formatHHMM(ghostSec);
    const requiresReview = ghost.hours * 60 + ghost.minutes > 30 || agentShrinkage > 20;
    return {
      agent: a.agent_name,
      validatedTurnHours: Math.floor(validatedTotalMinutes / 60),
      validatedTurnMinutes: validatedTotalMinutes % 60,
      shrinkagePercent: agentShrinkage,
      evasionMinutes: evasion.hours * 60 + evasion.minutes,
      evasionSeconds: 0,
      ghostMinutes: ghost.hours * 60 + ghost.minutes,
      ghostSeconds: 0,
      requiresReview,
    };
  });

  return { kpiData, ganttData, demandData, performanceData, auditData };
}

export function OccupationDashboard({ records, agentStatusRecords, allRecords, allAgentStatus }: Props) {
  const [agentStatus, setAgentStatus] = useState<AgentStatusRecord[]>(agentStatusRecords || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentStatusRecords || agentStatusRecords.length === 0) {
      setLoading(true);
      supabase
        .from('agent_status_records')
        .select('*')
        .then(({ data, error }) => {
          if (error) {
            console.error('Error loading agent status records:', error);
            setAgentStatus([]);
          } else {
            setAgentStatus(data || []);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch agent status records:', err);
          setAgentStatus([]);
        })
        .finally(() => setLoading(false));
    } else {
      setAgentStatus(agentStatusRecords);
    }
  }, [agentStatusRecords]);

  const { kpiData, ganttData, demandData, performanceData, auditData } = useMemo(
    () => calculateOccupancyMetrics(records, agentStatus),
    [records, agentStatus]
  );

  const hasData = records.length > 0 || agentStatus.length > 0;
  const { minDate, maxDate } = getDateRangeFromRecords(records);
  const dateSpan = formatDateSpan(minDate, maxDate);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BarChart3}
        title="Ocupación de Agentes"
        description={`Panel completo de ocupación, conectividad y auditoría forense — Período: ${dateSpan}`}
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
