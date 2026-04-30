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

export function QueueHealthDashboard({ kpis, records }: Props) {
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

  const erlangC = kpis.queueStats.length > 0 ? (totalAbandons / kpis.totalCalls) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">ASA</p>
          <p className="text-3xl font-bold text-slate-800">{formatDuration(avgQueueTime)}</p>
          <p className="text-xs text-slate-500 mt-2">Tiempo promedio en espera</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Tiempo Promedio de Abandono</p>
          <p className="text-3xl font-bold text-red-600">{formatDuration(avgAbandonTime)}</p>
          <p className="text-xs text-slate-500 mt-2">ATA</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">AHT</p>
          <p className="text-3xl font-bold text-slate-800">{formatDuration(avgHandleTime)}</p>
          <p className="text-xs text-slate-500 mt-2">Tiempo promedio de conversación</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Erlang C</p>
          <p className="text-3xl font-bold text-amber-600">{erlangC.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-2">Brecha de staff</p>
        </div>
      </div>

      <AbandonClassificationChart records={records} />
      <QueueWaitDistribution records={records} />
      <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
      <QueueAttendanceEvolution data={kpis.queueAttendanceEvolution} />
      <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
      <QueueLoadVariability data={kpis.queueLoadVariability} />

      <div className="border-t border-slate-200 pt-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-6">Tabla de Rendimiento de Colas</h3>
        <QueuesDetailTable stats={kpis.queueStats} />
      </div>
    </div>
  );
}
