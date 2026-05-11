import type { ReadinessCellData } from '../lib/kpi/agent-readiness';

function getReadinessColor(percentage: number | null): string {
  if (percentage === null) return '#f3f4f6';
  if (percentage >= 80) return '#15803d';
  if (percentage >= 60) return '#84cc16';
  if (percentage >= 40) return '#f59e0b';
  return '#dc2626';
}

export interface AgentReadinessHeatmapProps {
  data: ReadinessCellData[];
  agents: string[];
  hours: number[];
  onCellClick?: (agentName: string, hour: number) => void;
}

export default function AgentReadinessHeatmap({
  data,
  agents,
  hours,
  onCellClick,
}: AgentReadinessHeatmapProps) {
  if (data.length === 0 || agents.length === 0 || hours.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Disponibilidad por Hora
        </h3>
        <div className="text-slate-500 text-center py-8">No hay datos disponibles</div>
      </div>
    );
  }

  const cellSize = 40;
  const gap = 1;
  const leftMargin = 200;
  const topMargin = 60;
  const gridWidth = leftMargin + (hours.length * cellSize) + ((hours.length - 1) * gap) + 40;
  const gridHeight = topMargin + (agents.length * cellSize) + ((agents.length - 1) * gap) + 80;

  // Create lookup: agentName + hour -> readiness data
  const dataMap = new Map<string, ReadinessCellData>();
  for (const cell of data) {
    dataMap.set(`${cell.agentName}|${cell.hour}`, cell);
  }

  // Calculate totals per hour and per agent
  const hourTotals = new Map<number, number[]>();
  const agentTotals = new Map<string, number[]>();

  for (const hour of hours) {
    const percentages: number[] = [];
    for (const agent of agents) {
      const cell = dataMap.get(`${agent}|${hour}`);
      if (cell && cell.readinessPercent !== null) {
        percentages.push(cell.readinessPercent);
      }
    }
    if (percentages.length > 0) {
      hourTotals.set(hour, percentages);
    }
  }

  for (const agent of agents) {
    const percentages: number[] = [];
    for (const hour of hours) {
      const cell = dataMap.get(`${agent}|${hour}`);
      if (cell && cell.readinessPercent !== null) {
        percentages.push(cell.readinessPercent);
      }
    }
    if (percentages.length > 0) {
      agentTotals.set(agent, percentages);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Disponibilidad por Hora
        </h3>
        <p className="text-xs text-slate-400">
          Porcentaje de tiempo en estado listo (Disponible + En la cola) · Hace clic en una celda para más detalles
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg width={gridWidth} height={gridHeight} className="mx-auto">
          <defs>
            <style>{`
              .heatmap-cell:hover { opacity: 0.8; stroke-width: 2; }
              .heatmap-label { font-size: 12px; }
            `}</style>
          </defs>

          {/* Hour labels */}
          {hours.map((hour, idx) => (
            <text
              key={`hour-${idx}`}
              x={leftMargin + idx * (cellSize + gap) + cellSize / 2}
              y={topMargin - 30}
              textAnchor="middle"
              className="heatmap-label text-slate-600"
              fill="#475569"
              style={{ fontSize: '11px', fontWeight: 500 }}
            >
              {String(hour).padStart(2, '0')}:00
            </text>
          ))}

          {/* Divider line */}
          <line
            x1={leftMargin}
            y1={topMargin - 8}
            x2={gridWidth - 20}
            y2={topMargin - 8}
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Agent rows */}
          {agents.map((agent, agentIdx) => {
            const agentLabel = agent.length > 22 ? agent.substring(0, 19) + '...' : agent;

            return (
              <g key={`agent-${agentIdx}`}>
                {/* Agent label */}
                <text
                  x={leftMargin - 10}
                  y={topMargin + agentIdx * (cellSize + gap) + cellSize / 2 + 5}
                  textAnchor="end"
                  className="heatmap-label text-slate-700"
                  fill="#1f2937"
                  style={{ fontWeight: 500, fontSize: '11px' }}
                >
                  {agentLabel}
                </text>

                {/* Cells for each hour */}
                {hours.map((hour, hourIdx) => {
                  const x = leftMargin + hourIdx * (cellSize + gap);
                  const y = topMargin + agentIdx * (cellSize + gap);
                  const cell = dataMap.get(`${agent}|${hour}`);
                  const percentage = cell?.readinessPercent ?? null;

                  const title =
                    percentage !== null
                      ? `${agent}, Hora ${String(hour).padStart(2, '0')}:00 - ${percentage}% listo (${cell?.dayCount || 0} días)`
                      : `${agent}, Hora ${String(hour).padStart(2, '0')}:00 - Sin datos`;

                  return (
                    <g key={`cell-${hourIdx}`}>
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill={getReadinessColor(percentage)}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        className="heatmap-cell"
                        style={{ cursor: onCellClick ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (onCellClick && percentage !== null) {
                            onCellClick(agent, hour);
                          }
                        }}
                      />
                      {percentage !== null && (
                        <text
                          x={x + cellSize / 2}
                          y={y + cellSize / 2 + 4}
                          textAnchor="middle"
                          className="heatmap-label"
                          fill={percentage > 50 ? '#ffffff' : '#1f2937'}
                          style={{ fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }}
                        >
                          {percentage}%
                        </text>
                      )}
                      <title>{title}</title>
                    </g>
                  );
                })}

                {/* Agent total */}
                {agentTotals.has(agent) && (
                  <g>
                    <text
                      x={leftMargin + hours.length * (cellSize + gap) + 20}
                      y={topMargin + agentIdx * (cellSize + gap) + cellSize / 2 + 5}
                      textAnchor="start"
                      className="heatmap-label"
                      fill="#64748b"
                      style={{ fontSize: '10px', fontWeight: 500 }}
                    >
                      {Math.round(
                        agentTotals.get(agent)!.reduce((a, b) => a + b, 0) /
                          agentTotals.get(agent)!.length
                      )}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Hour totals row */}
          <g>
            <text
              x={leftMargin - 10}
              y={topMargin + agents.length * (cellSize + gap) + cellSize / 2 + 5}
              textAnchor="end"
              className="heatmap-label"
              fill="#64748b"
              style={{ fontWeight: 500, fontSize: '11px' }}
            >
              Promedio
            </text>

            {hours.map((hour, hourIdx) => {
              const x = leftMargin + hourIdx * (cellSize + gap);
              const y = topMargin + agents.length * (cellSize + gap);
              const percentages = hourTotals.get(hour);
              const avgPercent = percentages
                ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
                : null;

              return (
                <g key={`total-${hourIdx}`}>
                  <rect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill={getReadinessColor(avgPercent)}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  />
                  {avgPercent !== null && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      className="heatmap-label"
                      fill={avgPercent > 50 ? '#ffffff' : '#1f2937'}
                      style={{ fontSize: '10px', fontWeight: 'bold' }}
                    >
                      {avgPercent}%
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#15803d' }} />
            <span className="text-xs text-slate-700">Excelente (≥80%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#84cc16' }} />
            <span className="text-xs text-slate-700">Bueno (60-79%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-xs text-slate-700">Regular (40-59%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#dc2626' }} />
            <span className="text-xs text-slate-700">Bajo (&lt;40%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#f3f4f6', border: '1px solid #cbd5e1' }} />
            <span className="text-xs text-slate-700">Sin datos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
