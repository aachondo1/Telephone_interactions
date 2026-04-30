import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

export function QueueWaitDistribution({ records }: Props) {
  const filtered = records.filter(r =>
    r.flow_exit !== false &&
    r.agent_id !== null &&
    r.attended === false
  );

  const buckets = [
    { label: '<10s', min: 0, max: 10 },
    { label: '10-20s', min: 10, max: 20 },
    { label: '20-30s', min: 20, max: 30 },
    { label: '30-60s', min: 30, max: 60 },
    { label: '60-120s', min: 60, max: 120 },
    { label: '120-300s', min: 120, max: 300 },
    { label: '300-600s', min: 300, max: 600 },
    { label: '>600s', min: 600, max: Infinity },
  ];

  const data = buckets.map(b => {
    const count = filtered.filter(r => {
      const qt = r.queue_time_seconds ?? 0;
      return qt >= b.min && qt < b.max;
    }).length;
    return { label: b.label, count };
  });

  const total = filtered.length;

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
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
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
          <p className="text-2xl font-bold text-emerald-600">
            {Math.round(
              (filtered.filter(r => (r.queue_time_seconds ?? 0) <= 20).length / total) * 100
            )}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">20-60s</p>
          <p className="text-2xl font-bold text-amber-600">
            {Math.round(
              (filtered.filter(r => {
                const qt = r.queue_time_seconds ?? 0;
                return qt > 20 && qt <= 60;
              }).length / total) * 100
            )}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">{'>'}60s</p>
          <p className="text-2xl font-bold text-red-600">
            {Math.round(
              (filtered.filter(r => (r.queue_time_seconds ?? 0) > 60).length / total) * 100
            )}%
          </p>
        </div>
      </div>
    </div>
  );
}
