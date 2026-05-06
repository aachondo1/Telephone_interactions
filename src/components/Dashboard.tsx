import { useMemo, useState } from 'react';
import {
  PhoneCall, Layers, Users, Calendar, Zap, Shield, Activity,
} from 'lucide-react';
import { FilterBar, DEFAULT_FILTERS, getDateRangeForRelative } from './FilterBar';
import type { FilterState } from './FilterBar';
import { calculateKPIs } from '../lib/kpi';
import type { CallRecord, CallUpload, AgentStatusRecord } from '../lib/supabase';
import type { DataQualityReport } from '../lib/kpi';
import type { Section } from './Sidebar';
import { SectionHeader } from './SectionHeader';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { KPICards } from './KPICards';
import { HourlyChart } from './HourlyChart';
import { DirectionChart } from './DirectionChart';
import { DurationExtremes } from './DurationExtremes';
import { ServiceLevelChart } from './ServiceLevelChart';
import { TopCallersTable } from './TopCallersTable';
import { QueueKPICards } from './QueueKPICards';
import { QueueBarChart } from './QueueBarChart';
import { QueuePieChart } from './QueuePieChart';
import { QueuesDetailTable } from './QueuesDetailTable';
import { AbandonClassificationChart } from './AbandonClassificationChart';
import { RentryAnalysis } from './RentryAnalysis';
import { QueueHealthDashboard } from './QueueHealthDashboard';
import { ExecutiveKPICards } from './ExecutiveKPICards';
import { ExecutiveBarChart } from './ExecutiveBarChart';
import { ExecutiveScatterChart } from './ExecutiveScatterChart';
import { ExecutivesDetailTable } from './ExecutivesDetailTable';
import { ExecutiveTalkTimeByDay } from './ExecutiveTalkTimeByDay';
import { ExecutiveTalkTimeByHour } from './ExecutiveTalkTimeByHour';
import { ExecutiveTalkTimeByWeekday } from './ExecutiveTalkTimeByWeekday';
import { BounceRateByExecutive } from './BounceRateByExecutive';
import { PhoneOccupancyChart } from './PhoneOccupancyChart';
import { AgentConnectivityChart } from './AgentConnectivityChart';
import { StaffingDemandChart } from './StaffingDemandChart';
import { InterventionImpact } from './InterventionImpact';
import { DataAuditPanel } from './DataAuditPanel';

type Props = {
  records: CallRecord[];
  upload: CallUpload;
  agentStatusRecords: AgentStatusRecord[];
  activeSection: Section;
  onUploadAgentStatus: () => void;
  dataQuality: DataQualityReport | null;
};

function applyFilters(records: CallRecord[], filters: FilterState): CallRecord[] {
  return records.filter(r => {
    // Date range filter
    if (filters.dateRange !== 'custom') {
      const { start, end } = getDateRangeForRelative(filters.dateRange);
      if (start && r.call_date && r.call_date < start) return false;
      if (end && r.call_date && r.call_date > end) return false;
    } else {
      if (filters.dateStart && r.call_date && r.call_date < filters.dateStart) return false;
      if (filters.dateEnd && r.call_date && r.call_date > filters.dateEnd) return false;
    }

    // Department filter
    if (filters.departments.length > 0) {
      const q = (r.queue || '').toUpperCase();
      const matches = filters.departments.some(d => {
        if (d === 'BICEHIPOTECARIA') return q.includes('BICEHIPOTECARIA');
        if (d === 'CASANUESTRA') return q.includes('CN');
        return false;
      });
      if (!matches) return false;
    }

    // Queue filter
    if (filters.queues.length > 0 && !filters.queues.includes(r.queue || '')) return false;

    // Executive filter
    if (filters.executives.length > 0 && !filters.executives.includes(r.executive || '')) return false;

    // Direction filter
    if (filters.direction.length > 0) {
      const dir = (r.call_direction || '').toLowerCase();
      const isIn = dir === 'inbound' || dir === 'entrante';
      const isOut = dir === 'outbound' || dir === 'saliente';
      if (filters.direction.includes('inbound') && !isIn) return false;
      if (filters.direction.includes('outbound') && !isOut) return false;
      if (!filters.direction.includes('inbound') && !filters.direction.includes('outbound')) return false;
    }

    // Attended status filter
    if (filters.attendedStatus.length > 0) {
      const isAttended = r.attended;
      const isUnattended = !r.attended && r.executive !== 'SIN ATENDER';
      const isUnassigned = !r.attended && r.executive === 'SIN ATENDER';
      if (filters.attendedStatus.includes('attended') && !isAttended) return false;
      if (filters.attendedStatus.includes('unattended') && !isUnattended) return false;
      if (filters.attendedStatus.includes('unassigned') && !isUnassigned) return false;
      if (
        !filters.attendedStatus.includes('attended') &&
        !filters.attendedStatus.includes('unattended') &&
        !filters.attendedStatus.includes('unassigned')
      ) return false;
    }

    // Abandon type filter
    if (filters.abandonType.length > 0) {
      if (!r.abandon_type || !filters.abandonType.includes(r.abandon_type as any)) return false;
    }

    return true;
  });
}

