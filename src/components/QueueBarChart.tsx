import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
};

const COLORS = [
  '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd',
  '#0284c7', '#0369a1', '#075985', '#0c4a6e',
  '#06b6d4', '#22d3ee',
];

export function QueueBarChart({ stats }: Props) {
  const data = stats.slice(0, 10).map(q => ({
    queue: q.queue.length > 22 ? q.queue.slice(0, 22) + '…' : q.queue,
    fullName: q.queue,
    tiempo: q.totalDurationSeconds,
  }));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Colas por tiempo total</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="queue"
            width={130}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [formatDuration(value), 'Tiempo']}
            labelFormatter={(_: unknown, payload: {payload?: {fullName?: string}}[]) =>
              payload?.[0]?.payload?.fullName ?? ''
            }
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 13 }}
          />
          <Bar dataKey="tiempo" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
