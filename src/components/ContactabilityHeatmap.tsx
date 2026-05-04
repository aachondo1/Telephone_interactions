import { useState } from 'react';
import type { ContactabilityHeatmapData } from '../lib/outboundKPI';

type Props = {
  data: ContactabilityHeatmapData;
};

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

function getColor(ratio: number): string {
  if (ratio === 0) return '#ffffff';
  if (ratio < 0.25) return '#e0f2fe';
  if (ratio < 0.5) return '#7dd3fc';
  if (ratio < 0.75) return '#0c4a6e';
  return '#84BD00';
}

export function ContactabilityHeatmap({ data }: Props) {
  const [hoveredCell, setHoveredCell] = useState<{
    hour: number;
    queue: string;
  } | null>(null);

  if (data.data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-500 text-center py-12">
          No hay datos de llamadas salientes
        </p>
      </div>
    );
  }

  const cellSize = 28;
  const gap = 2;
  const leftMargin = 140;
  const topMargin = 40;
  const gridWidth = leftMargin + HOURS.length * (cellSize + gap) + 40;
  const gridHeight = topMargin + data.data.length * (cellSize + gap) + 80;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="overflow-x-auto">
        <svg width={gridWidth} height={gridHeight} className="mx-auto">
          {/* Hour labels (top) */}
          {HOURS.map((hour, idx) => (
            <text
              key={`hour-${hour}`}
              x={leftMargin + idx * (cellSize + gap) + cellSize / 2}
              y={topMargin - 15}
              textAnchor="middle"
              className="text-xs fill-slate-600 font-semibold"
            >
              {String(hour).padStart(2, '0')}h
            </text>
          ))}

          {/* Queue labels (left) */}
          {data.data.map((row, qIdx) => (
            <text
              key={`queue-${qIdx}`}
              x={leftMargin - 10}
              y={topMargin + qIdx * (cellSize + gap) + cellSize / 2 + 4}
              textAnchor="end"
              className="text-xs fill-slate-700 font-medium"
            >
              {row.queue.length > 12 ? row.queue.substring(0, 12) + '...' : row.queue}
            </text>
          ))}

          {/* Grid cells */}
          {data.data.map((row, qIdx) =>
            row.cells.map((cell, hIdx) => {
              const color = getColor(cell.contactabilityPercent);
              const isHovered =
                hoveredCell &&
                hoveredCell.hour === cell.hour &&
                hoveredCell.queue === row.queue;

              return (
                <g key={`cell-${qIdx}-${hIdx}`}>
                  <rect
                    x={leftMargin + hIdx * (cellSize + gap)}
                    y={topMargin + qIdx * (cellSize + gap)}
                    width={cellSize}
                    height={cellSize}
                    fill={color}
                    stroke={isHovered ? '#003a70' : '#d1d5db'}
                    strokeWidth={isHovered ? 2 : 1}
                    rx={2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() =>
                      setHoveredCell({ hour: cell.hour, queue: row.queue })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                  {cell.attempts > 0 && (
                    <text
                      x={leftMargin + hIdx * (cellSize + gap) + cellSize / 2}
                      y={topMargin + qIdx * (cellSize + gap) + cellSize / 2 + 3}
                      textAnchor="middle"
                      className="text-xs font-bold"
                      fill={
                        cell.contactabilityPercent >= 0.75
                          ? '#ffffff'
                          : '#1f2937'
                      }
                      style={{ pointerEvents: 'none' }}
                    >
                      {(cell.contactabilityPercent * 100).toFixed(0)}%
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Hovered cell tooltip */}
          {hoveredCell && (() => {
            const cell = data.data
              .find(r => r.queue === hoveredCell.queue)
              ?.cells.find(c => c.hour === hoveredCell.hour);

            if (!cell) return null;

            const x =
              leftMargin +
              HOURS.indexOf(hoveredCell.hour) * (cellSize + gap) +
              cellSize / 2;
            const y = topMargin + data.data.length * (cellSize + gap) + 20;

            return (
              <g>
                <rect
                  x={x - 90}
                  y={y}
                  width={180}
                  height={85}
                  fill="white"
                  stroke="#6b7280"
                  strokeWidth={1}
                  rx={4}
                />
                <text
                  x={x}
                  y={y + 18}
                  textAnchor="middle"
                  className="text-xs font-bold fill-slate-900"
                >
                  {String(hoveredCell.hour).padStart(2, '0')}:00
                </text>
                <text
                  x={x}
                  y={y + 35}
                  textAnchor="middle"
                  className="text-[11px] fill-slate-600 font-medium"
                >
                  Contactabilidad:
                </text>
                <text
                  x={x}
                  y={y + 50}
                  textAnchor="middle"
                  className="text-sm font-bold"
                  fill={getColor(cell.contactabilityPercent)}
                >
                  {(cell.contactabilityPercent * 100).toFixed(1)}%
                </text>
                <text
                  x={x}
                  y={y + 68}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500"
                >
                  {cell.validContacts} / {cell.attempts} intentos
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }} />
          <span className="text-slate-600">0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#e0f2fe' }} />
          <span className="text-slate-600">0-25%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#7dd3fc' }} />
          <span className="text-slate-600">25-50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#0c4a6e' }} />
          <span className="text-slate-600">50-75%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#84BD00' }} />
          <span className="text-slate-600">≥75% (Óptima)</span>
        </div>
      </div>
    </div>
  );
}
