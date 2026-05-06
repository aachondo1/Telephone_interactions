import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

export type PerformancePoint = {
  name: string;
  occupancy: number;
  activeHours: number;
  quadrant: 'heroes' | 'efficient' | 'inflators' | 'underperformers';
};

type Props = {
  data: PerformancePoint[];
};

const quadrantColors: Record<string, string> = {
  heroes: '#ef4444',
  efficient: '#84BD00',
  inflators: '#f97316',
  underperformers: '#64748b',
};

const quadrantLabels: Record<string, string> = {
  heroes: 'Héroes / Burnout',
  efficient: 'Eficientes',
  inflators: 'Infladores',
  underperformers: 'Bajo Rendimiento',
};

export function AgentPerformanceMatrix({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500">
        Sin datos disponibles para la matriz de desempeño
      </div>
    );
  }

  const avgOccupancy = data.reduce((sum, d) => sum + d.occupancy, 0) / data.length;
  const avgHours = data.reduce((sum, d) => sum + d.activeHours, 0) / data.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-300 rounded p-2 shadow-lg">
          <p className="font-semibold text-sm text-slate-900">{data.name}</p>
          <p className="text-xs text-slate-600">
            Ocupación: {data.occupancy.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-600">Horas: {data.activeHours.toFixed(1)}h</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {quadrantLabels[data.quadrant]}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">
        Matriz de Desempeño de Agentes
      </h3>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="occupancy"
            name="Ocupación (%)"
            label={{ value: 'Ocupación Efectiva (%)', position: 'insideBottomRight', offset: -10 }}
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="activeHours"
            name="Horas"
            label={{ value: 'Tiempo Promedio Sesión (h)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

          {/* Reference lines for quadrants */}
          <ReferenceLine
            x={avgOccupancy}
            stroke="#cbd5e1"
            strokeDasharray="5 5"
            label={{
              value: `Promedio: ${avgOccupancy.toFixed(1)}%`,
              position: 'top',
              fill: '#64748b',
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={avgHours}
            stroke="#cbd5e1"
            strokeDasharray="5 5"
            label={{
              value: `Promedio: ${avgHours.toFixed(1)}h`,
              position: 'right',
              fill: '#64748b',
              fontSize: 12,
            }}
          />

          {/* Data points by quadrant */}
          <Scatter
            name="Agentes"
            data={data}
            fill="#06b6d4"
            shape={({ cx, cy, payload }: any) => {
              const color = quadrantColors[payload.quadrant];
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={color}
                  opacity={0.8}
                  stroke={color}
                  strokeWidth={2}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: quadrantColors.heroes }}
          />
          <span className="text-xs text-slate-600">{quadrantLabels.heroes}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: quadrantColors.efficient }}
          />
          <span className="text-xs text-slate-600">{quadrantLabels.efficient}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: quadrantColors.inflators }}
          />
          <span className="text-xs text-slate-600">{quadrantLabels.inflators}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: quadrantColors.underperformers }}
          />
          <span className="text-xs text-slate-600">{quadrantLabels.underperformers}</span>
        </div>
      </div>
    </div>
  );
}
