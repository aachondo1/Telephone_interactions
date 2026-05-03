import { useMemo } from 'react';
import type { CallRecord } from '../lib/supabase';
import {
  calculateQueueHealthMetrics,
  calculateAbandonFunnel,
  calculateOperationalKPIs,
} from '../lib/kpi';
import { QueueHealthMetricsCards } from './QueueHealthMetricsCards';
import { AbandonFunnelChart } from './AbandonFunnelChart';
import { AbandonTimeThresholds } from './AbandonTimeThresholds';
import { QueueWaitDistribution } from './QueueWaitDistribution';
import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import { calculateQueuePerformanceHeatmap } from '../lib/kpi';
import { Tooltip } from './Tooltip';

type Props = {
  records: CallRecord[];
};

export function QueueHealthDashboard({ records }: Props) {
  const metrics = useMemo(() => calculateQueueHealthMetrics(records), [records]);
  const funnelData = useMemo(() => calculateAbandonFunnel(records), [records]);
  const operationalKPIs = useMemo(() => calculateOperationalKPIs(records), [records]);
  const heatmapData = useMemo(() => calculateQueuePerformanceHeatmap(records), [records]);

  return (
    <div className="space-y-8">
      {/* Metrics Cards: 2 rows x 4 columns */}
      <QueueHealthMetricsCards metrics={metrics} operationalKPIs={operationalKPIs} />

      {/* Abandon Funnel */}
      <AbandonFunnelChart data={funnelData} />

      {/* Abandon Time Thresholds */}
      <AbandonTimeThresholds records={records} />

      {/* Wait Distribution Histogram */}
      <QueueWaitDistribution records={records} />

      {/* Heatmap */}
      <QueuePerformanceHeatmap data={heatmapData} />

      {/* Queue performance table */}
      {metrics.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Tabla de Rendimiento por Cola</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bice-dark-blue border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-white">Cola</th>
                  <th className="px-6 py-3 text-right font-semibold text-white">
                    <div className="flex items-center justify-end gap-1">
                      Atendidas
                      <Tooltip
                        definition="Cantidad de llamadas que fueron respondidas por un agente"
                        unit="Cantidad absoluta"
                        benchmark="Mayor es mejor"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-white">
                    <div className="flex items-center justify-end gap-1">
                      Abandonos
                      <Tooltip
                        definition="Cantidad de llamadas abandonadas en cola o alerta (no incluye IVR ni short abandons)"
                        unit="Cantidad absoluta"
                        benchmark="Menor es mejor"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-white">
                    <div className="flex items-center justify-end gap-1">
                      SL%
                      <Tooltip
                        definition="Porcentaje de llamadas atendidas dentro de 20 segundos"
                        formula="(Atendidas &lt; 20s) / Llamadas válidas × 100"
                        unit="Porcentaje (%)"
                        benchmark="≥ 80%"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-white">
                    <div className="flex items-center justify-end gap-1">
                      Abandon %
                      <Tooltip
                        definition="Porcentaje de llamadas abandonadas"
                        formula="Abandonos / Llamadas válidas × 100"
                        unit="Porcentaje (%)"
                        benchmark="≤ 10%"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-white">
                    <div className="flex items-center justify-end gap-1">
                      Erlang C
                      <Tooltip
                        definition="Intensidad de tráfico normalizada: promedio de agentes ocupados"
                        formula="SUM(handle_time_seconds) / (3600 × Horas período)"
                        unit="Erlangs"
                        benchmark="≤ 0.8 ideal"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 bg-yellow-200">
                    <div className="flex items-center justify-center gap-1">
                      Tendencia SL%
                      <Tooltip
                        definition="Cambio en Service Level comparado con benchmark 80%"
                        unit="Tendencia"
                        benchmark="↑ Mejora, → Estable, ↓ Decae"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 bg-yellow-200">
                    <div className="flex items-center justify-center gap-1">
                      Análisis Staff
                      <Tooltip
                        definition="Diagnóstico de brecha de staffing: distingue falta de personal vs baja adherencia"
                        unit="Análisis"
                        benchmark="✓ Óptimo, ↑ Falta Staff, ⚠ Baja Adherencia"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.filter(m => (m.attendedCalls > 0 || m.abandonedCalls > 0) && m.queue !== 'Sin cola').map(m => (
                  <tr key={m.queue} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{m.queue}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{m.attendedCalls}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{m.abandonedCalls}</td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          m.serviceLevelPercent >= 80
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {m.serviceLevelPercent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          m.abandonmentRatePercent <= 10
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {m.abandonmentRatePercent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">{m.erlangC.toFixed(1)}</td>
                    <td className="px-6 py-4 text-center bg-yellow-100">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span className={`text-lg ${
                          m.slTrend === 'up' ? 'text-bice-green' :
                          m.slTrend === 'stable' ? 'text-amber-500' :
                          'text-red-500'
                        }`}>
                          {m.slTrend === 'up' ? '↑' : m.slTrend === 'stable' ? '→' : '↓'}
                        </span>
                        {m.serviceLevelPercent >= 80 ? 'Mejora' : m.serviceLevelPercent >= 70 ? 'Estable' : 'Decae'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center bg-yellow-100 font-semibold">
                      {m.serviceLevelPercent >= 80 ? (
                        <span className="text-bice-green">✓ Óptimo</span>
                      ) : m.staffingEfficiency > 80 ? (
                        <span className="text-red-500">↑ Falta Staff</span>
                      ) : (
                        <span className="text-amber-500">⚠ Baja Adherencia</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
