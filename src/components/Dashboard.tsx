import { useMemo, useState, useEffect } from 'react';
import { KPICards } from './KPICards';
import { HourlyChart } from './HourlyChart';
import { ExecutivesTable } from './ExecutivesTable';
import { DirectionChart } from './DirectionChart';
import { DurationExtremes } from './DurationExtremes';
import { FilterBar, DEFAULT_FILTERS } from './FilterBar';
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
import { SectionHeader } from './SectionHeader';
import { calculateKPIs, getEmptyKPISummary, calculateAgentAuditFlags } from '../lib/kpi';
import type { CallRecord, CallUpload } from '../lib/supabase';
import type { DataQualityReport } from '../lib/kpi';
import type { Section } from './Sidebar';
import { Activity, AlertCircle, Calendar, CheckCircle, Info, AlertTriangle, Layers, PhoneCall, Shield, Upload, Users } from 'lucide-react';
import { AgentConnectivityChart } from './AgentConnectivityChart';
import { TopCallersTable } from './TopCallersTable';
import { AgentAuditFlags } from './AgentAuditFlags';
import type { AgentStatusRecord } from '../lib/supabase';
import { supabase } from '../lib/supabase';

type Props = {
  records: CallRecord[];
  upload: CallUpload;
  agentStatusRecords: AgentStatusRecord[];
  activeSection: Section;
  onUploadAgentStatus: () => void;
  dataQuality: DataQualityReport | null;
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

function getEffectiveDateRange(filters: FilterState): { start: string; end: string } {
  if (filters.dateRange === 'custom') {
    return { start: filters.dateStart, end: filters.dateEnd };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (filters.dateRange) {
    case 'thisWeek': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastWeek': {
      const end = new Date(today);
      end.setDate(today.getDate() - today.getDay() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(today.getFullYear(), quarter * 3, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
  }
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

// Component: Data Quality Banner
function DataQualityBanner({ quality }: { quality: DataQualityReport | null }) {
  if (!quality) return null;

  const hasCriticalIssues = quality.criticalIssues.handleTimeCorrupted > 0 || quality.criticalIssues.technicalCutsAsAttended > 0;
  const hasOutboundFiltered = quality.outboundCalls > 0;
  const isClean = !hasCriticalIssues && !hasOutboundFiltered;

  if (isClean) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center gap-3">
        <CheckCircle size={20} className="text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Integridad de datos verificada</p>
          <p className="text-sm text-emerald-700 mt-0.5">Se analizaron {quality.totalRecords.toLocaleString('es-CL')} registros sin anomalías detectadas</p>
        </div>
      </div>
    );
  }

  if (hasCriticalIssues) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Anomalías detectadas en datos</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {quality.handleTimeCorrupted} registros con handle_time corrupto, {quality.technicalCuts} cortes técnicos detectados.
              Ver pestaña <strong>Auditoría</strong> para detalles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasOutboundFiltered) {
    return (
      <div className="bg-sky-50 border border-sky-200 rounded-2xl px-6 py-4 flex items-center gap-3">
        <Info size={20} className="text-sky-600" />
        <div>
          <p className="font-semibold text-sky-900">Llamadas salientes filtradas</p>
          <p className="text-sm text-sky-700 mt-0.5">Se excluyeron {quality.outboundCalls.toLocaleString('es-CL')} llamadas salientes de los cálculos de KPI (Service Level solo incluye entrantes)</p>
        </div>
      </div>
    );
  }

  return null;
}

// Component: Audit Tab
function AuditTab() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('import_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        setAuditLogs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading audit logs');
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <p className="text-slate-500">Cargando registros de auditoría...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4">
        <p className="text-red-700 font-semibold">Error al cargar auditoría</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 font-semibold">Sin registros de auditoría</p>
        <p className="text-sm text-slate-400 mt-1">Aún no se han detectado anomalías en las importaciones</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {auditLogs.map(log => (
        <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-slate-800">Importación {log.upload_id?.substring(0, 8)}...</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(log.created_at).toLocaleDateString('es-CL', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </p>
            </div>
            <div className="flex gap-2">
              {log.critical_count > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  🔴 {log.critical_count} críticas
                </span>
              )}
              {log.warning_count > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  ⚠️ {log.warning_count} advertencias
                </span>
              )}
            </div>
          </div>

          {log.total_anomalies > 0 && (
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">Total anomalías: {log.total_anomalies}</p>
              {log.anomaly_breakdown && (
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-500">
                  {Object.entries(log.anomaly_breakdown as Record<string, number>).map(([key, count]) => (
                    <li key={key}>{key}: {count}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Component: Data Quality Indicator (for header)
function DataQualityIndicator({ quality }: { quality: DataQualityReport | null }) {
  if (!quality) return null;

  const hasCritical = quality.criticalIssues.handleTimeCorrupted > 0 || quality.criticalIssues.technicalCutsAsAttended > 0;
  const hasWarning = quality.handleTimeCorrupted > 0 || quality.technicalCuts > 0;

  if (hasCritical) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <AlertCircle size={14} />
        Anomalías detectadas
      </span>
    );
  }

  if (hasWarning) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <AlertTriangle size={14} />
        Advertencias
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <CheckCircle size={14} />
      Datos limpios
    </span>
  );
}

export function Dashboard({ records, upload, agentStatusRecords, activeSection, onUploadAgentStatus, dataQuality }: Props) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [kpis, setKpis] = useState(() => getEmptyKPISummary());
  const [isLoadingKpis, setIsLoadingKpis] = useState(false);
  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);
  const agentAuditFlags = useMemo(() => calculateAgentAuditFlags(agentStatusRecords), [agentStatusRecords]);

  useEffect(() => {
    setIsLoadingKpis(true);
    calculateKPIs(filteredRecords)
      .then(result => {
        setKpis(result);
        setIsLoadingKpis(false);
      })
      .catch(err => {
        console.error('Error calculating KPIs:', err);
        setIsLoadingKpis(false);
      });
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
        <ExecutiveDashboard kpis={kpis} records={records} filters={filters} onNavigate={() => {}} />
      )}

      {activeSection === 'llamadas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={PhoneCall}
            title="Análisis de Llamadas"
            description="Distribución horaria, dirección y duración de las llamadas"
          />
          <KPICards kpis={kpis} />
          <HourlyChart data={kpis.hourlyDistribution} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ExecutivesTable stats={kpis.executiveStats} />
            {/* QueuesTable removed - table now integrated in QueueHealthDashboard with proper styling */}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DirectionChart stats={kpis.directionStats} />
            <DurationExtremes kpis={kpis} />
          </div>
        </div>
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
              actions={
                <button
                  type="button"
                  onClick={onUploadAgentStatus}
                  className="flex items-center gap-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <Upload size={15} />
                  Cargar CSV
                </button>
              }
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
                  agentRecords={agentStatusRecords}
                  executiveStats={kpis.executiveStats}
                />
              </>
            )}
          </div>
        </div>
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
