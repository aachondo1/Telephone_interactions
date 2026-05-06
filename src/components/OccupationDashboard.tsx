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

// Helper to calculate occupancy metrics from connectivity data
function calculateOccupancyMetrics(records: CallRecord[], connectivity: AgentConnectivityHourly[], filters: OccupationFilters) {
  // Get unique queues for filtering
  const uniqueQueues = Array.from(new Set(records.map((r) => r.queue).filter(Boolean)));

  // Filter connectivity data by queue if needed
  let filteredConnectivity = connectivity;
  if (filters.group) {
    filteredConnectivity = connectivity.filter((c) => {
      const record = records.find(
        (r) =>
          r.executive === c.agent_name &&
          (filters.group === '' || r.queue === filters.group)
      );
      return !!record;
    });
  }

  // Calculate KPI data
  const totalAgents = new Set(filteredConnectivity.map((c) => c.agent_name)).size;
  const effectiveOccupancy = Math.round(Math.random() * 30 + 60); // Placeholder
  const occupancyTrend = Math.round(Math.random() * 10 - 5);
  const shrinkagePercent = Math.round(Math.random() * 10 + 10);
  const evasionMinutes = Math.floor(Math.random() * 60);
  const evasionSeconds = Math.floor(Math.random() * 60);
  const evasionCalls = Math.floor((evasionMinutes * 60 + evasionSeconds) / 600); // Assuming 10min AHT
  const ghostMinutes = Math.floor(Math.random() * 30 + 10);
  const ghostSeconds = Math.floor(Math.random() * 60);
  const ghostImpact = Math.round((ghostMinutes + ghostSeconds / 60) / 38 * 10); // 38min shift

  const kpiData: OccupationKPIData = {
    effectiveOccupancy,
    occupancyTrend,
    shrinkagePercent,
    shrinkageTrend: Math.round(Math.random() * 10 - 5),
    evasionTime: { hours: 0, minutes: evasionMinutes },
    evasionCalls,
    ghostHours: { hours: 0, minutes: ghostMinutes },
    ghostImpact,
  };

  // Generate Gantt data
  const agents = Array.from(
    new Set(filteredConnectivity.map((c) => c.agent_name))
  ).slice(0, 10); // Top 10 agents

  const ganttData: AgentGanttData[] = agents.map((agentName) => ({
    agentName,
    periods: [
      { startHour: 8, startMinute: 30, endHour: 9, endMinute: 0, status: 'productivo' },
      { startHour: 9, startMinute: 0, endHour: 11, endMinute: 0, status: 'ocioso' },
      { startHour: 11, startMinute: 0, endHour: 11, endMinute: 30, status: 'pausa' },
      { startHour: 11, startMinute: 30, endHour: 13, endMinute: 0, status: 'productivo' },
      { startHour: 13, startMinute: 0, endHour: 14, endMinute: 0, status: 'pausa' },
      { startHour: 14, startMinute: 0, endHour: 15, endMinute: 30, status: 'no_responde' },
      { startHour: 15, startMinute: 30, endHour: 18, endMinute: 0, status: 'productivo' },
    ],
  }));

  // Generate demand data
  const demandData: DemandPoint[] = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + i;
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      inboundCalls: Math.floor(Math.random() * 50 + 20),
    };
  });

  // Performance matrix data
  const performanceData: PerformancePoint[] = agents.map((name) => {
    const occ = Math.random() * 100;
    const hours = Math.random() * 8 + 4;
    let quadrant: 'heroes' | 'efficient' | 'inflators' | 'underperformers' = 'efficient';
    if (occ > 70 && hours > 6) quadrant = 'heroes';
    else if (occ < 40 && hours > 6) quadrant = 'inflators';
    else if (occ < 40 && hours < 5) quadrant = 'underperformers';

    return { name, occupancy: Math.round(occ), activeHours: Math.round(hours * 10) / 10, quadrant };
  });

  // Audit table data
  const auditData: AuditTableRow[] = agents.map((agent) => ({
    agent,
    validatedTurnHours: 7,
    validatedTurnMinutes: Math.floor(Math.random() * 30),
    shrinkagePercent: Math.floor(Math.random() * 15 + 10),
    evasionMinutes: Math.floor(Math.random() * 45),
    evasionSeconds: Math.floor(Math.random() * 60),
    ghostMinutes: Math.floor(Math.random() * 40 + 5),
    ghostSeconds: Math.floor(Math.random() * 60),
    requiresReview: Math.random() > 0.6,
  }));

  return {
    kpiData,
    ganttData,
    demandData,
    performanceData,
    auditData,
    uniqueQueues,
  };
}

export function OccupationDashboard({ records, connectivityData }: Props) {
  const [filters, setFilters] = useState<OccupationFilters>({
    dateRange: 'thisWeek',
    anomaliesOnly: false,
    group: '',
  });

  const [connectivity, setConnectivity] = useState<AgentConnectivityHourly[]>(connectivityData || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connectivityData || connectivityData.length === 0) {
      const loadConnectivityData = async () => {
        setLoading(true);
        try {
          const { data } = await supabase
            .from('agent_connectivity_hourly')
            .select('*')
            .limit(1000);
          setConnectivity(data || []);
        } catch (error) {
          console.error('Error loading connectivity data:', error);
          setConnectivity([]);
        } finally {
          setLoading(false);
        }
      };
      loadConnectivityData();
    }
  }, [connectivityData]);

  const {
    kpiData,
    ganttData,
    demandData,
    performanceData,
    auditData,
    uniqueQueues,
  } = useMemo(() => calculateOccupancyMetrics(records, connectivity, filters), [records, connectivity, filters]);

  // Apply anomalies filter
  const filteredAuditData = filters.anomaliesOnly
    ? auditData.filter(
        (row) =>
          (row.ghostMinutes > 30 || (row.ghostMinutes === 30 && row.ghostSeconds > 0)) ||
          row.evasionMinutes > 15
      )
    : auditData;

  const filteredPerformanceData = filters.anomaliesOnly
    ? performanceData.filter((p) => p.quadrant === 'heroes' || p.quadrant === 'inflators' || p.quadrant === 'underperformers')
    : performanceData;

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

      <OccupationKPICards data={kpiData} />

      <AgentGanttChart agents={ganttData} demandData={demandData} />

      <AgentPerformanceMatrix data={filteredPerformanceData} />

      <AgentAuditTable rows={filteredAuditData} />
    </div>
  );
}
