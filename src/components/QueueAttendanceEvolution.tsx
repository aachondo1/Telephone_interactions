import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { QueueAttendanceEvolutionData } from '../lib/kpi';

type Props = {
  data: QueueAttendanceEvolutionData;
};

const QUEUE_COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

type Granularity = 'weekly' | 'monthly';

export function QueueAttendanceEvolution({ data }: Props) {
  const [granularity, setGranularity] = useState<Granularity>('weekly');
  const [visibleQueues, setVisibleQueues] = useState<Set<string>>(new Set(data.queues.slice(0, 5)));

  const periods = granularity === 'weekly' ? data.weeklyPeriods : data.monthlyPeriods;

  if (data.queues.length === 0 || periods.length < 2) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Evolución de Tasa de Atención
        </h3>
        <div className="text-slate-400 text-sm text-center py-12">
          {periods.length < 2
            ? 'Se necesitan al menos dos períodos para mostrar la evolución'
            : 'Sin datos disponibles'}
        </div>
      </div>
    );
  }

  function toggleQueue(queue: string) {
    setVisibleQueues(prev => {
      const next = new Set(prev);
      if (next.has(queue)) {
        if (next.size > 1) next.delete(queue);
      } else {
        next.add(queue);
      }
      return next;
    });
  }

  // Determinar si un período tiene datos para una cola visible
  const hasAnyData = periods.some(p =>
    data.queues.some(q => visibleQueues.has(q) && p[q] !== null && p[q] !== undefined)
  );

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Evolución de Tasa de Atención
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            % de llamadas atendidas por {granularity === 'weekly' ? 'semana' : 'mes'} · puntos discontinuos = semanas con &lt;5 llamadas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGranularity('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              granularity === 'weekly'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setGranularity('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              granularity === 'monthly'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Mensual
          </button>
        </div>
      </div>

      {/* Selector de colas */}
      <div className="flex flex-wrap gap-2 mb-5">
        {data.queues.map((queue, i) => {
          const active = visibleQueues.has(queue);
          return (
            <button
              key={queue}
              onClick={() => toggleQueue(queue)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? 'border-transparent text-white'
                  : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300'
              }`}
              style={active ? { backgroundColor: QUEUE_COLORS[i % QUEUE_COLORS.length] } : {}}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: active ? 'white' : QUEUE_COLORS[i % QUEUE_COLORS.length] }}
              />
              {queue.length > 22 ? queue.slice(0, 20) + '…' : queue}
            </button>
          );
        })}
      </div>

      {!hasAnyData ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          Sin datos suficientes para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={periods} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={granularity === 'weekly' ? Math.max(0, Math.floor(periods.length / 10)) : 0}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              width={40}
            />
            <ReferenceLine
              y={80}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: 'Meta 80%', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const validPayload = payload.filter(p => p.value !== null && p.value !== undefined);
                if (validPayload.length === 0) return null;
                return (
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl px-4 py-3 text-xs min-w-40" style={{ boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
                    <p className="font-semibold text-slate-700 mb-2">{label}</p>
                    {validPayload
                      .sort((a, b) => (b.value as number) - (a.value as number))
                      .map(p => (
                        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-slate-600 max-w-32 truncate">{p.dataKey as string}</span>
                          </div>
                          <span className="font-semibold" style={{ color: p.color }}>{p.value}%</span>
                        </div>
                      ))}
                  </div>
                );
              }}
            />
            {data.queues.map((queue, i) =>
              visibleQueues.has(queue) ? (
                <Line
                  key={queue}
                  type="monotone"
                  dataKey={queue}
                  stroke={QUEUE_COLORS[i % QUEUE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: QUEUE_COLORS[i % QUEUE_COLORS.length], strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
