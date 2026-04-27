import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ExecutiveWeekdayTalkTime } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  data: ExecutiveWeekdayTalkTime[];
  executives: string[];
  allExecutives: string[];
};

const EXEC_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ExecutiveTalkTimeByWeekday({ data, executives, allExecutives }: Props) {
  const [showAll, setShowAll] = useState(false);
  const displayExecutives = showAll ? allExecutives : executives;

  if (allExecutives.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Sin datos de tiempo en teléfono</p>
      </div>
    );
  }

  const chartData = data.map(row => {
    const mapped: Record<string, number | string> = { label: row.label };
    for (const exec of displayExecutives) {
      mapped[exec] = Math.round((row[exec] as number) / 60);
    }
    return mapped;
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Tiempo en teléfono por día de la semana</h3>
          <p className="text-xs text-slate-400 mt-0.5">Minutos totales en llamadas atendidas · {showAll ? allExecutives.length + ' ejecutivos' : 'Top 5 ejecutivos'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAll(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !showAll
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Top 5
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showAll
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            unit=" min"
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} min (${formatDuration(value * 60)})`,
              name,
            ]}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {displayExecutives.map((exec, i) => (
            <Bar
              key={exec}
              dataKey={exec}
              stackId="a"
              fill={EXEC_COLORS[i % EXEC_COLORS.length]}
              maxBarSize={40}
              radius={i === displayExecutives.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
