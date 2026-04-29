import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ExecutiveDailyTalkTime } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  data: ExecutiveDailyTalkTime[];
  executives: string[];
};

const EXEC_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export function ExecutiveTalkTimeByDay({ data, executives }: Props) {
  if (executives.length === 0 || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center h-48">
        <p className="text-slate-400 text-sm">Sin datos de tiempo en teléfono</p>
      </div>
    );
  }

  const chartData = data.map(row => {
    const mapped: Record<string, number | string> = { label: fmtDate(row.date), date: row.date };
    for (const exec of executives) {
      mapped[exec] = Math.round((row[exec] as number) / 60);
    }
    return mapped;
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Tiempo en teléfono por día</h3>
        <p className="text-xs text-slate-400 mt-0.5">Minutos totales en llamadas atendidas · Top 5 ejecutivos</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            unit=" min"
          />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value)} min (${formatDuration(Number(value) * 60)})`,
              name,
            ]}
            labelFormatter={(label, payload) => {
              const p = (payload as unknown as {payload?: {date?: string}}[])?.[0]?.payload;
              return p?.date ? `Fecha: ${p.date}` : String(label);
            }}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {executives.map((exec, i) => (
            <Line
              key={exec}
              type="monotone"
              dataKey={exec}
              stroke={EXEC_COLORS[i % EXEC_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
