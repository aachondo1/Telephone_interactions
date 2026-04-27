import { useMemo, useState } from 'react';
import { KPICards } from './KPICards';
import { HourlyChart } from './HourlyChart';
import { ExecutivesTable } from './ExecutivesTable';
import { QueuesTable } from './QueuesTable';
import { DirectionChart } from './DirectionChart';
import { DurationExtremes } from './DurationExtremes';
import { FilterBar, DEFAULT_FILTERS } from './FilterBar';
import type { FilterState } from './FilterBar';
import { QueueKPICards } from './QueueKPICards';
import { QueueBarChart } from './QueueBarChart';
import { QueuePieChart } from './QueuePieChart';
import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import QueueUnattendedHeatmap from './QueueUnattendedHeatmap';
import { QueueLoadVariability } from './QueueLoadVariability';
import { QueueAttendanceEvolution } from './QueueAttendanceEvolution';
import { PhoneOccupancyChart } from './PhoneOccupancyChart';
import { StaffingDemandChart } from './StaffingDemandChart';
import { QueuesDetailTable } from './QueuesDetailTable';
import { ExecutiveKPICards } from './ExecutiveKPICards';
import { ExecutiveBarChart } from './ExecutiveBarChart';
import { ExecutiveScatterChart } from './ExecutiveScatterChart';
import { ExecutiveTalkTimeByHour } from './ExecutiveTalkTimeByHour';
import { ExecutiveTalkTimeByDay } from './ExecutiveTalkTimeByDay';
import { ExecutiveTalkTimeByWeekday } from './ExecutiveTalkTimeByWeekday';
import { ExecutivesDetailTable } from './ExecutivesDetailTable';
import { calculateKPIs } from '../lib/kpi';
import type { CallRecord, CallUpload } from '../lib/supabase';
import { LayoutDashboard, Layers, Users, Target, Activity } from 'lucide-react';
import { AgentConnectivityChart } from './AgentConnectivityChart';
import type { AgentStatusRecord } from '../lib/supabase';

type Tab = 'general' | 'colas' | 'ejecutivos' | 'planificacion' | 'conectividad';

type Props = {
  records: CallRecord[];
  upload: CallUpload;
  agentStatusRecords: AgentStatusRecord[];
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

function applyFilters(records: CallRecord[], filters: FilterState): CallRecord[] {
  const { start, end } = getEffectiveDateRange(filters);

  return records.filter(r => {
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

    return true;
  });
}

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'general', label: 'General', icon: LayoutDashboard },
  { id: 'colas', label: 'Colas', icon: Layers },
  { id: 'ejecutivos', label: 'Ejecutivos', icon: Users },
  { id: 'planificacion', label: 'Planificación', icon: Target },
  { id: 'conectividad', label: 'Conectividad', icon: Activity },
];

export function Dashboard({ records, upload, agentStatusRecords }: Props) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);
  const kpis = useMemo(() => calculateKPIs(filteredRecords), [filteredRecords]);

  const dateRange = formatDateRange(upload.date_range_start, upload.date_range_end);

  return (
    <div className="space-y-6">
      {/* Dataset info bar */}
      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-700">{upload.filename}</p>
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
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        records={records}
        filters={filters}
        onChange={setFilters}
        filteredCount={filteredRecords.length}
      />

      {/* Tab navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 flex gap-1 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'conectividad' && agentStatusRecords.length > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {showBadge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-emerald-400 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {agentStatusRecords.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <KPICards kpis={kpis} />
          <HourlyChart data={kpis.hourlyDistribution} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ExecutivesTable stats={kpis.executiveStats} />
            <QueuesTable stats={kpis.queueStats} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DirectionChart stats={kpis.directionStats} />
            <DurationExtremes kpis={kpis} />
          </div>
        </div>
      )}

      {activeTab === 'colas' && (
        <div className="space-y-6">
          <QueueKPICards stats={kpis.queueStats} totalCalls={kpis.totalCalls} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QueueBarChart stats={kpis.queueStats} />
            <QueuePieChart stats={kpis.queueStats} />
          </div>
          <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
          <QueueAttendanceEvolution data={kpis.queueAttendanceEvolution} />
          <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
          <QueueLoadVariability data={kpis.queueLoadVariability} />
          <QueuesDetailTable stats={kpis.queueStats} />
        </div>
      )}

      {activeTab === 'planificacion' && (
        <div className="space-y-6">
          <div className="bg-sky-50 border border-sky-100 rounded-2xl px-6 py-4 text-sm text-sky-800">
            <p className="font-semibold mb-1">¿Cómo leer esta sección?</p>
            <p className="text-sky-700 text-xs leading-relaxed">
              <strong>Ocupación telefónica</strong>: % del turno que cada ejecutiva pasa en llamadas. El tiempo restante está disponible para atención presencial, correo u otras gestiones.
              <br />
              <strong>Demanda en Erlangs</strong>: cuántas personas necesitas simultáneamente en teléfono a cada hora. Ajusta el número de personas asignadas y verás en qué franjas hay déficit o exceso.
            </p>
          </div>
          <StaffingDemandChart data={kpis.hourlyDemand} />
          <PhoneOccupancyChart data={kpis.executiveOccupancy} />
        </div>
      )}

      {activeTab === 'ejecutivos' && (
        <div className="space-y-6">
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
        </div>
      )}

      {activeTab === 'conectividad' && (
        <div className="space-y-6">
          {agentStatusRecords.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Activity size={28} className="text-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-slate-600">Sin datos de conectividad</p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Carga el reporte "Estado de Agentes" usando el botón <strong>Estado agentes</strong> en la barra superior.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-sky-50 border border-sky-100 rounded-2xl px-6 py-4 text-sm text-sky-800">
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
      )}
    </div>
  );
}
