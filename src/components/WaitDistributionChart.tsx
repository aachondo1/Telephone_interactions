import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { calculateAttendedWaitDistribution } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

export function WaitDistributionChart({ records }: Props) {
  const distribution = calculateAttendedWaitDistribution(records ?? []);
  const { buckets, averageWaitTime, totalAttendedCalls, slZone, midZone, warningZone, criticalZone } = distribution;

  if (!buckets || buckets.length === 0 || totalAttendedCalls === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No hay datos de llamadas atendidas para este periodo.</p>
        </div>
      </div>
    );
  }

  // Format average wait time for display
  const formatSeconds = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700">📊 Distribución de Espera en Atendidas</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Tiempo que las {totalAttendedCalls.toLocaleString('es-CL')} llamadas atendidas esperaron en cola antes de ser conectadas
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={buckets} margin={{ top: 30, right: 10, bottom: 5, left: 0 }}>
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
            label={{ value: 'Llamadas', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                const percentage = totalAttendedCalls > 0 ? Math.round((data.count / totalAttendedCalls) * 100) : 0;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-slate-700">{data.label}</p>
                    <p className="text-sm text-slate-600">{data.count} llamadas</p>
                    <p className="text-sm text-slate-600">{percentage}% del total</p>
                    {data.count > 0 && (
                      <>
                        {data.label === '+10m' || data.label === '2-5m' || data.label === '1-2m' ? (
                          <p className="text-xs text-red-600 font-semibold mt-1">⚠ Fuera de objetivo</p>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Reference line showing average wait time */}
          <ReferenceLine
            y={averageWaitTime}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `Promedio: ${formatSeconds(averageWaitTime)}`,
              position: 'top',
              fill: '#ef4444',
              fontSize: 12,
              fontWeight: 'bold',
              offset: 10,
            }}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          >
            {buckets.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary metrics */}
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold">✓ 0-20s</p>
            <p className="text-2xl font-bold text-bice-green">{slZone}</p>
            <p className="text-xs text-slate-500 mt-1">{totalAttendedCalls > 0 ? Math.round((slZone / totalAttendedCalls) * 100) : 0}%</p>
          </div>
          <div className="text-center bg-green-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold">✓ 21-40s</p>
            <p className="text-2xl font-bold text-green-600">{midZone}</p>
            <p className="text-xs text-slate-500 mt-1">{totalAttendedCalls > 0 ? Math.round((midZone / totalAttendedCalls) * 100) : 0}%</p>
          </div>
          <div className="text-center bg-amber-50 rounded-lg p-3 border-2 border-amber-200">
            <p className="text-xs text-slate-400 font-semibold">⚠ 41s-2m</p>
            <p className="text-2xl font-bold text-amber-600">{warningZone}</p>
            <p className="text-xs text-slate-500 mt-1">{totalAttendedCalls > 0 ? Math.round((warningZone / totalAttendedCalls) * 100) : 0}%</p>
          </div>
          <div className="text-center bg-red-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold">✗ &gt;2m</p>
            <p className="text-2xl font-bold text-red-600">{criticalZone}</p>
            <p className="text-xs text-slate-500 mt-1">{totalAttendedCalls > 0 ? Math.round((criticalZone / totalAttendedCalls) * 100) : 0}%</p>
          </div>
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-semibold">📊 Promedio</p>
            <p className="text-2xl font-bold text-blue-600">{formatSeconds(averageWaitTime)}</p>
            <p className="text-xs text-slate-500 mt-1">Tiempo esperado</p>
          </div>
        </div>

        {/* Interpretation guide */}
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 text-sm text-sky-800">
          <p className="font-semibold mb-2">💡 ¿Cómo leer este gráfico?</p>
          <p className="text-xs text-sky-700 leading-relaxed">
            Este gráfico muestra la calidad de la experiencia exitosa: cuánto esperaron nuestros clientes atendidos en la cola.
            Si el volumen se desplaza hacia la derecha (&gt;2m), aunque estemos atendiendo llamadas, la experiencia es deficiente
            y estamos en riesgo de conversión a abandonos. La línea roja punteada indica el tiempo promedio: si es alta pero
            el promedio está en 2 minutos, significa operación de "dos velocidades" - algunos clientes atienden muy rápido,
            pero otros sufren esperas desproporcionadas.
          </p>
        </div>
      </div>
    </div>
  );
}
