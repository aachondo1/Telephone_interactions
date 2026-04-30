import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import QueueUnattendedHeatmap from './QueueUnattendedHeatmap';
import { QueueLoadVariability } from './QueueLoadVariability';
import { QueueAttendanceEvolution } from './QueueAttendanceEvolution';
import { AbandonClassificationChart } from './AbandonClassificationChart';
import { QueueWaitDistribution } from './QueueWaitDistribution';
import { QueuesDetailTable } from './QueuesDetailTable';
import type { CallRecord } from '../lib/supabase';
import type { KPI, QueueStat } from '../lib/kpi';
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

function KPIGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-1">{title}</h4>
      <div className="grid grid-cols-2 gap-8">
        {children}
      </div>
    </div>
  );
}

function cleanRecords(records: CallRecord[]): CallRecord[] {
  return records.filter(r => {
    const queue = (r.queue || '').toLowerCase();
    return queue !== 'saliente' && queue !== 'sin cola' && r.queue;
  });
}

export function QueueHealthDashboard({ kpis, records }: Props) {
  // Filtrar registros ruidosos (Saliente, Sin cola)
  const cleanedRecords = cleanRecords(records);
  const filteredKPIs = kpis.queueStats.filter(q => {
    const queueLower = (q.queue || '').toLowerCase();
    return queueLower !== 'saliente' && queueLower !== 'sin cola' && q.count > 0;
  });

  // Calcular métricas operacionales con datos limpios
  const avgQueueTime = filteredKPIs.length > 0
    ? filteredKPIs.reduce((sum, q) => sum + q.avgQueueTimeSeconds, 0) / filteredKPIs.length
    : 0;

  const avgHandleTime = filteredKPIs.length > 0
    ? filteredKPIs.reduce((sum, q) => sum + q.avgHandleTimeSeconds, 0) / filteredKPIs.length
    : 0;

  const totalAbandons = cleanedRecords.filter(r => !r.attended).length;
  const avgAbandonTime = totalAbandons > 0
    ? cleanedRecords
        .filter(r => !r.attended)
        .reduce((sum, r) => sum + (r.queue_time_seconds ?? 0), 0) / totalAbandons
    : 0;

  const totalCalls = cleanedRecords.length;
  const abandonRate = totalCalls > 0 ? (totalAbandons / totalCalls) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* FILA SUPERIOR: KPIs Operacionales Agrupados */}
      <div className="space-y-8">
        <KPIGroup title="Grupo de Atención">
          <KPICard
            label="ASA"
            value={formatDuration(avgQueueTime)}
            sublabel="Tiempo promedio en espera"
            color="text-sky-600"
          />
          <KPICard
            label="AHT"
            value={formatDuration(avgHandleTime)}
            sublabel="Tiempo promedio de conversación"
            color="text-emerald-600"
          />
        </KPIGroup>

        <KPIGroup title="Grupo de Pérdida">
          <KPICard
            label="ATA"
            value={formatDuration(avgAbandonTime)}
            sublabel="Tiempo promedio de abandono"
            color="text-red-600"
          />
          <KPICard
            label="% Abandono"
            value={`${abandonRate.toFixed(1)}%`}
            sublabel={abandonRate > 5 ? 'Nivel crítico' : abandonRate > 2 ? 'Requiere atención' : 'Dentro de meta'}
            color={abandonRate > 5 ? 'text-red-600' : abandonRate > 2 ? 'text-amber-600' : 'text-emerald-600'}
          />
        </KPIGroup>
      </div>

      {/* BLOQUE MEDIO: Análisis de Abandonos */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <AbandonClassificationChart records={cleanedRecords} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <QueueWaitDistribution records={cleanedRecords} />
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
            <h3 className="text-sm font-semibold text-slate-700 mb-6">Distribución de No Atendidas</h3>
            <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Variabilidad de Carga</h3>
          <QueueLoadVariability data={kpis.queueLoadVariability} />
        </div>
      </div>

      {/* PIE DE PÁGINA: Tabla Maestra Optimizada */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">Rendimiento de Colas</h3>
        <QueuesDetailTable stats={filteredKPIs} />
      </div>
    </div>
  );
}
