import { useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts';
import type { HourlyDemandData } from '../lib/kpi';

type Props = {
  data: HourlyDemandData;
};

const DAY_CONFIG = [
  { key: 'lun' as const, label: 'Lunes',    color: '#0ea5e9', maxHour: 17 },
  { key: 'mar' as const, label: 'Martes',   color: '#10b981', maxHour: 17 },
  { key: 'mie' as const, label: 'Miércoles',color: '#f59e0b', maxHour: 17 },
  { key: 'jue' as const, label: 'Jueves',   color: '#8b5cf6', maxHour: 17 },
  { key: 'vie' as const, label: 'Viernes',  color: '#ef4444', maxHour: 13 },
];

export function StaffingDemandChart({ data }: Props) {
  const [staffOnPhone, setStaffOnPhone] = useState(5);
  const [visibleDays, setVisibleDays] = useState<Set<string>>(
    new Set(['lun', 'mar', 'mie', 'jue', 'vie'])
  );

  if (data.points.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Demanda de Personal por Hora (Erlangs)
        </h3>
        <div className="text-slate-400 text-sm text-center py-12">Sin datos disponibles</div>
      </div>
    );
  }

  // Solo mostrar horas de trabajo (8-19 para ver contexto)
  const businessHours = data.points.filter(p => p.hour >= 8 && p.hour <= 19);

  function toggleDay(key: string) {
    setVisibleDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Calcular el pico máximo de horas con sobredemanda
  const overloadedHours = businessHours.filter(p =>
    DAY_CONFIG.some(d => visibleDays.has(d.key) && (p[d.key] ?? 0) > staffOnPhone)
  ).length;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Demanda de Personal por Hora (Erlangs)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Líneas simultáneas necesarias en promedio · franjas sobre la línea roja = déficit de personal
          </p>
        </div>

        {/* Ajuste de personal */}
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2">
          <span className="text-xs text-slate-500">Personas en teléfono:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStaffOnPhone(s => Math.max(1, s - 1))}
              className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center hover:bg-slate-100"
            >−</button>
            <span className="text-lg font-bold text-slate-800 w-6 text-center">{staffOnPhone}</span>
            <button
              onClick={() => setStaffOnPhone(s => Math.min(30, s + 1))}
              className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center hover:bg-slate-100"
            >+</button>
          </div>
        </div>
      </div>

      {/* Selector de días */}
      <div className="flex gap-2 flex-wrap mb-4 mt-3">
        {DAY_CONFIG.map(({ key, label, color }) => {
          const count = data.weekdayCounts[key];
          if (count === 0) return null;
          const active = visibleDays.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleDay(key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                active ? 'text-white border-transparent' : 'border-slate-200 text-slate-400 bg-white'
              }`}
              style={active ? { backgroundColor: color } : {}}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: active ? 'white' : color }}
              />
              {label}
              <span className="opacity-70">({count} sem.)</span>
            </button>
          );
        })}
      </div>

      {/* Alerta de sobredemanda */}
      {overloadedHours > 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          <span className="font-semibold">⚠ {overloadedHours} franjas horarias</span> superan la capacidad asignada de {staffOnPhone} personas. Ajusta el número o refuerza en esas horas.
        </div>
      )}
      {overloadedHours === 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <span className="font-semibold">✓ Sin déficit</span> — con {staffOnPhone} personas en teléfono cubres toda la demanda en los días seleccionados.
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={businessHours} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          {/* Sombra del horario viernes (9-14) */}
          <ReferenceArea x1="14:00" x2="19:00" fill="#fef2f2" fillOpacity={0.4} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={true}
            label={{ value: 'Líneas necesarias', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#94a3b8' } }}
          />

          {/* Línea de capacidad asignada */}
          <ReferenceLine
            y={staffOnPhone}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            label={{ value: `${staffOnPhone} asignadas`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const validPayload = payload.filter(p => p.value !== null && p.value !== undefined);
              if (!validPayload.length) return null;
              return (
                <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-48">
                  <p className="font-semibold text-slate-700 mb-2">{label}</p>
                  {validPayload
                    .sort((a, b) => (b.value as number) - (a.value as number))
                    .map(p => {
                      const val = p.value as number;
                      const over = val > staffOnPhone;
                      return (
                        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-slate-600">{p.name}</span>
                          </div>
                          <span className={`font-semibold ${over ? 'text-red-600' : 'text-slate-700'}`}>
                            {val} {over ? `(+${Math.round((val - staffOnPhone) * 10) / 10} déficit)` : ''}
                          </span>
                        </div>
                      );
                    })}
                  <p className="mt-2 pt-2 border-t border-slate-100 text-slate-400">
                    Necesitas mínimo {Math.ceil(Math.max(...validPayload.map(p => p.value as number)))} personas en esta hora
                  </p>
                </div>
              );
            }}
          />

          {DAY_CONFIG.map(({ key, label, color }) =>
            visibleDays.has(key) && data.weekdayCounts[key] > 0 ? (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                connectNulls={false}
              />
            ) : null
          )}

          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-xs text-slate-400 mt-3 text-center">
        La zona rosada (14–19h) indica que el viernes ya no hay turno. Erlangs = líneas telefónicas simultáneas promedio en esa franja.
      </p>
    </div>
  );
}
