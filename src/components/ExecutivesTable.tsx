import type { ExecutiveStat } from '../lib/kpi';

type Props = {
  stats: ExecutiveStat[];
};

export function ExecutivesTable({ stats }: Props) {
  const maxCount = Math.max(...stats.map(s => s.count), 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Llamadas por Ejecutivo
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="text-left px-6 py-3 font-medium">Ejecutivo</th>
              <th className="text-right px-4 py-3 font-medium">Llamadas</th>
              <th className="text-right px-4 py-3 font-medium">Dur. Prom.</th>
              <th className="text-right px-4 py-3 font-medium">% Rebotes</th>
              <th className="px-6 py-3 font-medium text-left w-40">% del total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {stats.map((row, i) => (
              <tr
                key={row.executive}
                className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        row.executive === 'SIN ATENDER'
                          ? 'bg-bice-alert-bg text-bice-alert'
                          : 'bg-bice-navy-tint text-bice-navy'
                      }`}
                    >
                      {row.executive === 'SIN ATENDER' ? '—' : row.executive.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`font-medium ${
                        row.executive === 'SIN ATENDER' ? 'text-bice-alert' : 'text-slate-700'
                      }`}
                    >
                      {row.executive}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                  {row.count.toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">
                  {row.avgDurationFormatted}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-bice-alert font-medium">{row.bounceRate}%</span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-bice-navy rounded-full"
                        style={{ width: `${(row.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">{row.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stats.length === 0 && (
          <p className="text-center text-slate-400 py-8">Sin datos</p>
        )}
      </div>
    </div>
  );
}