export function Dashboard({
  records,
  upload,
  agentStatusRecords,
  activeSection,
  onUploadAgentStatus,
  dataQuality,
}: Props) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);

  const kpis = useMemo(() => calculateKPIs(filteredRecords), [filteredRecords]);

  const hasAgentStatus = agentStatusRecords.length > 0;

  return (
    <div className="space-y-6 animate-section-enter">
      {/* Dataset info bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="bg-slate-100 px-3 py-1.5 rounded-lg">
          {upload.filename}
        </span>
        <span>
          {upload.record_count.toLocaleString('es-CL')} registros
        </span>
        {upload.date_range_start && upload.date_range_end && (
          <span>
            {upload.date_range_start} → {upload.date_range_end}
          </span>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar
        records={records}
        filters={filters}
        onChange={setFilters}
        filteredCount={filteredRecords.length}
      />

      {/* ── INICIO ── */}
      {activeSection === 'inicio' && (
        <div className="space-y-6">
          <SectionHeader
            icon={PhoneCall}
            title="Panel de Control"
            description="Resumen ejecutivo de métricas clave"
          />
          <ExecutiveDashboard
            kpis={kpis}
            onNavigate={(tab) => {
              // Navigation handled by parent via activeSection prop
            }}
          />
        </div>
      )}

      {/* ── LLAMADAS ── */}
      {activeSection === 'llamadas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={PhoneCall}
            title="Análisis de Llamadas"
            description="Distribución horaria, dirección y duración"
          />
          <KPICards kpis={kpis} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HourlyChart data={kpis.hourlyDistribution} />
            <DirectionChart stats={kpis.directionStats} />
          </div>
          <DurationExtremes kpis={kpis} />
          <ServiceLevelChart data={kpis.serviceLevel} />
          <TopCallersTable records={filteredRecords} />
        </div>
      )}

      {/* ── COLAS ── */}
      {activeSection === 'colas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Layers}
            title="Análisis de Colas"
            description="Rendimiento, distribución y abandono por cola"
          />
          <QueueKPICards stats={kpis.queueStats} totalCalls={kpis.totalCalls} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QueueBarChart stats={kpis.queueStats} />
            <QueuePieChart stats={kpis.queueStats} />
          </div>
          <QueuesDetailTable stats={kpis.queueStats} />
          <AbandonClassificationChart records={filteredRecords} />
          <RentryAnalysis records={filteredRecords} />
        </div>
      )}

      {/* ── SALUD DE COLAS ── */}
      {activeSection === 'salud-colas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Activity}
            title="Salud de Colas"
            description="Métricas operativas, embudo de abandono y distribución de espera"
          />
          <QueueHealthDashboard records={filteredRecords} />
        </div>
      )}

      {/* ── EJECUTIVOS ── */}
      {activeSection === 'ejecutivos' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Users}
            title="Rendimiento de Ejecutivos"
            description="Volumen, tiempos y ocupación telefónica"
          />
          <ExecutiveKPICards stats={kpis.executiveStats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExecutiveBarChart stats={kpis.executiveStats} />
            <ExecutiveScatterChart stats={kpis.executiveStats} />
          </div>
          <ExecutivesDetailTable stats={kpis.executiveStats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExecutiveTalkTimeByDay
              data={kpis.executiveDailyTalkTime}
              executives={kpis.topExecutivesByVolume}
            />
            <ExecutiveTalkTimeByHour
              data={kpis.executiveHourlyTalkTime}
              executives={kpis.topExecutivesByVolume}
              allExecutives={kpis.allExecutivesWithData}
            />
          </div>
          <ExecutiveTalkTimeByWeekday
            data={kpis.executiveWeekdayTalkTime}
            executives={kpis.topExecutivesByVolume}
            allExecutives={kpis.allExecutivesWithData}
          />
          <BounceRateByExecutive executives={kpis.executiveStats} />
          <PhoneOccupancyChart data={kpis.executiveOccupancy} />
          {hasAgentStatus && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Conectividad de Agentes</h3>
                <button
                  type="button"
                  onClick={onUploadAgentStatus}
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                >
                  Actualizar datos
                </button>
              </div>
              <AgentConnectivityChart
                agentRecords={agentStatusRecords}
                executiveStats={kpis.executiveStats}
              />
            </div>
          )}
          {!hasAgentStatus && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
              <p className="text-sm text-slate-500 mb-3">
                No hay datos de conectividad de agentes cargados
              </p>
              <button
                type="button"
                onClick={onUploadAgentStatus}
                className="text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cargar Estado de Agentes
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PLANIFICACIÓN ── */}
      {activeSection === 'planificacion' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Calendar}
            title="Planificación de Personal"
            description="Demanda en Erlangs y ocupación telefónica"
          />
          <StaffingDemandChart data={kpis.hourlyDemand} />
          <PhoneOccupancyChart data={kpis.executiveOccupancy} />
        </div>
      )}

      {/* ── INTERVENCIÓN ── */}
      {activeSection === 'intervencion' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Zap}
            title="Impacto de Intervenciones"
            description="Análisis del tiempo de búsqueda y su efecto en demanda"
          />
          <InterventionImpact data={kpis.interventionMetrics} />
        </div>
      )}

      {/* ── AUDITORÍA ── */}
      {activeSection === 'audit' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Shield}
            title="Auditoría de Datos"
            description="Validación de integridad y calidad de datos"
          />
          <DataAuditPanel />
        </div>
      )}
    </div>
  );
}