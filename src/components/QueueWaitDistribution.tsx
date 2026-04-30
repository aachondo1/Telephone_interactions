import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { calculateQueueWaitDistribution } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

export function QueueWaitDistribution({ records }: Props) {
  const distribution = calculateQueueWaitDistribution(records);
  const { buckets, slPercent, midPercent, longPercent } = distribution;

  const data = buckets;
  const total = distribution.totalValidCalls;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Distribución de tiempos de espera</h3>
        <p className="text-xs text-slate-400 mt-0.5">Segundos en cola</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString('es-CL'), 'Llamadas']}
            labelFormatter={(label) => `${label}`}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
          />
          <Bar
            dataKey="count"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs text-slate-400">≤20s (SL)</p>
          <p className="text-2xl font-bold text-emerald-600">{slPercent}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">20-60s</p>
          <p className="text-2xl font-bold text-amber-600">{midPercent}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">{'>'}60s</p>
          <p className="text-2xl font-bold text-red-600">{longPercent}%</p>
        </div>
      </div>
    </div>
  );
}
