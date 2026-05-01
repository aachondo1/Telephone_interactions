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

  // Coherence check: Sum of buckets MUST equal totalValidCalls
  const sumBuckets = buckets.reduce((sum, b) => sum + b.count, 0);
  const isCoherent = sumBuckets === totalValidCalls;

  if (!isCoherent) {
    console.warn(`⚠️ INCOHERENCIA EN DISTRIBUCIÓN: suma buckets (${sumBuckets}) ≠ totalValidCalls (${totalValidCalls})`);
  }

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
        <h3 className="text-sm font-semibold text-slate-700">📊 Zoom: Distribución de Abandonos Reales (Nivel 3)</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Desglose detallado de las {totalValidCalls} llamadas abandonadas del embudo (≥5s en cola/alerta)
        </p>
        <p className="text-xs text-slate-500 mt-1.5">
          💡 <strong>Zona de recuperación (&lt;60s):</strong> {recoveryPotential} llamadas ({totalValidCalls > 0 ? Math.round((recoveryPotential / totalValidCalls) * 100) : 0}%) - clientes con baja frustración, rescatables con mejor SL
        </p>
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
      <div className="mt-6 space-y-4">
        {/* Primary metrics row */}
        <div className="grid grid-cols-4 gap-3">
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

        {/* Time threshold breakdowns */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-400 font-semibold mb-2">120 segundos (2 min)</p>
            {(() => {
              const count120 = buckets
                .filter(b => b.label === '<10s' || b.label === '10-20s' || b.label === '20-30s' || b.label === '30-60s' || b.label === '60-120s')
                .reduce((sum, b) => sum + b.count, 0);
              const pct120 = totalValidCalls > 0 ? Math.round((count120 / totalValidCalls) * 100) : 0;
              return (
                <>
                  <p className="text-lg font-bold text-slate-700">{pct120}%</p>
                  <p className="text-xs text-slate-500 mt-1">{count120} / {totalValidCalls} llamadas</p>
                  <p className="text-xs text-slate-400 mt-1">Dentro de 2 minutos</p>
                </>
              );
            })()}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-400 font-semibold mb-2">300 segundos (5 min)</p>
            {(() => {
              const count300 = buckets
                .filter(b => {
                  const labels = ['<10s', '10-20s', '20-30s', '30-60s', '60-120s', '120-300s'];
                  return labels.includes(b.label);
                })
                .reduce((sum, b) => sum + b.count, 0);
              const pct300 = totalValidCalls > 0 ? Math.round((count300 / totalValidCalls) * 100) : 0;
              return (
                <>
                  <p className="text-lg font-bold text-slate-700">{pct300}%</p>
                  <p className="text-xs text-slate-500 mt-1">{count300} / {totalValidCalls} llamadas</p>
                  <p className="text-xs text-slate-400 mt-1">Dentro de 5 minutos</p>
                </>
              );
            })()}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-400 font-semibold mb-2">600 segundos (10 min)</p>
            {(() => {
              const count600 = buckets
                .filter(b => {
                  const labels = ['<10s', '10-20s', '20-30s', '30-60s', '60-120s', '120-300s', '300-600s'];
                  return labels.includes(b.label);
                })
                .reduce((sum, b) => sum + b.count, 0);
              const pct600 = totalValidCalls > 0 ? Math.round((count600 / totalValidCalls) * 100) : 0;
              return (
                <>
                  <p className="text-lg font-bold text-slate-700">{pct600}%</p>
                  <p className="text-xs text-slate-500 mt-1">{count600} / {totalValidCalls} llamadas</p>
                  <p className="text-xs text-slate-400 mt-1">Dentro de 10 minutos</p>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
