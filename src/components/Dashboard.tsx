import { useEffect, useMemo } from 'react';
import { FilterBar } from './FilterBar';
import { formatDateRange } from '../lib/filterUtils';
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
import { calculateAgentAuditFlags } from '../lib/kpi';
import type { CallRecord, CallUpload } from '../lib/supabase';
import type { DataQualityReport } from '../lib/kpi';
import type { Section } from './Sidebar';
import { Activity, AlertTriangle, Calendar, Layers, Shield, Users } from 'lucide-react';
import { AgentConnectivityChart } from './AgentConnectivityChart';
import { TopCallersTable } from './TopCallersTable';
import { AgentAuditFlags } from './AgentAuditFlags';
import type { AgentStatusRecord } from '../lib/supabase';
import { useFilters } from '../hooks/useFilters';
import { useKPIs } from '../hooks/useKPIs';

type Props = {
  records: CallRecord[];
  upload: CallUpload;
  agentStatusRecords: AgentStatusRecord[];
  activeSection: Section;
  dataQuality: DataQualityReport | null;
  connectivityRefreshKey?: number;
};

export function Dashboard({ records, upload, agentStatusRecords, activeSection, dataQuality, connectivityRefreshKey }: Props) {
  const { filters, setFilters, filteredRecords, baseFilteredRecords, filteredAgentStatusRecords } =
    useFilters(records, agentStatusRecords);
  const { kpis } = useKPIs(filteredRecords);
  const agentAuditFlags = useMemo(
    () => calculateAgentAuditFlags(filteredAgentStatusRecords),
    [filteredAgentStatusRecords]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const dateRange = formatDateRange(upload.date_range_start, upload.date_range_end);
  const agentDateStart = agentStatusRecords.reduce<string | null>(
    (min, r) => (!r.date_range_start ? min : !min || r.date_range_start < min ? r.date_range_start : min),
    null
  );
  const agentDateEnd = agentStatusRecords.reduce<string | null>(
    (max, r) => (!r.date_range_end ? max : !max || r.date_range_end > max ? r.date_range_end : max),
    null
  );
  const agentDateRange = formatDateRange(agentDateStart, agentDateEnd);

  return (
    <div className="space-y-6">
      {/* Dataset info bar */}
      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-8 flex-wrap">
          <div>
            <p className="font-semibold text-slate-700">Análisis histórico combinado</p>
            <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-0.5">
              {dateRange && (
                <p className="text-sm text-slate-400">
                  <span className="text-slate-500 font-medium">Llamadas:</span> {dateRange}
                </p>
              )}
              {agentStatusRecords.length > 0 && agentDateRange && (
                <p className="text-sm text-slate-400">
                  <span className="text-slate-500 font-medium">Estado agente:</span> {agentDateRange}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-slate-400">Llamadas</p>
            <p className="font-bold text-slate-700">{upload.record_count.toLocaleString('es-CL')}</p>
          </div>
          {agentStatusRecords.length > 0 && (
            <div className="text-center">
              <p className="text-slate-400">Est. agente</p>
              <p className="font-bold text-slate-700">{agentStatusRecords.length.toLocaleString('es-CL')}</p>
            </div>
          )}
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

      {dataQuality && <DataQualityBanner quality={dataQuality} />}

      <FilterBar
        records={records}
        filters={filters}
        onChange={setFilters}
        filteredCount={filteredRecords.length}
      />

      <div key={activeSection} className="animate-section-enter">
        {activeSection === 'inicio' && (
          <ExecutiveDashboard kpis={kpis} records={baseFilteredRecords} filteredRecords={filteredRecords} filters={filters} agentStatusRecords={filteredAgentStatusRecords} />
        )}

        {activeSection === 'colas' && (
          <div className="space-y-8">
            <SectionHeader icon={Layers} title="Análisis de Colas" description="Rendimiento, ocupación y patrones de atención por cola" />
            <QueueKPICards stats={kpis.queueStats} totalCalls={kpis.totalCalls} />
            <QueueAttendanceEvolution data={kpis.queueAttendanceEvolution} />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
              <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
            </div>
            <QueueBarChart stats={kpis.queueStats} />
            <QueuesDetailTable stats={kpis.queueStats} />
            <TopCallersTable records={filteredRecords} />
          </div>
        )}

        {activeSection === 'salud-colas' && (
          <div className="space-y-6">
            <SectionHeader icon={Activity} title="Salud de Colas" description="KPIs críticos, análisis de fugas y alertas automáticas de gestión" />
            <QueueHealthDashboard records={filteredRecords} />
          </div>
        )}

        {activeSection === 'ejecutivos' && (
          <div className="space-y-6">
            <SectionHeader icon={Users} title="Análisis de Ejecutivos" description="Rendimiento individual, tiempo de habla y conectividad" />
            <ExecutiveKPICards stats={kpis.executiveStats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExecutiveBarChart stats={kpis.executiveStats} />
              <ExecutiveScatterChart stats={kpis.executiveStats} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExecutiveTalkTimeByHour data={kpis.executiveHourlyTalkTime} executives={kpis.topExecutivesByVolume} allExecutives={kpis.allExecutivesWithData} />
              <ExecutiveTalkTimeByWeekday data={kpis.executiveWeekdayTalkTime} executives={kpis.topExecutivesByVolume} allExecutives={kpis.allExecutivesWithData} />
            </div>
            <ExecutiveTalkTimeByDay data={kpis.executiveDailyTalkTime} executives={kpis.topExecutivesByVolume} />
            <ExecutivesDetailTable stats={kpis.executiveStats} />
            {agentAuditFlags.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-yellow-600" />
                  Alertas de Conectividad
                </h3>
                <AgentAuditFlags flags={agentAuditFlags} />
              </div>
            )}
            <div className="border-t border-slate-200 pt-6 mt-6">
              <SectionHeader icon={Activity} title="Conectividad de Agentes" description="Tiempo en cola, fuera de cola y ocupación real" />
              {agentStatusRecords.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                    <Activity size={28} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">Sin datos de conectividad</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">Carga el reporte "Estado de Agentes" para ver la conectividad.</p>
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
                  <AgentConnectivityChart agentRecords={filteredAgentStatusRecords} executiveStats={kpis.executiveStats} />
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
            <SectionHeader icon={Calendar} title="Planificación de Personal" description="Ocupación telefónica y demanda para dimensionamiento de equipos" />
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
            <SectionHeader icon={Shield} title="Auditoría de Datos" description="Registro de anomalías detectadas durante las importaciones" />
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
