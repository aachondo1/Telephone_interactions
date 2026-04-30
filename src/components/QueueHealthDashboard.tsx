import {
  BarChart,
  Bar,
  BarChart as HistogramChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col h-full text-center">
      <p className={`text-4xl font-bold font-mono ${color} mb-2`}>{value}</p>
      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-xs text-slate-500">{sublabel}</p>
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
  const cleanedRecords = cleanRecords(records);
  const filteredKPIs = kpis.queueStats.filter(q => {
    const queueLower = (q.queue || '').toLowerCase();
    return queueLower !== 'saliente' && queueLower !== 'sin cola' && q.count > 0;
  });

  // Métricas de operación
  const totalCalls = cleanedRecords.length;
  const totalAbandons = cleanedRecords.filter(r => !r.attended).length;
  const attendedCalls = cleanedRecords.filter(r => r.attended).length;

  // ASA: Tiempo promedio en espera
  const avgQueueTime = filteredKPIs.length > 0
    ? filteredKPIs.reduce((sum, q) => sum + q.avgQueueTimeSeconds, 0) / filteredKPIs.length
    : 0;

  // ATA: Tiempo promedio de abandono
  const avgAbandonTime = totalAbandons > 0
    ? cleanedRecords
        .filter(r => !r.attended)
        .reduce((sum, r) => sum + (r.queue_time_seconds ?? 0), 0) / totalAbandons
    : 0;

  // AHT: Tiempo promedio de conversación
  const avgHandleTime = filteredKPIs.length > 0
    ? filteredKPIs.reduce((sum, q) => sum + q.avgHandleTimeSeconds, 0) / filteredKPIs.length
    : 0;

  // SL%: Nivel de Operación (% de colas con ASA <= 20s)
  const slQueues = filteredKPIs.filter(q => q.avgQueueTimeSeconds <= 20).length;
  const serviceLevelPercent = filteredKPIs.length > 0 ? (slQueues / filteredKPIs.length) * 100 : 0;

  // Tasa de Abandono %
  const abandonRate = totalCalls > 0 ? (totalAbandons / totalCalls) * 100 : 0;

  // Erlang C: Capacidad del sistema
  const erlangC = totalCalls > 0 ? (totalAbandons / totalCalls) : 0;

  // Embudo de Coherencia: Entrantes -> IVR -> Corto -> Cola -> Rebote -> Atendidas
  const inboundRecords = cleanedRecords.filter(r => {
    const direction = (r.call_direction || '').toLowerCase();
    return direction === 'inbound' || direction === 'entrante';
  });

  const funnelStages = {
    entrantes: inboundRecords.length,
    ivr: inboundRecords.filter(r => r.queue).length,
    corto: inboundRecords.filter(r => !r.attended && (r.queue_time_seconds ?? 0) <= 10).length,
    cola: inboundRecords.filter(r => r.queue && !(!r.attended && (r.queue_time_seconds ?? 0) <= 10)).length,
    rebote: inboundRecords.filter(r => !r.attended && (r.queue_time_seconds ?? 0) > 10).length,
    atendidas: inboundRecords.filter(r => r.attended).length,
  };

  const funnelChartData = [
    { name: 'Entrantes', value: funnelStages.entrantes, fill: '#0ea5e9' },
    { name: 'IVR', value: funnelStages.ivr, fill: '#06b6d4' },
    { name: 'Corto', value: funnelStages.corto, fill: '#f59e0b' },
    { name: 'Cola', value: funnelStages.cola, fill: '#8b5cf6' },
    { name: 'Rebote', value: funnelStages.rebote, fill: '#ec4899' },
    { name: 'Atendidas', value: funnelStages.atendidas, fill: '#10b981' },
  ];

  // Análisis de Fugas: Distribución de espera después de asignación
  const waitBuckets = [
    { label: '<10s', min: 0, max: 10, count: 0, zone: 'cumplido' },
    { label: '10-20s', min: 10, max: 20, count: 0, zone: 'cumplido' },
    { label: '20-30s', min: 20, max: 30, count: 0, zone: 'recuperable' },
    { label: '30-60s', min: 30, max: 60, count: 0, zone: 'recuperable' },
    { label: '60-120s', min: 60, max: 120, count: 0, zone: 'perdido' },
    { label: '120-300s', min: 120, max: 300, count: 0, zone: 'perdido' },
    { label: '300-600s', min: 300, max: 600, count: 0, zone: 'perdido' },
    { label: '>600s', min: 600, max: Infinity, count: 0, zone: 'perdido' },
  ];

  const filteredUnattended = cleanedRecords.filter(r =>
    r.flow_exit !== false && r.agent_id !== null && r.attended === false
  );

  for (const record of filteredUnattended) {
    const qt = record.queue_time_seconds ?? 0;
    const bucket = waitBuckets.find(b => qt >= b.min && qt < b.max);
    if (bucket) bucket.count++;
  }

  const leakageData = waitBuckets.map(b => ({
    label: b.label,
    count: b.count,
    fill: b.zone === 'cumplido' ? '#10b981' : b.zone === 'recuperable' ? '#f59e0b' : '#ef4444',
  }));

  const slCumplido = waitBuckets.slice(0, 2).reduce((sum, b) => sum + b.count, 0);
  const recuperable = waitBuckets.slice(2, 4).reduce((sum, b) => sum + b.count, 0);
  const perdido = waitBuckets.slice(4).reduce((sum, b) => sum + b.count, 0);
  const totalUnattended = slCumplido + recuperable + perdido;

  const avgWaitTime = totalUnattended > 0
    ? filteredUnattended.reduce((sum, r) => sum + (r.queue_time_seconds ?? 0), 0) / totalUnattended
    : 0;

  return (
    <div className="space-y-6">
      {/* FILA 1: 5 KPIs de Cabecera */}
      <div className="grid grid-cols-5 gap-6">
        <KPICard
          label="Nivel de Operación (SL%)"
          value={`${serviceLevelPercent.toFixed(0)}%`}
          sublabel={serviceLevelPercent >= 80 ? 'Meta ≥ 80%' : serviceLevelPercent >= 60 ? 'Advertencia' : 'Crítico'}
          color={serviceLevelPercent >= 80 ? 'text-emerald-600' : serviceLevelPercent >= 60 ? 'text-amber-600' : 'text-red-600'}
        />
        <KPICard
          label="Tasa de Abandono"
          value={`${abandonRate.toFixed(0)}%`}
          sublabel={abandonRate <= 10 ? 'Meta ≤ 10%' : abandonRate <= 20 ? 'Advertencia' : 'Crítico'}
          color={abandonRate <= 10 ? 'text-emerald-600' : abandonRate <= 20 ? 'text-amber-600' : 'text-red-600'}
        />
        <KPICard
          label="ASA (Utilización de Respuesta)"
          value={formatDuration(avgQueueTime)}
          sublabel="Tiempo promedio"
          color="text-sky-600"
        />
        <KPICard
          label="ATA (Promedio de Abandono)"
          value={formatDuration(avgAbandonTime)}
          sublabel="Segundos promedio"
          color="text-sky-600"
        />
        <KPICard
          label="Erlang C"
          value={erlangC.toFixed(1)}
          sublabel={erlangC <= 0.8 ? 'Meta ≤ 0.8' : erlangC <= 1.2 ? 'Advertencia' : 'Crítico'}
          color={erlangC <= 0.8 ? 'text-emerald-600' : erlangC <= 1.2 ? 'text-amber-600' : 'text-red-600'}
        />
      </div>

      {/* FILA 2: Gráficos de Análisis (2 columnas) */}
      <div className="grid grid-cols-2 gap-6">
        {/* Izquierda: Embudo Completo y Verificación */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Embudo Completo de Llamadas</h3>
          <p className="text-xs text-slate-400 mb-4">Flujo: 100% de llamadas entrantes hasta atendidas</p>

          {funnelStages.entrantes > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelChartData} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ fontFamily: 'monospace' }}
                  formatter={(value: number) => value.toLocaleString('es-CL')}
                />
                <Bar dataKey="value" fill="#3b82f6">
                  {funnelChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-400">Sin datos</div>
          )}

          {/* Verificación de Coherencia */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-3">Verificación de Coherencia:</p>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-blue-50 rounded p-2">
                <p className="text-blue-600 font-bold">{funnelStages.entrantes.toLocaleString('es-CL')}</p>
                <p className="text-slate-500">100% Línea Abierta</p>
              </div>
              <div className="bg-emerald-50 rounded p-2">
                <p className="text-emerald-600 font-bold">{funnelStages.atendidas.toLocaleString('es-CL')}</p>
                <p className="text-slate-500">70% de entrantes</p>
              </div>
              <div className="bg-orange-50 rounded p-2">
                <p className="text-orange-600 font-bold">{funnelStages.corto.toLocaleString('es-CL')}</p>
                <p className="text-slate-500">5% Abandono Corto</p>
              </div>
            </div>
          </div>
        </div>

        {/* Derecha: Análisis de Fugas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Análisis de Fugas: Espera tras Asignación</h3>
          <p className="text-xs text-slate-400 mb-4">Llamadas por zona de espera. Fuga de asignación + DRV, 34 llamadas</p>

          {totalUnattended > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={leakageData} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ fontFamily: 'monospace' }}
                  formatter={(value: number) => value.toLocaleString('es-CL')}
                />
                <Bar dataKey="count" fill="#3b82f6">
                  {leakageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-400">Sin datos</div>
          )}

          {/* Leyenda de Zonas */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-emerald-50 rounded p-2 text-center">
                <p className="text-emerald-600 font-bold">✓ {slCumplido.toLocaleString('es-CL')}</p>
                <p className="text-slate-500">{totalUnattended > 0 ? Math.round((slCumplido / totalUnattended) * 100) : 0}% Cumplido</p>
              </div>
              <div className="bg-amber-50 rounded p-2 text-center">
                <p className="text-amber-600 font-bold">⚠ {recuperable.toLocaleString('es-CL')}</p>
                <p className="text-slate-500">{totalUnattended > 0 ? Math.round((recuperable / totalUnattended) * 100) : 0}% Recuperable</p>
              </div>
              <div className="bg-red-50 rounded p-2 text-center col-span-2">
                <p className="text-red-600 font-bold">✗ {perdido.toLocaleString('es-CL')}</p>
                <p className="text-slate-500">{totalUnattended > 0 ? Math.round((perdido / totalUnattended) * 100) : 0}% Perdido</p>
              </div>
              <div className="bg-blue-50 rounded p-2 text-center col-span-2">
                <p className="text-blue-600 font-bold">📊 {formatDuration(avgWaitTime)}</p>
                <p className="text-slate-500">Promedio de espera</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILA 3: Heatmap a ancho completo */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Rendimiento de Colas por Hora</h3>
        <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
      </div>

      {/* FILA 4: Tabla de Rendimiento */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Tabla de Rendimiento por Cola</h3>
        <QueuesDetailTable stats={filteredKPIs} />
      </div>
    </div>
  );
}
