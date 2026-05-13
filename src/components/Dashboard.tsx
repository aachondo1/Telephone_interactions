import { useMemo, useState, useEffect } from 'react';
import { FilterBar, DEFAULT_FILTERS, getEffectiveDateRange } from './FilterBar';
import type { FilterState } from './FilterBar';
import { QueueKPICards } from './QueueKPICards';
import { QueueBarChart } from './QueueBarChart';
import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import QueueUnattendedHeatmap from './QueueUnattendedHeatmap';
import WeeklyAttentionHeatmap from './WeeklyAttentionHeatmap';
import { QueueAttendanceEvolution } from './QueueAttendanceEvolution';
import { PhoneOccupancyChart } from './PhoneOccupancyChart';
import { StaffingDemandChart } from './StaffingDemandChart';
import { InterventionImpact } from './InterventionImpact';
import { QueuesDetailTable } from './QueuesDetailTable';
import { ExecutiveKPICards } from './ExecutiveKPICards';
import { ExecutiveBarChart } from './ExecutiveBarChart';
import { ExecutiveScatterChart } from './ExecutiveScatterChart';
import { ExecutiveTalkTimeByHour } from './ExecutiveTalkTimeByHour';
import { ExecutiveTalkTimeByDay } from './ExecutiveTalkTimeByDay';
import { ExecutiveTalkTimeByWeekday } from './ExecutiveTalkTimeByWeekday';
import { ExecutivesDetailTable } from './ExecutivesDetailTable';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { QueueHealthDashboard } from './QueueHealthDashboard';
import { OutboundDashboard } from './OutboundDashboard';
import { OccupationDashboard } from './OccupationDashboard';
import { SectionHeader } from './SectionHeader';
import { DataQualityBanner, DataQualityIndicator } from './DataQualityBanner';
import { AuditTab } from './AuditTab';
import { calculateKPIs, getEmptyKPISummary, calculateAgentAuditFlags } from '../lib/kpi';
import type { CallRecord, CallUpload } from '../lib/supabase';
import type { DataQualityReport } from '../lib/kpi';
import type { Section } from './Sidebar';
import { Activity, AlertTriangle, Calendar, Layers, Shield, Users } from 'lucide-react';
import { AgentConnectivityChart } from './AgentConnectivityChart';
import { TopCallersTable } from './TopCallersTable';
import { AgentAuditFlags } from './AgentAuditFlags';
import type { AgentStatusRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
  upload: CallUpload;
  agentStatusRecords: AgentStatusRecord[];
  activeSection: Section;
  dataQuality: DataQualityReport | null;
  connectivityRefreshKey?: number;
};

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  if (start && end && start !== end) return `${fmt(start)} — ${fmt(end)}`;
  return fmt(start ?? end ?? '');
}

function isInbound(direction: string): boolean {
  const d = (direction || '').toLowerCase();
  return d === 'inbound' || d === 'entrante';
}


function isBusinessHours(r: CallRecord): boolean {
  if (!r.call_date || r.call_hour === null || r.call_hour === undefined) return true;
  const day = new Date(r.call_date + 'T00:00:00').getDay();
  if (day === 0 || day === 6) return false;
  if (day >= 1 && day <= 4) return r.call_hour >= 8 && r.call_hour < 19;
  if (day === 5) return r.call_hour >= 8 && r.call_hour < 15;
  return false;
}

