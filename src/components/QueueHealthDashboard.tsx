import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  FunnelChart,
  Funnel,
  Cell,
} from 'recharts';
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

function KPIGroup({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: number }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-1">{title}</h4>
      <div className={`grid gap-8 ${cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
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

function getInboundRecords(records: CallRecord[]): CallRecord[] {
  return records.filter(r => {
    const direction = (r.call_direction || '').toLowerCase();
    return direction === 'inbound' || direction === 'entrante';
  });
}

export function QueueHealthDashboard({ kpis, records }: Props) {
  // Filtrar registros ruidosos (Saliente, Sin cola)
  const cleanedRecords = cleanRecords(records);
  const inboundRecords = getInboundRecords(cleanedRecords);
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

  // Calcular Service Level (% de colas con tiempo de espera <= 20s)
  const slQueues = filteredKPIs.filter(q => q.avgQueueTimeSeconds <= 20).length;
  const serviceLevel = filteredKPIs.length > 0 ? (slQueues / filteredKPIs.length) * 100 : 0;

  // Calcular Erlang C (capacidad de manejo del sistema)
  const erlangC = totalCalls > 0 ? (totalAbandons / totalCalls) * 100 : 0;

  // Construir datos del embudo de coherencia
  const totalInbound = inboundRecords.length;
  const postIvr = inboundRecords.filter(r => r.queue).length;
  const shortAbandons = inboundRecords.filter(r => !r.attended && (r.queue_time_seconds ?? 0) <= 10).length;
  const postQueue = postIvr - shortAbandons;
  const postBounce = inboundRecords.filter(r => r.attended).length;
  const handled = inboundRecords.filter(r => r.attended).length;

  const funnelData = [
    { name: 'Entrantes', value: totalInbound, fill: '#0ea5e9' },
    { name: 'Post IVR', value: postIvr, fill: '#06b6d4' },
    { name: 'Abandono Corto', value: shortAbandons, fill: '#f59e0b' },
    { name: 'Post Cola', value: postQueue, fill: '#8b5cf6' },
    { name: 'Post Rebote', value: Math.max(postQueue - (totalInbound - postBounce), 0), fill: '#ec4899' },
    { name: 'Atendidas', value: handled, fill: '#10b981' },
  ];

  // Verificación de coherencia del embudo
  if (process.env.NODE_ENV !== 'production') {
    console.log('Coherence Funnel Verification:', {
      totalInbound,
      stages: {
        postIvr,
        shortAbandons,
        postQueue,
        postBounce,
        handled,
      },
      match: totalInbound === postIvr ? '✓ Coherent' : '✗ Mismatch',
    });
  }

  return (
    <div className="space-y-8">
      {/* FILA 1: KPIs Diagnósticos de Servicio */}
      <KPIGroup title="Métricas Clave de Servicio" cols={3}>
        <KPICard
          label="Service Level"
          value={`${serviceLevel.toFixed(1)}%`}
          sublabel={serviceLevel >= 80 ? 'Meta alcanzada' : serviceLevel >= 60 ? 'Requiere atención' : 'Crítico'}
          color={serviceLevel >= 80 ? 'text-emerald-600' : serviceLevel >= 60 ? 'text-amber-600' : 'text-red-600'}
        />
        <KPICard
          label="% Abandono"
          value={`${abandonRate.toFixed(1)}%`}
          sublabel={abandonRate > 5 ? 'Nivel crítico' : abandonRate > 2 ? 'Requiere atención' : 'Dentro de meta'}
          color={abandonRate > 5 ? 'text-red-600' : abandonRate > 2 ? 'text-amber-600' : 'text-emerald-600'}
        />
        <KPICard
          label="Erlang C"
          value={`${erlangC.toFixed(1)}%`}
          sublabel="Capacidad del sistema"
          color={erlangC > 50 ? 'text-red-600' : erlangC > 25 ? 'text-amber-600' : 'text-emerald-600'}
        />
      </KPIGroup>

      {/* FILA 2: KPIs de Tiempos */}
      <KPIGroup title="Tiempos de Atención" cols={3}>
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
      </KPIGroup>

      {/* FILA 3: Embudo de Coherencia y Distribución de Espera */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Embudo de Coherencia</h3>
            <p className="text-xs text-slate-400 mt-0.5">Flujo de llamadas entrantes</p>
          </div>
          {totalInbound > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <FunnelChart margin={{ top: 20, right: 160, bottom: 20, left: 0 }}>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => value.toLocaleString('es-CL')}
                />
                <Funnel dataKey="value" data={funnelData}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Sin datos de llamadas entrantes
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <QueueWaitDistribution records={cleanedRecords} />
        </div>
      </div>

      {/* FILA 4: Análisis de Abandonos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <AbandonClassificationChart records={cleanedRecords} />
      </div>

      {/* FILA 5: Análisis Temporal Dual */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Rendimiento por Hora</h3>
          <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Evolución de Atención</h3>
          <QueueAttendanceEvolution data={kpis.queueAttendanceEvolution} />
        </div>
      </div>

      {/* FILA 6: Análisis Complementario */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Distribución de No Atendidas</h3>
          <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-6">Variabilidad de Carga</h3>
          <QueueLoadVariability data={kpis.queueLoadVariability} />
        </div>
      </div>

      {/* FILA 7: Tabla Maestra de Rendimiento */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">Rendimiento de Colas</h3>
        <QueuesDetailTable stats={filteredKPIs} />
      </div>
    </div>
  );
}
