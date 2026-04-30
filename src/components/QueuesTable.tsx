import type { QueueStat } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
};

export function QueuesTable({ stats }: Props) {
  // Filter to show only queues with inbound traffic
  const activeQueues = stats.filter(s => s.inboundCount > 0);
  const maxDuration = Math.max(...activeQueues.map(s => s.totalDurationSeconds), 1);

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
            <tr className="bg-bice-blue text-white">
              <th className="text-left px-6 py-3 font-semibold">Cola</th>
              <th className="text-right px-4 py-3 font-semibold font-mono">Llamadas</th>
              <th className="text-right px-4 py-3 font-semibold font-mono">Tiempo Total</th>
              <th className="text-right px-6 py-3 font-semibold font-mono">% del total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeQueues.map((row, i) => (
              <tr
                key={row.queue}
                className={`hover:bg-slate-100 transition-colors ${i % 2 === 0 ? '' : 'even:bg-slate-50'}`}
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-bice-green flex-shrink-0" />
                    <span className="font-medium text-bice-blue">{row.queue || 'Sin cola'}</span>
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
              </tr>
            ))}
          </tbody>
        </table>
        {activeQueues.length === 0 && (
          <p className="text-center text-slate-400 py-8">Sin datos</p>
        )}
      </div>
    </div>
  );
}
