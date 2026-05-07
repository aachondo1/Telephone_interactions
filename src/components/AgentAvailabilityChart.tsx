import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { AgentAvailabilityEntry } from './OccupationDashboard';

type Props = {
  data: AgentAvailabilityEntry[];
};

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DisconnectedLabel({ x, y, width, height, value }: {
  x?: number; y?: number; width?: number; height?: number; value?: number;
}) {
  if (value == null || !value || width == null || x == null || y == null || height == null) return null;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="middle"
      fontSize={11}
      fill={value >= 30 ? '#ef4444' : '#64748b'}
      fontWeight={value >= 30 ? 600 : 400}
    >
      {value}%
    </text>
  );
}

export function AgentAvailabilityChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
        Sin datos de conectividad para mostrar disponibilidad de agentes.
      </div>
    );
  }

  const chartData = [...data]
    .sort((a, b) => b.disconnectedSeconds - a.disconnectedSeconds)
    .slice(0, 20)
    .map((d) => {
      const total = d.totalExpectedSeconds || 1;
      const disconnPct = Math.round((d.disconnectedSeconds / total) * 100);
      return {
        label: `${d.agentName} · ${d.workingDays}d`,
        inQueue: d.inQueueSeconds,
        outQueue: d.outQueueSeconds,
        disconnected: d.disconnectedSeconds,
        disconnPct,
        inQueuePct: Math.round((d.inQueueSeconds / total) * 100),
        outQueuePct: Math.round((d.outQueueSeconds / total) * 100),
        inQueueLabel: formatHours(d.inQueueSeconds),
        outQueueLabel: formatHours(d.outQueueSeconds),
        disconnectedLabel: formatHours(d.disconnectedSeconds),
      };
    });

  const teamAvgDisconn = Math.round(
    data.reduce((s, d) => s + (d.disconnectedSeconds / (d.totalExpectedSeconds || 1)), 0) /
    data.length * 100
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Mapa de Disponibilidad de Agentes</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            En horario laboral (Lun–Jue 08:00–18:00, Vie 08:00–14:00) · Solo agentes con ≥5 alertas inbound · Ordenado por desconexión
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">Promedio desconexión equipo</p>
          <p className={`text-2xl font-bold ${teamAvgDisconn >= 30 ? 'text-red-600' : teamAvgDisconn >= 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {teamAvgDisconn}%
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {[
          { color: '#10b981', label: 'En la cola (disponible)' },
          { color: '#f59e0b', label: 'Fuera de la cola (pausa/reunión/etc.)' },
          { color: '#94a3b8', label: 'Desconectado en horario laboral' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 38)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 60, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatHours(v)}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="label"
            type="category"
            tick={{ fontSize: 11 }}
            width={185}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                inQueue: 'En la cola',
                outQueue: 'Fuera de la cola',
                disconnected: 'Desconectado',
              };
              return [formatHours(value as number), labels[name as string] ?? name];
            }}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="inQueue" stackId="avail" fill="#10b981" maxBarSize={24} name="inQueue" radius={[0, 0, 0, 0]} />
          <Bar dataKey="outQueue" stackId="avail" fill="#f59e0b" maxBarSize={24} name="outQueue" radius={[0, 0, 0, 0]} />
          <Bar dataKey="disconnected" stackId="avail" fill="#94a3b8" maxBarSize={24} name="disconnected" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="disconnPct" content={<DisconnectedLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-slate-400">
        * El porcentaje al final indica tiempo desconectado sobre el total esperado en horario laboral.
        Rojo ≥30% · Normal &lt;15%
      </p>
    </div>
  );
}
