import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

export function AbandonClassificationChart({ records }: Props) {
  const queueData = new Map<string, { queue: string; total: number; inQueue: number; inAlert: number; inIvr: number }>();

  for (const r of records) {
    if (r.attended) continue;
    const q = r.queue || 'Sin cola';
    if (!queueData.has(q)) {
      queueData.set(q, { queue: q, total: 0, inQueue: 0, inAlert: 0, inIvr: 0 });
    }
    const data = queueData.get(q)!;
    data.total += 1;
    if (r.abandon_type === 'queue') data.inQueue += 1;
    else if (r.abandon_type === 'alert') data.inAlert += 1;
    else if (r.abandon_type === 'ivr') data.inIvr += 1;
  }

  const chartData = Array.from(queueData.values())
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const totalAbandons = records.filter(r => !r.attended).length;
  const abandonStats = {
    queue: records.filter(r => !r.attended && r.abandon_type === 'queue').length,
    alert: records.filter(r => !r.attended && r.abandon_type === 'alert').length,
    ivr: records.filter(r => !r.attended && r.abandon_type === 'ivr').length,
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Clasificación de abandonos</h3>
        <p className="text-xs text-slate-400 mt-0.5">Dónde se perdieron las llamadas · Top 10 colas</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 80 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis
            dataKey="queue"
            type="category"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip
            formatter={(value) => Number(value).toLocaleString('es-CL')}
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Bar dataKey="inQueue" stackId="a" fill="#ef4444" name="En cola" radius={[0, 4, 4, 0]} />
          <Bar dataKey="inAlert" stackId="a" fill="#f59e0b" name="En alerta" radius={[0, 4, 4, 0]} />
          <Bar dataKey="inIvr" stackId="a" fill="#8b5cf6" name="En IVR" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-xs text-slate-400">Total abandonos</p>
          <p className="text-2xl font-bold text-slate-800">{totalAbandons.toLocaleString('es-CL')}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">En cola</p>
          <p className="text-2xl font-bold text-red-600">{abandonStats.queue}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalAbandons > 0 ? Math.round((abandonStats.queue / totalAbandons) * 100) : 0}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">En alerta</p>
          <p className="text-2xl font-bold text-amber-600">{abandonStats.alert}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalAbandons > 0 ? Math.round((abandonStats.alert / totalAbandons) * 100) : 0}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">En IVR</p>
          <p className="text-2xl font-bold text-purple-600">{abandonStats.ivr}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalAbandons > 0 ? Math.round((abandonStats.ivr / totalAbandons) * 100) : 0}%</p>
        </div>
      </div>
    </div>
  );
}
