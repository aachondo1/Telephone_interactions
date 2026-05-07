import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { AgentCascadeStat, CascadeDepthPoint } from './OccupationDashboard';

type Props = {
  data: AgentCascadeStat[];
  depthData: CascadeDepthPoint[];
};

const MIN_ALERTS = 5;

function ResponseRateLabel({ x, y, width, height, value }: {
  x?: number; y?: number; width?: number; height?: number; value?: number;
}) {
  if (value == null || width == null || x == null || y == null || height == null) return null;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="middle"
      fontSize={11}
      fill="#475569"
    >
      {value}%
    </text>
  );
}

export function CascadeAgentChart({ data, depthData }: Props) {
  const chartData = data
    .filter((d) => d.timesAlerted >= MIN_ALERTS)
    .slice(0, 20)
    .map((d) => ({
      agent: d.agent,
      label: `${d.agent} · ${d.timesAlerted}`,
      respondidas: d.timesAnswered,
      evasiones: d.timesEvaded,
      rate: d.responseRate,
    }));

  const totalCascadeAlerts = depthData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Respuesta en Cascada por Agente</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Verde = alertas respondidas · Rojo = evasiones · Solo agentes con ≥{MIN_ALERTS} alertas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: horizontal stacked bar chart */}
        <div className="lg:col-span-2">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Sin suficientes datos de cascada (mín. {MIN_ALERTS} alertas por agente)
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 38)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 60, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={180}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    name === 'respondidas' ? 'Respondidas' : 'Evasiones',
                  ]}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="respondidas" stackId="cascade" fill="#1d8e6e" maxBarSize={24} radius={[0, 0, 0, 0]} name="respondidas" />
                <Bar dataKey="evasiones" stackId="cascade" fill="#ef4444" maxBarSize={24} radius={[0, 4, 4, 0]} name="evasiones">
                  <LabelList dataKey="rate" content={<ResponseRateLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#1d8e6e' }} />
              Respondidas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#ef4444' }} />
              Evasiones
            </div>
          </div>
        </div>

        {/* Right: donut + depth legend */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold text-slate-700 mb-2 self-start">
            Profundidad de Cascada
          </p>
          <p className="text-xs text-slate-400 self-start mb-3">
            {totalCascadeAlerts > 0 ? `${totalCascadeAlerts} llamadas totales` : 'Sin datos'}
          </p>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={depthData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                paddingAngle={2}
              >
                {depthData.map((d) => (
                  <Cell key={d.label} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, props) => {
                  const payload = (props as { payload?: CascadeDepthPoint }).payload;
                  return [`${value} llamadas (${payload?.percent ?? 0}%)`, payload?.label ?? ''];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 w-full mt-1">
            {depthData.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-slate-600">{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{d.value}</span>
                  <span className="font-semibold text-slate-700 w-8 text-right">{d.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
