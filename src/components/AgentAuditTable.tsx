import { AlertCircle, Info } from 'lucide-react';

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
};

type Props = {
  rows: AuditTableRow[];
};

function formatTime(minutes: number, seconds: number = 0): string {
  const totalMinutes = minutes + Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(totalMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getActionRecommendation(
  shrinkagePercent: number,
  evasionMinutes: number,
  ghostMinutes: number
): { label: string; color: string; icon: string } {
  if (ghostMinutes > 30) {
    return { label: 'Auditar', color: 'bg-red-100 text-red-700', icon: '🔴' };
  }
  if (shrinkagePercent > 20) {
    return { label: 'Sesión Gerente', color: 'bg-red-100 text-red-700', icon: '⚠️' };
  }
  if (evasionMinutes > 120) {
    return { label: 'Escalada', color: 'bg-orange-100 text-orange-700', icon: '⚠️' };
  }
  if (shrinkagePercent > 15 || (evasionMinutes > 60 && evasionMinutes <= 120)) {
    return { label: 'Monitorear', color: 'bg-orange-100 text-orange-700', icon: 'ℹ️' };
  }
  return { label: '✓ OK', color: 'bg-emerald-100 text-emerald-700', icon: '✓' };
}

type HeaderTooltip = {
  label: string;
  tooltip: string;
};

const columnTooltips: Record<string, string> = {
  turno:
    'Total de horas en que el agente estuvo conectado y disponible para atender llamadas.',
  shrinkage:
    'Porcentaje de tiempo en pausa, comida, reunión u otros estados no productivos. Límite aceptable: ≤15%.',
  evasion:
    'Tiempo total que el agente no respondió a alertas de llamadas. Ej: 02:15 ≈ 13 llamadas perdidas (AHT 10min).',
  ghostHours:
    'Horas "fantasma" o anomalías de tiempo registrado fuera de horario normal. Red flag de posible fraude o error de registro.',
};

function HeaderWithTooltip({ label, tooltip }: HeaderTooltip) {
  return (
    <div className="group relative inline-flex items-center gap-1 cursor-help">
      <span>{label}</span>
      <Info size={14} className="text-slate-400" />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-normal pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 w-48">
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

export function AgentAuditTable({ rows }: Props) {
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
              <HeaderWithTooltip label="Turno Validado (HH:MM)" tooltip={columnTooltips.turno} />
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              <HeaderWithTooltip label="Shrinkage (%)" tooltip={columnTooltips.shrinkage} />
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              <HeaderWithTooltip label="Tiempo Evasión (HH:MM)" tooltip={columnTooltips.evasion} />
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">
              <HeaderWithTooltip label="Horas Fantasma (HH:MM)" tooltip={columnTooltips.ghostHours} />
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">
              <HeaderWithTooltip label="Acción" tooltip="Recomendación automática basada en métricas de riesgo." />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                Sin datos disponibles para la auditoría
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => {
              const action = getActionRecommendation(
                row.shrinkagePercent,
                row.evasionMinutes,
                row.ghostMinutes
              );
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
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${action.color}`}
                    >
                      {action.icon} {action.label}
                    </span>
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
