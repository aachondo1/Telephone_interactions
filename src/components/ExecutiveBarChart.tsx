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
import type { ExecutiveStat } from '../lib/kpi';

type Props = {
  stats: ExecutiveStat[];
};

const COLORS = [
  '#10b981', '#34d399', '#6ee7b7', '#059669',
  '#047857', '#065f46', '#a7f3d0', '#d1fae5',
  '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4',
  '#0891b2', '#06b6d4', '#22d3ee',
];

export function ExecutiveBarChart({ stats }: Props) {
  const data = stats
    .filter(e => e.executive !== 'SIN ATENDER')
    .slice(0, 15)
    .map(e => ({
      name: e.executive.length > 14 ? e.executive.slice(0, 14) + '…' : e.executive,
      fullName: e.executive,
      llamadas: e.count,
    }));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Ejecutivos por volumen de llamadas</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString('es-CL'), 'Llamadas']}
            labelFormatter={(_, payload) => {
              const p = (payload as unknown as {payload?: {fullName?: string}}[])?.[0]?.payload;
              return p?.fullName ?? '';
            }}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 13 }}
          />
          <Bar dataKey="llamadas" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
