import { useState, useMemo } from 'react';
import type { QueueUnattendedHeatmapData } from '../lib/kpi';

const WEEKDAY_TABS = [
  { label: 'Todos', weekday: -1 },
  { label: 'Lun', weekday: 1 },
  { label: 'Mar', weekday: 2 },
  { label: 'Mié', weekday: 3 },
  { label: 'Jue', weekday: 4 },
  { label: 'Vie', weekday: 5 },
];

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8..18

function getRateColor(rate: number): string {
  if (rate < 0) return '#f8fafc'; // sin datos
  if (rate === 0) return '#f0fdf4';
  if (rate < 10) return '#bbf7d0';
  if (rate < 25) return '#fef9c3';
  if (rate < 50) return '#fde68a';
  if (rate < 75) return '#fca5a5';
  return '#dc2626';
}

export default function QueueUnattendedHeatmap({ data }: { data: QueueUnattendedHeatmapData }) {
  const [selectedTab, setSelectedTab] = useState(0);

  const filteredData = useMemo(() => {
    if (data.data.length === 0) return data;

    if (selectedTab === 0) {
      return {
        data: data.data.map(row => {
          const hourMap = new Map<number, { total: number; unattended: number }>();
          for (const cell of row.cells) {
            const cur = hourMap.get(cell.hour) ?? { total: 0, unattended: 0 };
            hourMap.set(cell.hour, {
              total: cur.total + cell.total,
              unattended: cur.unattended + cell.unattended,
            });
          }
          const cells = Array.from(hourMap.entries()).flatMap(([hour, stats]) => [{
            hour,
            weekday: 0,
            ...stats,
            rate: stats.total > 0 ? Math.round((stats.unattended / stats.total) * 100) : -1,
          }]);
          return { ...row, cells };
        }),
      };
    }

    const weekday = WEEKDAY_TABS[selectedTab].weekday;
    return {
      data: data.data.map(row => ({
        ...row,
        cells: row.cells.filter(c => c.weekday === weekday),
      })),
    };
  }, [data, selectedTab]);

  if (filteredData.data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Tasa de No Atendidas por Cola y Hora
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
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">
          Tasa de No Atendidas por Cola y Hora
        </h3>
        <p className="text-xs text-slate-400 mb-4">% de llamadas no atendidas por franja horaria</p>

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
          {/* Hour labels */}
          {HOURS.map((h, idx) => (
            <text
              key={`hour-${h}`}
              x={leftMargin + idx * (cellSize + gap) + cellSize / 2}
              y={topMargin - 8}
              textAnchor="middle"
              fontSize={12}
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
                <text
                  x={leftMargin - 10}
                  y={topMargin + queueIndex * (cellSize + gap) + cellSize / 2 + 5}
                  textAnchor="end"
                  fontSize={12}
                  fill="#475569"
                >
                  {queueName}
                </text>

                {HOURS.map((hour, idx) => {
                  const cell = row.cells.find(c => c.hour === hour);
                  const rate = cell?.rate ?? -1;
                  const total = cell?.total ?? 0;
                  const unattended = cell?.unattended ?? 0;
                  const x = leftMargin + idx * (cellSize + gap);
                  const y = topMargin + queueIndex * (cellSize + gap);
                  const tooltipText = rate < 0
                    ? `${row.queue}, ${getHourLabel(hour)}: sin datos`
                    : `${row.queue}, ${getHourLabel(hour)}: ${rate}% no atendidas (${unattended}/${total})`;

                  return (
                    <g key={`cell-${hour}`}>
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill={getRateColor(rate)}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        style={{ cursor: 'pointer' }}
                      />
                      <title>{tooltipText}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500">% No atendidas:</span>
        {[
          { color: '#f0fdf4', label: '0%' },
          { color: '#bbf7d0', label: '<10%' },
          { color: '#fef9c3', label: '<25%' },
          { color: '#fde68a', label: '<50%' },
          { color: '#fca5a5', label: '<75%' },
          { color: '#dc2626', label: '≥75%' },
          { color: '#f8fafc', label: 'Sin datos', border: true },
        ].map(({ color, label, border }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color, border: border ? '1px solid #cbd5e1' : undefined }}
            />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
