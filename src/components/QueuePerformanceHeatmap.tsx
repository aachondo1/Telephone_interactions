import { useState, useMemo } from 'react';
import type { QueueHeatmapData } from '../lib/kpi';

const WEEKDAY_TABS = [
  { label: 'Todos', weekday: -1 },
  { label: 'Lun', weekday: 1 },
  { label: 'Mar', weekday: 2 },
  { label: 'Mié', weekday: 3 },
  { label: 'Jue', weekday: 4 },
  { label: 'Vie', weekday: 5 },
];

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8..18

function getColor(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return '#ffffff';
  const ratio = count / maxCount;

  if (ratio < 0.25) return '#e0f2fe';
  if (ratio < 0.5) return '#bae6fd';
  if (ratio < 0.75) return '#7dd3fc';
  return '#0c4a6e';
}

export default function QueuePerformanceHeatmap({ data }: { data: QueueHeatmapData }) {
  const [selectedTab, setSelectedTab] = useState(0);

  const filteredData = useMemo(() => {
    if (data.data.length === 0) return data;

    if (selectedTab === 0) {
      const aggregatedData = data.data.map(row => {
        const hourMap = new Map<number, number>();
        for (const cell of row.cells) {
          hourMap.set(cell.hour, (hourMap.get(cell.hour) ?? 0) + cell.count);
        }
        const cells = Array.from(hourMap.entries()).map(([hour, count]) => ({
          hour,
          weekday: 0,
          count,
        }));
        return { ...row, cells };
      });
      const maxCount = Math.max(
        ...aggregatedData.flatMap(row => row.cells.map(c => c.count))
      );
      return { data: aggregatedData, maxCount };
    }

    const weekday = WEEKDAY_TABS[selectedTab].weekday;
    return {
      ...data,
      data: data.data.map(row => ({
        ...row,
        cells: row.cells.filter(cell => cell.weekday === weekday),
      })),
    };
  }, [data, selectedTab]);

  if (filteredData.data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Rendimiento de Colas por Hora
        </h3>
        <div className="text-slate-500 text-center py-8">No hay datos disponibles</div>
      </div>
    );
  }

  const numHours = HOURS.length; // 11
  const cellSize = 20;
  const gap = 1;
  const leftMargin = 220;
  const topMargin = 50;
  const gridWidth = leftMargin + (numHours * cellSize) + ((numHours - 1) * gap) + 20;
  const gridHeight = topMargin + (filteredData.data.length * cellSize) + ((filteredData.data.length - 1) * gap) + 40;

  const getHourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Rendimiento de Colas por Hora
        </h3>

        <div className="flex gap-2 flex-wrap">
          {WEEKDAY_TABS.map((tab, index) => (
            <button
              key={index}
              onClick={() => setSelectedTab(index)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedTab === index
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={gridWidth} height={gridHeight} className="mx-auto">
          <defs>
            <style>{`
              .heatmap-cell:hover { opacity: 0.8; }
              .heatmap-tooltip { pointer-events: none; }
              .heatmap-label { font-size: 12px; }
            `}</style>
          </defs>

          {/* Hour labels */}
          {HOURS.map((h, idx) => (
            <text
              key={`hour-${h}`}
              x={leftMargin + idx * (cellSize + gap) + cellSize / 2}
              y={topMargin - 8}
              textAnchor="middle"
              className="heatmap-label text-slate-600"
              fill="#475569"
            >
              {(h - 8) % 2 === 0 ? getHourLabel(h) : ''}
            </text>
          ))}

          {/* Queue rows */}
          {filteredData.data.map((row, queueIndex) => {
            const queueName = row.queue.length > 35 ? row.queue.substring(0, 32) + '...' : row.queue;

            return (
              <g key={`queue-${queueIndex}`}>
                {/* Queue label */}
                <text
                  x={leftMargin - 10}
                  y={topMargin + queueIndex * (cellSize + gap) + cellSize / 2 + 5}
                  textAnchor="end"
                  className="heatmap-label text-slate-600"
                  fill="#475569"
                >
                  {queueName}
                </text>

                {/* Heatmap cells */}
                {HOURS.map((hour, idx) => {
                  const cell = row.cells.find(c => c.hour === hour);
                  const count = cell?.count ?? 0;
                  const x = leftMargin + idx * (cellSize + gap);
                  const y = topMargin + queueIndex * (cellSize + gap);
                  const title = selectedTab === 0
                    ? `${row.queue}, ${getHourLabel(hour)}: ${count}`
                    : `${row.queue}, ${getHourLabel(hour)}, ${WEEKDAY_TABS[selectedTab].label}: ${count}`;

                  return (
                    <g key={`cell-${hour}`}>
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill={getColor(count, filteredData.maxCount)}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        className="heatmap-cell"
                        style={{ cursor: 'pointer' }}
                      />
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
      <div className="mt-6 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Mínimo</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e0f2fe' }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#bae6fd' }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7dd3fc' }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0c4a6e' }} />
          </div>
          <span className="text-xs text-slate-600">Máximo ({filteredData.maxCount})</span>
        </div>
      </div>
    </div>
  );
}
