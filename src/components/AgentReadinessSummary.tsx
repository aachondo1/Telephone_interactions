import type { ReadinessSummaryRow } from '../lib/kpi/agent-readiness';
import { AlertTriangle } from 'lucide-react';

interface Props {
  summary: ReadinessSummaryRow[];
}

export function AgentReadinessSummary({ summary }: Props) {
  if (summary.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Resumen de Disponibilidad
        </h3>
        <div className="text-slate-500 text-center py-8">No hay datos disponibles</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Resumen de Tiempo en Cola
        </h3>
        <p className="text-xs text-slate-400">
          Indicadores clave de ocupación (tiempo en llamada) por agente
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Agente
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                Promedio
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                Peor Hora
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                Mejor Hora
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                Días
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.agentName} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{row.agentName}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      row.avgReadiness >= 80
                        ? 'bg-green-100 text-green-800'
                        : row.avgReadiness >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : row.avgReadiness >= 40
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {row.avgReadiness}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-700">
                  {String(row.minReadinessHour).padStart(2, '0')}:00
                </td>
                <td className="px-4 py-3 text-center text-slate-700">
                  {String(row.maxReadinessHour).padStart(2, '0')}:00
                </td>
                <td className="px-4 py-3 text-center text-slate-700">{row.workingDays}</td>
                <td className="px-4 py-3 text-center">
                  {row.requiresReview ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      <AlertTriangle size={14} />
                      Revisar
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-600">
          <strong>Nota:</strong> Los agentes con promedio inferior al 70% se marcan como
          "Requiere revisión". Esto puede indicar baja ocupación o tiempos significativos
          en estado "Disponible" sin tomar llamadas.
        </p>
      </div>
    </div>
  );
}
