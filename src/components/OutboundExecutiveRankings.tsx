import type { ExecutiveOutboundStat } from '../lib/kpi';

type Props = {
  stats: ExecutiveOutboundStat[];
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function getContactRateBg(rate: number): string {
  if (rate >= 0.7) return 'bg-emerald-50';
  if (rate >= 0.6) return 'bg-blue-50';
  if (rate >= 0.5) return 'bg-amber-50';
  return 'bg-red-50';
}

function getContactRateColor(rate: number): string {
  if (rate >= 0.7) return 'text-emerald-700';
  if (rate >= 0.6) return 'text-blue-700';
  if (rate >= 0.5) return 'text-amber-700';
  return 'text-red-700';
}

export function OutboundExecutiveRankings({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-500 text-center py-12">
          No hay datos de ejecutivos
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Ranking de Ejecutivos (Salientes)
        </h3>
        <p className="text-xs text-slate-600">
          Ordenado por número de intentos. Identifica patrones de productividad por cola.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                Ejecutivo
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">
                Intentos
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">
                Válidos
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">
                Tasa
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">
                Conversación
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">
                ACW
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">
                AHT
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {stats.map((stat, idx) => (
              <tr
                key={`${stat.executive}-${idx}`}
                className={`hover:bg-slate-50 transition-colors ${getContactRateBg(
                  stat.contactRate
                )}`}
              >
                <td className="px-3 py-2 text-sm font-medium text-slate-900">
                  {stat.executive}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold text-slate-900">
                  {stat.attempts.toLocaleString('es-CL')}
                </td>
                <td className="px-3 py-2 text-center text-sm text-slate-700">
                  {stat.validContacts.toLocaleString('es-CL')}
                </td>
                <td
                  className={`px-3 py-2 text-center text-sm font-semibold ${getContactRateColor(
                    stat.contactRate
                  )}`}
                >
                  {(stat.contactRate * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-center text-sm text-slate-600">
                  {formatDuration(stat.avgConversation)}
                </td>
                <td className="px-3 py-2 text-center text-sm text-slate-600">
                  {formatDuration(stat.avgACW)}
                </td>
                <td
                  className="px-3 py-2 text-center text-sm font-medium"
                  style={{
                    color:
                      stat.avgACW > stat.avgConversation
                        ? '#c0392b'
                        : '#1d8e6e',
                  }}
                >
                  {formatDuration(stat.avgAHT)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-slate-600 font-semibold">Total Ejecutivos</p>
          <p className="text-lg font-bold text-slate-900">
            {new Set(stats.map(s => s.executive)).size}
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-slate-600 font-semibold">Total Intentos</p>
          <p className="text-lg font-bold text-slate-900">
            {stats
              .reduce((sum, s) => sum + s.attempts, 0)
              .toLocaleString('es-CL')}
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-slate-600 font-semibold">Tasa Promedio</p>
          <p className="text-lg font-bold text-slate-900">
            {(
              stats.reduce((sum, s) => sum + s.contactRate, 0) / stats.length
            ).toFixed(1)}
            %
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-slate-600 font-semibold">AHT Promedio</p>
          <p className="text-lg font-bold text-slate-900">
            {formatDuration(
              stats.reduce((sum, s) => sum + s.avgAHT, 0) / stats.length
            )}
          </p>
        </div>
      </div>

      {/* Color legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span className="text-slate-600">≥70% (Excelente)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
          <span className="text-slate-600">60-70% (Bueno)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          <span className="text-slate-600">50-60% (Alerta)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-slate-600">&lt;50% (Crítico)</span>
        </div>
      </div>
    </div>
  );
}
