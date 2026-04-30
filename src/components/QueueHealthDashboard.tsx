import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, Zap, Info } from 'lucide-react';
import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import { QueuesDetailTable } from './QueuesDetailTable';
import type { CallRecord } from '../lib/supabase';
import type { KPI } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  kpis: KPI;
  records: CallRecord[];
};

interface KPICardProps {
  label: string;
  value: string;
  sublabel: string;
  goal?: string;
  icon?: React.ReactNode;
  borderColor?: string;
}

function KPICard({ label, value, sublabel, goal, borderColor = 'border-slate-100' }: KPICardProps) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border ${borderColor}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        </div>
        {goal && <span className="text-xs text-slate-400 font-medium">{goal}</span>}
      </div>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <button className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        </button>
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
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

  const [tooltips, setTooltips] = useState<Record<string, boolean>>({});

  const toggleTooltip = (key: string) => {
    setTooltips(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {/* FILA 1: 4 KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Nivel de Servicio (SL%) */}
          <div className={`bg-white rounded-2xl p-6 shadow-sm border ${serviceLevelPercent >= 80 ? 'border-emerald-100' : 'border-red-100'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${serviceLevelPercent >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {serviceLevelPercent >= 80 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <span className="text-xs text-slate-400 font-medium">{serviceLevelPercent >= 80 ? '≥ 80%' : '< 80%'}</span>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2 relative">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Nivel de Servicio (SL%)</p>
              <button
                onClick={() => toggleTooltip('sl')}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Porcentaje de colas que atienden en menos de 20 segundos"
              >
                <Info size={16} />
              </button>
              {tooltips.sl && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-50 p-2 text-xs text-slate-600 whitespace-nowrap border border-slate-100">
                  Porcentaje de colas &lt; 20s
                </div>
              )}
            </div>
            <p className={`text-2xl font-bold mb-1 ${serviceLevelPercent >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>{Math.round(serviceLevelPercent)}%</p>
            <p className="text-xs text-slate-500">Atendidas &lt; 20s</p>
          </div>

          {/* KPI 2: Tasa de Abandono */}
          <div className={`bg-white rounded-2xl p-6 shadow-sm border ${abandonRate <= 10 ? 'border-emerald-100' : 'border-orange-100'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${abandonRate <= 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                {abandonRate <= 10 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
              </div>
              <span className="text-xs text-slate-400 font-medium">{abandonRate <= 10 ? '≤ 10%' : '> 10%'}</span>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2 relative">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Tasa de Abandono</p>
              <button
                onClick={() => toggleTooltip('abandonment')}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Porcentaje de llamadas no atendidas"
              >
                <Info size={16} />
              </button>
              {tooltips.abandonment && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-50 p-2 text-xs text-slate-600 whitespace-nowrap border border-slate-100">
                  Clientes perdidos %
                </div>
              )}
            </div>
            <p className={`text-2xl font-bold mb-1 ${abandonRate <= 10 ? 'text-emerald-600' : 'text-orange-600'}`}>{Math.round(abandonRate)}%</p>
            <p className="text-xs text-slate-500">Clientes perdidos</p>
          </div>

          {/* KPI 3: ASA (Velocidad de Respuesta) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600">
                <Clock size={20} />
              </div>
              <span className="text-xs text-slate-400 font-medium">Menor es mejor</span>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2 relative">
              <p className="text-xs text-slate-400 uppercase tracking-wide">ASA (Velocidad de Respuesta)</p>
              <button
                onClick={() => toggleTooltip('asa')}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Tiempo promedio de espera en segundos"
              >
                <Info size={16} />
              </button>
              {tooltips.asa && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-50 p-2 text-xs text-slate-600 whitespace-nowrap border border-slate-100">
                  Tiempo promedio espera
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-1">{formatDuration(Math.floor(avgQueueTime))}</p>
            <p className="text-xs text-slate-500">Solo llamadas atendidas</p>
          </div>

          {/* KPI 4: ATA (Paciencia del Cliente) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600">
                <Zap size={20} />
              </div>
              <span className="text-xs text-slate-400 font-medium">Equipo rápido</span>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2 relative">
              <p className="text-xs text-slate-400 uppercase tracking-wide">ATA (Paciencia del Cliente)</p>
              <button
                onClick={() => toggleTooltip('ata')}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Tiempo promedio de abandono en segundos"
              >
                <Info size={16} />
              </button>
              {tooltips.ata && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-50 p-2 text-xs text-slate-600 whitespace-nowrap border border-slate-100">
                  Tiempo promedio abandono
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-emerald-600 mb-1">{formatDuration(Math.floor(avgAbandonTime))}</p>
            <p className="text-xs text-slate-500">Solo llamadas abandonadas</p>
          </div>
        </div>

        {/* FILA 2: Erlang C en ancho completo */}
        <div className="grid grid-cols-1 gap-4">
          <div className={`bg-white rounded-2xl p-6 shadow-sm border ${erlangC <= 0.8 ? 'border-emerald-100' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${erlangC <= 0.8 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                <Zap size={20} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{erlangC <= 0.8 ? '≤ 0.8 ideal' : '> 0.8'}</span>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2 relative">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Erlang C (Carga del Sistema)</p>
              <button
                onClick={() => toggleTooltip('erlang')}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Proporción entre llamadas no atendidas y llamadas totales"
              >
                <Info size={16} />
              </button>
              {tooltips.erlang && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-50 p-2 text-xs text-slate-600 whitespace-nowrap border border-slate-100">
                  Intensidad tráfico
                </div>
              )}
            </div>
            <p className={`text-2xl font-bold mb-1 ${erlangC <= 0.8 ? 'text-emerald-600' : 'text-slate-800'}`}>{erlangC.toFixed(1)}</p>
            <p className="text-xs text-slate-500">Intensidad de tráfico</p>
          </div>
        </div>
      </div>

      {/* FILA 2: Análisis Dual (Embudo + Fugas) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800">Embudo Completo de Llamadas</h3>
          <p className="text-sm text-slate-400 mt-1">Flujo desde 100% de llamadas entrantes hasta atendidas</p>
        </div>
        <div className="h-80 mb-8">
          {funnelStages.entrantes > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelChartData} margin={{ top: 10, right: 10, bottom: 50, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#666' }}
                  axisLine={true}
                  stroke="#666"
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis stroke="#666" tick={{ fontSize: 11, fill: '#666' }} axisLine={true} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ fontFamily: 'monospace' }}
                  formatter={(value: number) => value.toLocaleString('es-CL')}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">Sin datos de llamadas entrantes</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Llamadas Entrantes</p>
              <p className="text-3xl font-bold text-blue-600">{funnelStages.entrantes.toLocaleString('es-CL')}</p>
              <p className="text-xs text-slate-500 mt-2">100% (Base del Embudo)</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Atendidas</p>
              <p className="text-3xl font-bold text-green-600">{funnelStages.atendidas.toLocaleString('es-CL')}</p>
              <p className="text-xs text-slate-500 mt-2">{funnelStages.entrantes > 0 ? Math.round((funnelStages.atendidas / funnelStages.entrantes) * 100) : 0}% de entrantes</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Fuga IVR</p>
              <p className="text-2xl font-bold text-purple-600">{funnelStages.ivr - funnelStages.cola - funnelStages.corto}</p>
              <p className="text-xs text-slate-500 mt-1">{funnelStages.entrantes > 0 ? Math.round(((funnelStages.ivr - funnelStages.cola - funnelStages.corto) / funnelStages.entrantes) * 100) : 0}% de entrantes</p>
              <p className="text-xs text-slate-400 mt-1">Menú/Sistema</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Abandono Corto</p>
              <p className="text-2xl font-bold text-yellow-600">{funnelStages.corto.toLocaleString('es-CL')}</p>
              <p className="text-xs text-slate-500 mt-1">{funnelStages.entrantes > 0 ? Math.round((funnelStages.corto / funnelStages.entrantes) * 100) : 0}% de entrantes</p>
              <p className="text-xs text-slate-400 mt-1">&lt;5 segundos</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Fuga Cola</p>
              <p className="text-2xl font-bold text-orange-600">{funnelStages.cola.toLocaleString('es-CL')}</p>
              <p className="text-xs text-slate-500 mt-1">{funnelStages.entrantes > 0 ? Math.round((funnelStages.cola / funnelStages.entrantes) * 100) : 0}% de entrantes</p>
              <p className="text-xs text-slate-400 mt-1">Espera excesiva</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Abandono tras Rebote</p>
              <p className="text-2xl font-bold text-red-600">{funnelStages.rebote.toLocaleString('es-CL')}</p>
              <p className="text-xs text-slate-500 mt-1">{funnelStages.entrantes > 0 ? Math.round((funnelStages.rebote / funnelStages.entrantes) * 100) : 0}% de entrantes</p>
              <p className="text-xs text-slate-400 mt-1">Tras devolución de agente</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-2">Verificación de Coherencia:</p>
            <p className="text-xs text-slate-500">
              {(funnelStages.corto + funnelStages.cola + funnelStages.rebote + funnelStages.atendidas).toLocaleString('es-CL')} + {funnelStages.atendidas.toLocaleString('es-CL')} = {funnelStages.entrantes.toLocaleString('es-CL')}
              <span className="text-green-600 font-medium"> ✓ Correcto</span>
            </p>
          </div>
        </div>
      </div>

      {/* FILA 3: Análisis de Fugas */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700">📊 Análisis de Fugas: Espera tras Asignación</h3>
          <p className="text-xs text-slate-400 mt-0.5">Llamadas asignadas a agente pero no atendidas - Zona de recuperación (&lt;60s): {recuperable} llamadas</p>
        </div>
        <div className="h-80 mb-6" style={{ height: '280px' }}>
          {totalUnattended > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leakageData} margin={{ top: 10, right: 10, bottom: 50, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ fontFamily: 'monospace' }}
                  formatter={(value: number) => value.toLocaleString('es-CL')}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {leakageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">Sin datos</div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          <div className="text-center bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold">✓ SL Cumplido</p>
            <p className="text-2xl font-bold text-emerald-600 font-mono">{totalUnattended > 0 ? Math.round((slCumplido / totalUnattended) * 100) : 0}%</p>
            <p className="text-xs text-slate-500 mt-1">≤20 segundos</p>
          </div>
          <div className="text-center bg-amber-50 rounded-lg p-3 border-2 border-amber-200">
            <p className="text-xs text-slate-400 font-semibold">⚠ Recuperable</p>
            <p className="text-2xl font-bold text-amber-600 font-mono">{totalUnattended > 0 ? Math.round((recuperable / totalUnattended) * 100) : 0}%</p>
            <p className="text-xs text-slate-500 mt-1">20-60 seg</p>
          </div>
          <div className="text-center bg-red-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold">✗ Perdido</p>
            <p className="text-2xl font-bold text-red-600 font-mono">{totalUnattended > 0 ? Math.round((perdido / totalUnattended) * 100) : 0}%</p>
            <p className="text-xs text-slate-500 mt-1">&gt;60 segundos</p>
          </div>
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold">📊 Potencial</p>
            <p className="text-2xl font-bold text-blue-600 font-mono">{totalUnattended > 0 ? Math.round((recuperable / totalUnattended) * 100) : 0}%</p>
            <p className="text-xs text-slate-500 mt-1">{totalUnattended} llamadas</p>
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
