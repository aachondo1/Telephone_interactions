import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ServiceLevelData } from '../lib/kpi';

type Props = {
  data: ServiceLevelData;
};

export function ServiceLevelChart({ data }: Props) {
  const slColor = (sl: number) => {
    if (sl >= 80) return '#10b981';
    if (sl >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Service Level por hora</h3>
        <p className="text-xs text-slate-400 mt-0.5">% de llamadas atendidas en ≤20s · Meta: 80%</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.points} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
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
            unit="%"
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value: number) => `${value}%`}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
          />
          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Meta 80%', position: 'right', fill: '#10b981', fontSize: 11 }} />
          <Bar
            dataKey="serviceLevel"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          >
            {data.points.map((p, i) => (
              <Bar key={i} dataKey="serviceLevel" fill={slColor(p.serviceLevel)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs text-slate-400">SL Global</p>
          <p className="text-2xl font-bold text-slate-800">{data.overallSL}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Llamadas en cola</p>
          <p className="text-2xl font-bold text-slate-800">{data.points.reduce((a, b) => a + b.totalInQueue, 0).toLocaleString('es-CL')}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Atendidas ≤20s</p>
          <p className="text-2xl font-bold text-slate-800">{data.points.reduce((a, b) => a + b.answeredWithin20s, 0).toLocaleString('es-CL')}</p>
        </div>
      </div>
    </div>
  );
}
