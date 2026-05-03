import type { WeeklyAttentionHeatmapData } from '../lib/kpi';

function getAttentionColor(percentage: number | null): string {
  if (percentage === null) return '#f3f4f6';
  if (percentage > 80) return '#10b981'; // Green - healthy
  if (percentage >= 50) return '#f59e0b'; // Yellow/Orange - risk
  return '#ef4444'; // Red - crisis
}

export default function WeeklyAttentionHeatmap({ data, onCellClick }: {
  data: WeeklyAttentionHeatmapData;
  onCellClick?: (week: string, queue: string) => void;
}) {
  if (data.data.length === 0 || data.weeks.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Evolución Semanal de Atención
        </h3>
        <div className="text-slate-500 text-center py-8">No hay datos disponibles</div>
      </div>
    );
  }

  const numWeeks = data.weeks.length;
  const cellSize = 35;
  const gap = 1;
  const leftMargin = 180;
  const topMargin = 60;
  const gridWidth = leftMargin + (numWeeks * cellSize) + ((numWeeks - 1) * gap) + 20;
  const gridHeight = topMargin + (data.data.length * cellSize) + ((data.data.length - 1) * gap) + 80;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Evolución Semanal de Atención
        </h3>
        <p className="text-xs text-slate-400">
          % de llamadas con conversación efectiva · Haz clic en una celda para filtrar otros gráficos
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg width={gridWidth} height={gridHeight} className="mx-auto">
          <defs>
            <style>{`
              .heatmap-cell:hover { opacity: 0.8; stroke-width: 2; }
              .heatmap-tooltip { pointer-events: none; }
              .heatmap-label { font-size: 12px; }
            `}</style>
          </defs>

          {/* Week labels */}
          {data.weekLabels.map((label, idx) => (
            <text
              key={`week-${idx}`}
              x={leftMargin + idx * (cellSize + gap) + cellSize / 2}
              y={topMargin - 30}
              textAnchor="middle"
              className="heatmap-label text-slate-600"
              fill="#475569"
              style={{ fontSize: '11px' }}
            >
              {label}
            </text>
          ))}

          {/* Rotation line to separate headers */}
          <line
            x1={leftMargin}
            y1={topMargin - 8}
            x2={gridWidth - 20}
            y2={topMargin - 8}
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Queue rows */}
          {data.data.map((row, queueIndex) => {
            const queueName = row.queue.length > 25 ? row.queue.substring(0, 22) + '...' : row.queue;

            return (
              <g key={`queue-${queueIndex}`}>
                {/* Queue label */}
                <text
                  x={leftMargin - 10}
                  y={topMargin + queueIndex * (cellSize + gap) + cellSize / 2 + 5}
                  textAnchor="end"
                  className="heatmap-label text-slate-700"
                  fill="#1f2937"
                  style={{ fontWeight: 500, fontSize: '11px' }}
                >
                  {queueName}
                </text>

                {/* Heatmap cells */}
                {row.cells.map((cell, weekIndex) => {
                  const x = leftMargin + weekIndex * (cellSize + gap);
                  const y = topMargin + queueIndex * (cellSize + gap);
                  const percentage = cell.percentage;
                  const title = percentage !== null
                    ? `${row.queue}, ${data.weekLabels[weekIndex]}: ${percentage}%`
                    : `${row.queue}, ${data.weekLabels[weekIndex]}: Sin datos`;

                  return (
                    <g key={`cell-${weekIndex}`}>
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill={getAttentionColor(percentage)}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        className="heatmap-cell"
                        style={{ cursor: onCellClick ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (onCellClick && percentage !== null) {
                            onCellClick(data.weeks[weekIndex], row.queue);
                          }
                        }}
                      />
                      {percentage !== null && (
                        <text
                          x={x + cellSize / 2}
                          y={y + cellSize / 2 + 4}
                          textAnchor="middle"
                          className="heatmap-label"
                          fill={percentage > 65 ? '#ffffff' : '#1f2937'}
                          style={{ fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }}
                        >
                          {percentage}%
                        </text>
                      )}
                      <title>{title}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#10b981' }} />
            <span className="text-xs text-slate-700">Saludable (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-xs text-slate-700">Riesgo (50-79%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-xs text-slate-700">Crisis (&lt;50%)</span>
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
