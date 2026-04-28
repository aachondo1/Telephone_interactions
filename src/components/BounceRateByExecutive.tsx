import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ExecutiveStat } from '../lib/kpi';

type Props = {
  executives: ExecutiveStat[];
};

export function BounceRateByExecutive({ executives }: Props) {
  const data = executives
    .filter(e => e.executive !== 'SIN ATENDER' && e.bounceCount > 0)
    .map(e => ({
      name: e.executive,
      bounceRate: e.bounceRate,
      bounceCount: e.bounceCount,
      totalCalls: e.count,
    }))
    .sort((a, b) => b.bounceRate - a.bounceRate)
    .slice(0, 15);

  const avgBounceRate = data.length > 0
    ? Math.round(data.reduce((a, b) => a + b.bounceRate, 0) / data.length)
    : 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Tasa de rebote por ejecutivo</h3>
        <p className="text-xs text-slate-400 mt-0.5">% de llamadas que no fue contestada a la primera · Top 15</p>
      </div>
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Sin datos de rebote</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 100 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={95}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'bounceRate') return [`${value}%`, 'Tasa'];
                  if (name === 'bounceCount') return [(value).toLocaleString('es-CL'), 'Rebotes'];
                  return [value, name];
                }}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="bounceRate" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-400">Promedio</p>
              <p className="text-2xl font-bold text-slate-800">{avgBounceRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Máximo</p>
              <p className="text-2xl font-bold text-amber-600">{Math.max(...data.map(d => d.bounceRate))}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Total rebotes</p>
              <p className="text-2xl font-bold text-slate-800">{data.reduce((a, b) => a + b.bounceCount, 0).toLocaleString('es-CL')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
