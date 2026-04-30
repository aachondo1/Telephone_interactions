import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { calculateQueueWaitDistribution } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

export function QueueWaitDistribution({ records }: Props) {
  const distribution = calculateQueueWaitDistribution(records);
  const { buckets, slPercent, midPercent, longPercent } = distribution;

  // Recovery potential: calls in 10-60s window (closest to SL threshold)
  const recoveryPotential = buckets
    .filter(b =>
      (b.label.includes('10-20') ||
       b.label.includes('20-30') ||
       b.label.includes('30-60'))
    )
    .reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">📊 Análisis de Fugas: Espera tras Asignación</h3>
        <p className="text-xs text-slate-400 mt-0.5">Llamadas asignadas a agente pero no atendidas - Zona de recuperación (&lt;60s): {recoveryPotential} llamadas</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: 0 }}>
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
          <ReferenceLine
            y={0}
            stroke="#f1f5f9"
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString('es-CL'), 'Llamadas']}
            labelFormatter={(label) => `${label}`}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          >
            {buckets.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.label === '<10s' || entry.label === '10-20s' ? '#84BD00' // bice-green for SL zone
                    : entry.label === '20-30s' || entry.label === '30-60s' ? '#f59e0b' // amber for recovery zone
                      : '#ef4444' // red for long waits (>60s)
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-6 grid grid-cols-4 gap-3">
        <div className="text-center bg-emerald-50 rounded-lg p-3">
          <p className="text-xs text-slate-400 font-semibold">✓ SL Cumplido</p>
          <p className="text-2xl font-bold text-bice-green font-mono">{slPercent}%</p>
          <p className="text-xs text-slate-500 mt-1">&le;20 segundos</p>
        </div>
        <div className="text-center bg-amber-50 rounded-lg p-3 border-2 border-amber-200">
          <p className="text-xs text-slate-400 font-semibold">⚠ Recuperable</p>
          <p className="text-2xl font-bold text-amber-600 font-mono">{midPercent}%</p>
          <p className="text-xs text-slate-500 mt-1">20-60 seg</p>
        </div>
        <div className="text-center bg-red-50 rounded-lg p-3">
          <p className="text-xs text-slate-400 font-semibold">✗ Perdido</p>
          <p className="text-2xl font-bold text-red-600 font-mono">{longPercent}%</p>
          <p className="text-xs text-slate-500 mt-1">{'>'}60 segundos</p>
        </div>
        <div className="text-center bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-slate-400 font-semibold">📊 Potencial</p>
          <p className="text-2xl font-bold text-blue-600 font-mono">{total > 0 ? Math.round((recoveryPotential / total) * 100) : 0}%</p>
          <p className="text-xs text-slate-500 mt-1">{recoveryPotential} llamadas</p>
        </div>
      </div>
    </div>
  );
}
