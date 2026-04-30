import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell
} from 'recharts';
import { TrendingUp, Zap, Target } from 'lucide-react';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';

type Props = {
  stats: QueueStat[];
  records: CallRecord[];
};

export function QueuesDashboard({ stats, records }: Props) {
  // Scatter Plot: Volumen (X) vs ASA (Y)
  const scatterData = stats.map(q => ({
    queue: q.queue,
    volume: q.count,
    asa: q.avgQueueTimeSeconds,
    serviceLevel: 0, // placeholder
  }));

  // Calcular Service Level para cada cola
  for (const q of stats) {
    const queueRecords = records.filter(r => r.queue === q.queue);
    const attendedInTime = queueRecords.filter(r => r.attended && (r.queue_time_seconds ?? 0) <= 20).length;
    const sl = queueRecords.length > 0 ? Math.round((attendedInTime / queueRecords.length) * 100) : 0;
    const scatterItem = scatterData.find(s => s.queue === q.queue);
    if (scatterItem) scatterItem.serviceLevel = sl;
  }

  // Ranking de Service Level
  const serviceLevelRanking = stats.map(q => {
    const queueRecords = records.filter(r => r.queue === q.queue);
    const attendedInTime = queueRecords.filter(r => r.attended && (r.queue_time_seconds ?? 0) <= 20).length;
    const sl = queueRecords.length > 0 ? Math.round((attendedInTime / queueRecords.length) * 100) : 0;
    return {
      queue: q.queue,
      volume: q.count,
      serviceLevel: sl,
      asa: formatDuration(q.avgQueueTimeSeconds),
      asaSeconds: q.avgQueueTimeSeconds,
    };
  }).sort((a, b) => b.serviceLevel - a.serviceLevel);

  // Heatmap de Saturación (por cola)
  const saturationData = stats.map(q => {
    const unattendedRate = q.count > 0 ? Math.round((q.unattendedCount / q.count) * 100) : 0;
    return {
      queue: q.queue,
      volumen: q.count,
      noAtendido: unattendedRate,
      ata: q.avgAlertTimeSeconds,
      bounceRate: q.bounceRate,
    };
  }).sort((a, b) => b.volumen - a.volumen);

  // Colors for Service Level
  const getServiceLevelColor = (sl: number): string => {
    if (sl >= 80) return '#10b981'; // green
    if (sl >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  // Custom Tooltip para Scatter
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100 z-50">
          <p className="text-sm font-semibold text-slate-800">{data.queue}</p>
          <p className="text-xs text-slate-600">Volumen: {data.volume.toLocaleString('es-CL')}</p>
          <p className="text-xs text-slate-600">ASA: {formatDuration(data.asa)}</p>
          <p className="text-xs text-slate-600">Service Level: {data.serviceLevel}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Scatter Plot: Volumen vs ASA */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <TrendingUp size={18} className="text-sky-600" />
            Eficiencia de Colas: Volumen vs Tiempo de Espera
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Cada punto representa una cola. Colas con bajo ASA y alto volumen son más eficientes.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="volume"
              label={{ value: 'Volumen de Llamadas', position: 'insideBottomRight', offset: -5, fontSize: 12 }}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="asa"
              label={{ value: 'ASA (segundos)', angle: -90, position: 'insideLeft', fontSize: 12 }}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomScatterTooltip />} />
            <Scatter
              name="Colas"
              data={scatterData}
              fill="#0ea5e9"
              shape="circle"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking de Service Level */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Target size={18} className="text-emerald-600" />
            Ranking de Service Level
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            % de llamadas atendidas dentro de 20 segundos, ordenadas de mejor a peor desempeño.
          </p>
        </div>
        <div className="space-y-2">
          {serviceLevelRanking.map((item, idx) => (
            <div key={item.queue} className="flex items-center gap-4">
              <div className="w-6 text-center">
                <span className="text-sm font-bold text-slate-400">#{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate">{item.queue}</span>
                  <span className="text-xs text-slate-500">{item.volume.toLocaleString('es-CL')} llamadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: item.serviceLevel + '%',
                        backgroundColor: getServiceLevelColor(item.serviceLevel),
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold min-w-12 text-right" style={{ color: getServiceLevelColor(item.serviceLevel) }}>
                    {item.serviceLevel}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap de Saturación */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Zap size={18} className="text-orange-600" />
            Saturación de Colas
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Comparativa de volumen vs. tasa de abandono y otras métricas críticas.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={saturationData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="queue"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Métricas (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => value.toLocaleString('es-CL')}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
            />
            <Legend />
            <Bar dataKey="noAtendido" fill="#ef4444" name="% No Atendido" />
            <Bar dataKey="bounceRate" fill="#f59e0b" name="% Rebote" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla Comparativa */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Tabla Comparativa de Colas</h3>
          <p className="text-xs text-slate-400 mt-0.5">Resumen de métricas clave por cola</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-4 py-3 text-left font-mono text-xs">Cola</th>
                <th className="px-4 py-3 text-right font-mono text-xs">Volumen</th>
                <th className="px-4 py-3 text-right font-mono text-xs">ASA</th>
                <th className="px-4 py-3 text-right font-mono text-xs">% SL</th>
                <th className="px-4 py-3 text-right font-mono text-xs">% No Atendido</th>
                <th className="px-4 py-3 text-right font-mono text-xs">% Rebote</th>
                <th className="px-4 py-3 text-right font-mono text-xs">ATA</th>
              </tr>
            </thead>
            <tbody>
              {saturationData.map((row) => {
                const statItem = stats.find(s => s.queue === row.queue);
                if (!statItem) return null;
                return (
                  <tr key={row.queue} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.queue}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.volumen.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">{statItem.avgQueueTimeSeconds}s</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="inline-block px-2 py-1 rounded font-semibold text-xs text-white"
                        style={{ backgroundColor: getServiceLevelColor(serviceLevelRanking.find(s => s.queue === row.queue)?.serviceLevel ?? 0) }}
                      >
                        {serviceLevelRanking.find(s => s.queue === row.queue)?.serviceLevel ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">{row.noAtendido}%</td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">{row.bounceRate}%</td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">{statItem.avgAlertTimeSeconds}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
