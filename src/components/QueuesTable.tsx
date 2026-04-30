import type { QueueStat, QueueHealthMetric } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
  healthMetrics?: QueueHealthMetric[];
};

export function QueuesTable({ stats, healthMetrics = [] }: Props) {
  // Aggressive filter: only queues with inbound calls OR handled calls, excluding "Sin cola"
  const activeQueues = stats.filter(s => (s.inboundCount > 0 || s.count > 0) && s.queue !== 'Sin cola');
  const maxDuration = Math.max(...activeQueues.map(s => s.totalDurationSeconds), 1);

  // Map health metrics for quick lookup
  const metricsMap = new Map(healthMetrics.map(m => [m.queue, m]));

  // SL% Trend indicator
  const getTrendIndicator = (slTrend: string, slPercent: number) => {
    if (slTrend === 'up') {
      return { icon: '↑', color: 'text-bice-green', label: 'En mejora' };
    }
    if (slTrend === 'stable') {
      return { icon: '→', color: 'text-amber-500', label: 'Estable' };
    }
    return { icon: '↓', color: 'text-red-500', label: 'Decayendo' };
  };

  // Staffing Efficiency analysis
  // High staffingEfficiency (Erlang C normalized) + Low SL% = Understaffing
  // Low staffingEfficiency + Low SL% = Low Adherence
  const getStaffingAnalysis = (metric: QueueHealthMetric | undefined) => {
    if (!metric) return null;

    const { serviceLevelPercent, staffingEfficiency } = metric;

    if (serviceLevelPercent >= 80) {
      return { label: 'Óptimo', color: 'text-bice-green', icon: '✓' };
    }

    if (staffingEfficiency > 80) {
      return { label: 'Falta Staff', color: 'text-red-500', icon: '↑' };
    }

    return { label: 'Baja Adherencia', color: 'text-amber-500', icon: '⚠' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Tiempo por Cola / Departamento
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bice-dark-blue text-white">
              <th className="text-left px-6 py-3 font-semibold" style={{ fontFamily: 'Open Sans' }}>Cola</th>
              <th className="text-right px-4 py-3 font-semibold font-mono">Llamadas</th>
              <th className="text-right px-4 py-3 font-semibold font-mono">Tiempo Total</th>
              <th className="text-right px-6 py-3 font-semibold font-mono">% del total</th>
              <th className="text-center px-4 py-3 font-semibold font-mono">SL%</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ fontFamily: 'Open Sans' }}>Análisis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeQueues.map((row, i) => {
              const metric = metricsMap.get(row.queue);
              const trendIndicator = metric ? getTrendIndicator(metric.slTrend, metric.serviceLevelPercent) : null;
              const staffingAnalysis = getStaffingAnalysis(metric);

              return (
                <tr
                  key={row.queue}
                  className={`hover:bg-slate-100 transition-colors ${i % 2 === 0 ? '' : 'even:bg-slate-50'}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-bice-green flex-shrink-0" />
                      <span className="font-medium text-bice-blue" style={{ fontFamily: 'Open Sans' }}>{row.queue || 'Sin cola'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800">
                    {row.count.toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {row.totalDurationFormatted}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-bice-green rounded-full"
                          style={{ width: `${(row.totalDurationSeconds / maxDuration) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-bice-gray text-right w-12">{row.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {metric ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            metric.serviceLevelPercent >= 80
                              ? 'bg-bice-green bg-opacity-15 text-bice-green'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {metric.serviceLevelPercent}%
                        </span>
                        {trendIndicator && (
                          <span className={`text-lg ${trendIndicator.color}`} title={trendIndicator.label}>
                            {trendIndicator.icon}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {staffingAnalysis ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${staffingAnalysis.color}`}>
                        {staffingAnalysis.icon} {staffingAnalysis.label}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {activeQueues.length === 0 && (
          <p className="text-center text-slate-400 py-8">Sin datos</p>
        )}
      </div>
    </div>
  );
}
