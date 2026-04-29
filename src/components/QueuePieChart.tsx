import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
};

const COLORS = [
  '#0ea5e9', '#06b6d4', '#0284c7', '#38bdf8',
  '#0369a1', '#22d3ee', '#7dd3fc', '#075985',
  '#bae6fd', '#0c4a6e',
];

export function QueuePieChart({ stats }: Props) {
  const top = stats.slice(0, 8);
  const othersDuration = stats.slice(8).reduce((acc, q) => acc + q.totalDurationSeconds, 0);
  const totalAll = stats.reduce((acc, q) => acc + q.totalDurationSeconds, 0);

  const data = [
    ...top.map(q => ({ name: q.queue, value: q.totalDurationSeconds })),
    ...(othersDuration > 0 ? [{ name: 'Otras', value: othersDuration }] : []),
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribución de carga por cola</h3>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, props) => [
              `${formatDuration(Number(value))} (${Math.round((Number(value) / totalAll) * 100)}%)`,
              (props as { payload?: { name?: string } }).payload?.name,
            ]}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 13 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value: string) =>
              value.length > 20 ? value.slice(0, 20) + '…' : value
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
