import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import QueueUnattendedHeatmap from './QueueUnattendedHeatmap';
import { QueueLoadVariability } from './QueueLoadVariability';
import { QueueAttendanceEvolution } from './QueueAttendanceEvolution';
import { AbandonClassificationChart } from './AbandonClassificationChart';
import { QueueWaitDistribution } from './QueueWaitDistribution';
import { QueuesDetailTable } from './QueuesDetailTable';
import type { CallRecord } from '../lib/supabase';
import type { KPI } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  kpis: KPI;
  records: CallRecord[];
};

function KPICard({ label, value, sublabel, color = 'text-slate-800' }: { label: string; value: string; sublabel: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">{label}</p>
      <p className={`text-3xl font-bold font-mono ${color} mb-2`}>{value}</p>
      <p className="text-xs text-slate-500 mt-auto">{sublabel}</p>
    </div>
  );
}

export function QueueHealthDashboard({ kpis, records }: Props) {
  // Calcular métricas operacionales
  const avgQueueTime = kpis.queueStats.length > 0
    ? kpis.queueStats.reduce((sum, q) => sum + q.avgQueueTimeSeconds, 0) / kpis.queueStats.length
    : 0;

  const avgHandleTime = kpis.queueStats.length > 0
    ? kpis.queueStats.reduce((sum, q) => sum + q.avgHandleTimeSeconds, 0) / kpis.queueStats.length
    : 0;

  const totalAbandons = records.filter(r => !r.attended).length;
  const avgAbandonTime = totalAbandons > 0
    ? records
        .filter(r => !r.attended)
        .reduce((sum, r) => sum + (r.queue_time_seconds ?? 0), 0) / totalAbandons
    : 0;

  const staffingGap = kpis.totalCalls > 0 ? (totalAbandons / kpis.totalCalls) * 100 : 0;
  const staffingStatus = staffingGap > 5 ? 'text-red-600' : staffingGap > 2 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="space-y-8">
      {/* FILA SUPERIOR: KPIs Operacionales */}
      <div className="grid grid-cols-4 gap-8">
        <KPICard
          label="ASA"
          value={formatDuration(avgQueueTime)}
          sublabel="Tiempo promedio en espera"
          color="text-sky-600"
        />
        <KPICard
          label="ATA"
          value={formatDuration(avgAbandonTime)}
          sublabel="Tiempo promedio de abandono"
          color="text-red-600"
        />
        <KPICard
          label="AHT"
          value={formatDuration(avgHandleTime)}
          sublabel="Tiempo promedio de conversación"
          color="text-emerald-600"
        />
        <KPICard
          label="Staffing Gap"
          value={`${staffingGap.toFixed(1)}%`}
          sublabel={staffingGap > 5 ? 'Falta staff' : 'Baja adherencia'}
          color={staffingStatus}
        />
      </div>

      {/* BLOQUE MEDIO: Análisis de Abandonos */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <AbandonClassificationChart records={records} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <QueueWaitDistribution records={records} />
        </div>
      </div>

      {/* BLOQUE INFERIOR: Tendencias y Heatmaps */}
      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Rendimiento por Hora</h3>
          <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-6">Evolución de Atención</h3>
            <QueueAttendanceEvolution data={kpis.queueAttendanceEvolution} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-6">Distribucion de No Atendidas</h3>
            <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Variabilidad de Carga</h3>
          <QueueLoadVariability data={kpis.queueLoadVariability} />
        </div>
      </div>

      {/* PIE DE PÁGINA: Tabla Maestra */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">Tabla de Rendimiento de Colas</h3>
        <QueuesDetailTable stats={kpis.queueStats} />
      </div>
    </div>
  );
}
