import { AlertCircle } from 'lucide-react';
import type { AgentCascadeStat } from './OccupationDashboard';

export type AuditTableRow = {
  agent: string;
  validatedTurnHours: number;
  validatedTurnMinutes: number;
  shrinkagePercent: number;
  evasionMinutes: number;
  evasionSeconds: number;
  ghostMinutes: number;
  ghostSeconds: number;
  requiresReview: boolean;
  timesAlerted?: number;
  timesAnswered?: number;
  cascadeResponseRate?: number;
};

type Props = {
  rows: AuditTableRow[];
  cascadeStats?: AgentCascadeStat[];
};

function formatTime(minutes: number, seconds: number = 0): string {
  const totalMinutes = minutes + Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(totalMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function AgentAuditTable({ rows, cascadeStats = [] }: Props) {
  const cascadeMap = new Map(cascadeStats.map((s) => [s.agent, s]));

  const sortedRows = [...rows].sort((a, b) => {
    const aGhost = a.ghostMinutes + a.ghostSeconds / 60;
    const bGhost = b.ghostMinutes + b.ghostSeconds / 60;
    return bGhost - aGhost;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 overflow-x-auto">
      <h3 className="text-lg font-semibold text-slate-900">
        Tabla de Auditoría Forense Acumulada
      </h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Agente</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              Turno Validado (HH:MM)
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              Shrinkage (%)
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              Tiempo Evasión (HH:MM)
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              Horas Fantasma (HH:MM)
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              Alertas Rec.
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              Respondidas
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              Tasa Resp.
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                Sin datos disponibles para la auditoría
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => {
              const cs = cascadeMap.get(row.agent);
              const timesAlerted = row.timesAlerted ?? cs?.timesAlerted ?? 0;
              const timesAnswered = row.timesAnswered ?? cs?.timesAnswered ?? 0;
              const cascadeRate = row.cascadeResponseRate ?? cs?.responseRate ?? (
                timesAlerted > 0 ? Math.round((timesAnswered / timesAlerted) * 100) : 0
              );
              const rateColor =
                timesAlerted === 0
                  ? 'bg-slate-100 text-slate-400'
                  : cascadeRate >= 80
                    ? 'bg-emerald-100 text-emerald-700'
                    : cascadeRate >= 50
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700';

              return (
                <tr
                  key={row.agent}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    row.requiresReview ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{row.agent}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {String(row.validatedTurnHours).padStart(2, '0')}:
                    {String(row.validatedTurnMinutes).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        row.shrinkagePercent > 20
                          ? 'bg-red-100 text-red-700'
                          : row.shrinkagePercent > 15
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {row.shrinkagePercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatTime(row.evasionMinutes, row.evasionSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${
                        row.ghostMinutes > 30 || (row.ghostMinutes === 30 && row.ghostSeconds > 0)
                          ? 'text-red-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {formatTime(row.ghostMinutes, row.ghostSeconds)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {timesAlerted > 0 ? timesAlerted : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {timesAlerted > 0 ? timesAnswered : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${rateColor}`}>
                      {timesAlerted > 0 ? `${cascadeRate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.requiresReview ? (
                      <div className="flex items-center justify-center gap-1">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold whitespace-nowrap">
                          Requiere Revisión
                        </span>
                      </div>
                    ) : (
                      <span className="text-emerald-600 text-xs font-semibold">✓ OK</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
