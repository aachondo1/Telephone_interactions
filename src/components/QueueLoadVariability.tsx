import { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { QueueVariabilityData } from '../lib/kpi';

type Props = {
  data: QueueVariabilityData;
};

export function QueueLoadVariability({ data }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (data.queues.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Variabilidad de Carga por Hora
        </h3>
        <div className="text-slate-500 text-center py-8">No hay datos disponibles</div>
      </div>
    );
  }

  const selected = data.queues[selectedIndex];

  // Para el gráfico de rango usamos dos barras apiladas:
  // - "base" (invisible): altura = min
  // - "rango" (visible): altura = max - min
  const chartData = selected.hourlyStats.map(s => ({
    label: s.label,
    base: s.min,
    rango: Math.max(s.max - s.min, s.max > 0 ? 1 : 0),
    promedio: s.avg,
    min: s.min,
    max: s.max,
  }));

  const hasActivity = selected.hourlyStats.some(s => s.max > 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Variabilidad de Carga por Hora
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Rango min–máx de llamadas entre días · línea = promedio diario
          </p>
        </div>
        <select
          value={selectedIndex}
          onChange={e => setSelectedIndex(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 max-w-xs"
        >
          {data.queues.map((q, i) => (
            <option key={q.queue} value={i}>
              {q.queue}
            </option>
          ))}
        </select>
      </div>

      {!hasActivity ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          Sin actividad registrada para esta cola
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1">
                    <p className="font-semibold text-slate-700 mb-1">{label}</p>
                    <p className="text-slate-500">Mín: <span className="font-medium text-slate-700">{d.min}</span></p>
                    <p className="text-slate-500">Máx: <span className="font-medium text-slate-700">{d.max}</span></p>
                    <p className="text-sky-600">Promedio: <span className="font-semibold">{d.promedio}</span></p>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => value === 'rango' ? 'Rango (min–máx)' : 'Promedio'}
            />
            {/* Barra base invisible para "elevar" el rango al nivel de min */}
            <Bar dataKey="base" stackId="range" fill="transparent" legendType="none" />
            {/* Rango visible */}
            <Bar dataKey="rango" stackId="range" fill="#bae6fd" radius={[2, 2, 0, 0]} maxBarSize={28} name="rango" />
            {/* Línea de promedio */}
            <Line
              type="monotone"
              dataKey="promedio"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#0ea5e9' }}
              name="promedio"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 flex items-center gap-6 text-xs text-slate-500 justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-sky-200" />
          <span>Rango entre días (min–máx)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 border-t-2 border-sky-500" />
          <span>Promedio diario</span>
        </div>
      </div>
    </div>
  );
}
