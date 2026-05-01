import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { calculateQueueWaitDistribution } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

export function QueueWaitDistribution({ records }: Props) {
  const distribution = calculateQueueWaitDistribution(records ?? []);
  const { buckets, slPercent, midPercent, longPercent, totalValidCalls } = distribution;

  console.log("Registros filtrados:", totalValidCalls);

  // Guard against empty data
  if (!buckets || buckets.length === 0 || totalValidCalls === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No hay datos de asignaciones fallidas para este periodo.</p>
        </div>
      </div>
    );
  }

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
        <BarChart data={buckets} margin={{ top: 20, right: 10, bottom: 0, left: 0 }}>
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
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#65646A',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
            }}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          >
            {buckets.map((entry, index) => {
              // Gradient colors: BICE green for SL zone, smooth amber gradient for recovery, soft red for losses
              const getBarColor = () => {
                if (entry.label === '<10s') return '#84BD00'; // bice-green
                if (entry.label === '10-20s') return '#9ac924'; // bice-green lighter
                if (entry.label === '20-30s') return '#fbbf24'; // amber lighter
                if (entry.label === '30-60s') return '#f59e0b'; // amber
                if (entry.label === '60-120s') return '#f87171'; // red lighter
                if (entry.label === '120-300s') return '#ef4444'; // red
                return '#dc2626'; // red darker for very long waits
              };
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor()}
                />
              );
            })}
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
          <p className="text-xs text-slate-500 mt-1">&gt;60 segundos</p>
        </div>
        <div className="text-center bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-slate-400 font-semibold">📊 Potencial</p>
          <p className="text-2xl font-bold text-blue-600 font-mono">{totalValidCalls > 0 ? Math.round((recoveryPotential / totalValidCalls) * 100) : 0}%</p>
          <p className="text-xs text-slate-500 mt-1">{recoveryPotential} llamadas</p>
        </div>
      </div>
    </div>
  );
}