function applyFilters(records: CallRecord[], filters: FilterState): CallRecord[] {
  const { start, end } = getEffectiveDateRange(filters);

  return records.filter(r => {
    if (!isBusinessHours(r)) return false;
    if (start && r.call_date && r.call_date < start) return false;
    if (end && r.call_date && r.call_date > end) return false;

    if (filters.departments.length > 0) {
      const queueUpper = (r.queue || '').toUpperCase();
      const matchesDept = filters.departments.some(dept => {
        if (dept === 'BICEHIPOTECARIA') return queueUpper.includes('BICEHIPOTECARIA');
        if (dept === 'CASANUESTRA') return queueUpper.includes('CN');
        return false;
      });
      if (!matchesDept) return false;
    }

    if (filters.queues.length > 0 && !filters.queues.includes(r.queue)) return false;
    if (filters.executives.length > 0 && !filters.executives.includes(r.executive)) return false;

    if (filters.attendedStatus.length > 0) {
      const isUnassigned = !r.queue;
      const isAttended = r.attended && r.queue;
      const isUnattended = !r.attended && r.queue;

      let matchesAttendedFilter = false;
      if (filters.attendedStatus.includes('attended') && isAttended) matchesAttendedFilter = true;
      if (filters.attendedStatus.includes('unattended') && isUnattended) matchesAttendedFilter = true;
      if (filters.attendedStatus.includes('unassigned') && isUnassigned) matchesAttendedFilter = true;

      if (!matchesAttendedFilter) return false;
    }

    if (filters.direction.length > 0) {
      const dirMatch = filters.direction.some(d => {
        if (d === 'inbound') return isInbound(r.call_direction);
        if (d === 'outbound') return !isInbound(r.call_direction);
        return false;
      });
      if (!dirMatch) return false;
    }

    if (filters.abandonType.length > 0) {
      if (!r.abandon_type || !filters.abandonType.includes(r.abandon_type as any)) return false;
    }

    return true;
  });
}

