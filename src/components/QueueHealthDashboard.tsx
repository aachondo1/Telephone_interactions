import { useMemo } from 'react';
import type { CallRecord } from '../lib/supabase';
import {
  calculateQueueHealthMetrics,
  calculateAbandonFunnel,
  generateQueueHealthInsights,
  calculateTechnicalLeaks,
} from '../lib/kpi';
import { QueueHealthMetricsCards } from './QueueHealthMetricsCards';
import { AbandonFunnelChart } from './AbandonFunnelChart';
import { QueueHealthInsights } from './QueueHealthInsights';
import { TechnicalLeaksPanel } from './TechnicalLeaksPanel';
import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import { calculateQueuePerformanceHeatmap } from '../lib/kpi';

type Props = {
  records: CallRecord[];
};

export function QueueHealthDashboard({ records }: Props) {
  const metrics = useMemo(() => calculateQueueHealthMetrics(records), [records]);
  const funnelData = useMemo(() => calculateAbandonFunnel(records), [records]);
  const technicalLeaks = useMemo(() => calculateTechnicalLeaks(records), [records]);
  const heatmapData = useMemo(() => calculateQueuePerformanceHeatmap(records), [records]);
  const insights = useMemo(
    () => generateQueueHealthInsights(metrics, funnelData, records),
    [metrics, funnelData, records]
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <QueueHealthMetricsCards metrics={metrics} />

      {/* Abandon Funnel */}
      <AbandonFunnelChart data={funnelData} />

      {/* Insights */}
      <QueueHealthInsights insights={insights} />

      {/* Technical Leaks */}
      <TechnicalLeaksPanel data={technicalLeaks} />

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
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Cola</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Atendidas</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Abandonos</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">AWT</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">SL%</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Abandon %</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Erlang C</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.map(m => (
                  <tr key={m.queue} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{m.queue}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{m.attendedCalls}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{m.abandonedCalls}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{m.awtFormatted}</td>
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