export function Dashboard({ records, upload, agentStatusRecords, activeSection, dataQuality, connectivityRefreshKey }: Props) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [kpis, setKpis] = useState(() => getEmptyKPISummary());
  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);

  // Filter agentStatusRecords by overlap with the global date range.
  // AgentStatusRecord is aggregated per upload (no daily granularity), so we include
  // a record if its period overlaps with the selected range at all.
  const filteredAgentStatusRecords = useMemo(() => {
    const { dateStart, dateEnd, executives } = filters;
    if (!dateStart && !dateEnd && executives.length === 0) return agentStatusRecords;
    
    return agentStatusRecords.filter(r => {
      // Filtro por fechas
      let dateMatch = true;
      if (dateStart || dateEnd) {
        const rStart = (r.date_range_start ?? '').slice(0, 10);
        const rEnd   = (r.date_range_end   ?? '').slice(0, 10);
        if (rStart || rEnd) {
          const filterStart = dateStart ? dateStart.slice(0, 10) : '';
          const filterEnd   = dateEnd   ? dateEnd.slice(0, 10)   : '';
          const overlapEnd   = !filterStart || !rEnd   || rEnd   >= filterStart;
          const overlapStart = !filterEnd   || !rStart || rStart <= filterEnd;
          dateMatch = overlapEnd && overlapStart;
        }
      }

      // Filtro por ejecutivos
      let execMatch = true;
      if (executives.length > 0) {
        const lowerExecutives = executives.map(e => e.toLowerCase().trim());
        const lowerAgentName = (r.agent_name || '').toLowerCase().trim();
        execMatch = lowerExecutives.includes(lowerAgentName);
      }

      return dateMatch && execMatch;
    });
  }, [agentStatusRecords, filters.dateStart, filters.dateEnd, filters.executives]);

  const agentAuditFlags = useMemo(() => calculateAgentAuditFlags(filteredAgentStatusRecords), [filteredAgentStatusRecords]);

  useEffect(() => {
    calculateKPIs(filteredRecords)
      .then(result => setKpis(result))
      .catch(err => console.error('Error calculating KPIs:', err));
  }, [filteredRecords]);

  // Scroll to top when section changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const dateRange = formatDateRange(upload.date_range_start, upload.date_range_end);

  return (
    <div className="space-y-6">
      {/* Dataset info bar */}
      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-700">Análisis histórico combinado</p>
          {dateRange && <p className="text-sm text-slate-400 mt-0.5">{dateRange}</p>}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-slate-400">Registros</p>
            <p className="font-bold text-slate-700">{upload.record_count.toLocaleString('es-CL')}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400">Cargado</p>
            <p className="font-bold text-slate-700">
              {new Date(upload.uploaded_at).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="text-center border-l border-slate-200 pl-6">
            <p className="text-slate-400 mb-1">Integridad</p>
            <DataQualityIndicator quality={dataQuality} />
          </div>
        </div>
      </div>

      {/* Data Quality Banner */}
      {dataQuality && <DataQualityBanner quality={dataQuality} />}

      {/* Filters */}
      <FilterBar
        records={records}
        filters={filters}
        onChange={setFilters}
        filteredCount={filteredRecords.length}
      />


      {/* Section content — driven by sidebar */}
      <div key={activeSection} className="animate-section-enter">
      {activeSection === 'inicio' && (
        <ExecutiveDashboard kpis={kpis} records={records} filters={filters} />
      )}

      {activeSection === 'colas' && (
        <div className="space-y-8">
          <SectionHeader
            icon={Layers}
            title="Análisis de Colas"
            description="Rendimiento, ocupación y patrones de atención por cola"
          />

          {/* NIVEL 1: Contexto Inmediato */}
          <QueueKPICards stats={kpis.queueStats} totalCalls={kpis.totalCalls} />

          {/* NIVEL 2: Evolución Temporal */}
          <QueueAttendanceEvolution data={kpis.queueAttendanceEvolution} />

          {/* NIVEL 3: Análisis Estructural - Patrones Recurrentes */}
          <WeeklyAttentionHeatmap
            data={kpis.weeklyAttentionHeatmap}
            onCellClick={(weekKey, queue) => {
              const weekDate = new Date(weekKey + 'T00:00:00');
              const weekEnd = new Date(weekDate);
              weekEnd.setDate(weekEnd.getDate() + 6);
              const formatDate = (d: Date) => d.toISOString().split('T')[0];
              setFilters(prev => ({
                ...prev,
                dateRange: 'custom',
                dateStart: formatDate(weekDate),
                dateEnd: formatDate(weekEnd),
                queues: [queue],
              }));
            }}
          />

          {/* NIVEL 4: Comparativa Horaria (Éxito vs Fallas lado a lado) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
            <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
          </div>

          {/* NIVEL 5: Distribución de Volumen */}
          <QueueBarChart stats={kpis.queueStats} />

          {/* NIVEL 6: Detalle Operacional */}
          <QueuesDetailTable stats={kpis.queueStats} />
          <TopCallersTable records={filteredRecords} />
        </div>
      )}

      {activeSection === 'salud-colas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Activity}
            title="Salud de Colas"
            description="KPIs críticos, análisis de fugas y alertas automáticas de gestión"
          />
          <QueueHealthDashboard records={filteredRecords} />
        </div>
      )}

      {activeSection === 'ejecutivos' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Users}
            title="Análisis de Ejecutivos"
            description="Rendimiento individual, tiempo de habla y conectividad"
          />
          <ExecutiveKPICards stats={kpis.executiveStats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExecutiveBarChart stats={kpis.executiveStats} />
            <ExecutiveScatterChart stats={kpis.executiveStats} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExecutiveTalkTimeByHour
              data={kpis.executiveHourlyTalkTime}
              executives={kpis.topExecutivesByVolume}
              allExecutives={kpis.allExecutivesWithData}
            />
            <ExecutiveTalkTimeByWeekday
              data={kpis.executiveWeekdayTalkTime}
              executives={kpis.topExecutivesByVolume}
              allExecutives={kpis.allExecutivesWithData}
            />
          </div>
          <ExecutiveTalkTimeByDay
            data={kpis.executiveDailyTalkTime}
            executives={kpis.topExecutivesByVolume}
          />
          <ExecutivesDetailTable stats={kpis.executiveStats} />

          {/* Agent audit flags */}
          {agentAuditFlags.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-yellow-600" />
                Alertas de Conectividad
              </h3>
              <AgentAuditFlags flags={agentAuditFlags} />
            </div>
          )}

          {/* Conectividad integrada como sub-sección */}
          <div className="border-t border-slate-200 pt-6 mt-6">
            <SectionHeader
              icon={Activity}
              title="Conectividad de Agentes"
              description="Tiempo en cola, fuera de cola y ocupación real"
            />
            {agentStatusRecords.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Activity size={28} className="text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-slate-600">Sin datos de conectividad</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    Carga el reporte "Estado de Agentes" para ver la conectividad.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-sky-50 border border-sky-100 rounded-2xl px-6 py-4 text-sm text-sky-800 mb-4">
                  <p className="font-semibold mb-1">¿Cómo leer esta sección?</p>
                  <p className="text-sky-700 text-xs leading-relaxed">
                    <strong>Conectado</strong> = En la cola + Fuera de la cola.{' '}
                    <strong>En la cola</strong>: la agente está disponible para recibir llamados.{' '}
                    <strong>Fuera de la cola</strong>: está conectada al sistema pero no recibe llamados (otras gestiones).
                    {kpis.executiveStats.length > 0 && (
                      <> La <strong>ocupación real</strong> cruza el tiempo efectivo en llamadas con el tiempo en cola.</>
                    )}
                  </p>
                </div>
                <AgentConnectivityChart
                  agentRecords={filteredAgentStatusRecords}
                  executiveStats={kpis.executiveStats}
                />
              </>
            )}
          </div>
        </div>
      )}

      {activeSection === 'ocupacion-agentes' && (
        <OccupationDashboard records={filteredRecords} allRecords={records} agentStatusRecords={filteredAgentStatusRecords} connectivityRefreshKey={connectivityRefreshKey} executiveFilter={filters.executives} filters={filters} />
      )}

      {activeSection === 'planificacion' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Calendar}
            title="Planificación de Personal"
            description="Ocupación telefónica y demanda para dimensionamiento de equipos"
          />
          <div className="bg-sky-50 border border-sky-100 rounded-2xl px-6 py-4 text-sm text-sky-800">
            <p className="font-semibold mb-1">¿Cómo leer esta sección?</p>
            <p className="text-sky-700 text-xs leading-relaxed">
              <strong>Ocupación telefónica</strong>: % del turno que cada ejecutiva pasa en llamadas. El tiempo restante está disponible para atención presencial, correo u otras gestiones.
              <br />
              <strong>Demanda en Erlangs</strong>: cuántas personas necesitas simultáneamente en teléfono a cada hora. Ajusta el número de personas asignadas y verás en qué franjas hay déficit o exceso.
            </p>
          </div>
          <StaffingDemandChart data={kpis.hourlyDemand} />
          <InterventionImpact data={kpis.interventionMetrics} />
          <PhoneOccupancyChart data={kpis.executiveOccupancy} />
        </div>
      )}

      {activeSection === 'gestion-proactiva' && (
        <OutboundDashboard records={filteredRecords} />
      )}

      {activeSection === 'audit' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Shield}
            title="Auditoría de Datos"
            description="Registro de anomalías detectadas durante las importaciones"
          />
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">¿Qué es esta sección?</p>
            <p className="text-blue-700 text-xs leading-relaxed">
              Aquí se registran todos los problemas detectados durante la importación de datos:
              <br />
              <strong>Críticos</strong> (🔴): handle_time corrompido, attended sin duration, salientes con queue_time
              <br />
              <strong>Advertencias</strong> (⚠️): cortes técnicos (1-5s sin alertas), abandonos sin clasificar
            </p>
          </div>
          <AuditTab />
        </div>
      )}
      </div>
    </div>
  );
}
