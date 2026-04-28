import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import type { ExecutiveStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  stats: ExecutiveStat[];
};

type ScatterPoint = {
  x: number;
  y: number;
  z: number;
  executive: string;
  handleFormatted: string;
  alertSegments: number;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: {payload?: ScatterPoint}[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{d.executive}</p>
      <p className="text-slate-500">Llamadas: <span className="text-slate-700 font-medium">{d.x.toLocaleString('es-CL')}</span></p>
      <p className="text-slate-500">Manejo: <span className="text-slate-700 font-medium font-mono">{d.handleFormatted}</span></p>
      <p className="text-slate-500">Seg. Alerta: <span className="text-slate-700 font-medium">{d.alertSegments.toFixed(1)}</span></p>
    </div>
  );
}

export function ExecutiveScatterChart({ stats }: Props) {
  const data: ScatterPoint[] = stats
    .filter(e => e.executive !== 'SIN ATENDER')
    .map(e => ({
      x: e.count,
      y: Math.round(e.avgHandleTimeSeconds / 60),
      z: Math.round(e.avgAlertSegments * 100),
      executive: e.executive,
      handleFormatted: formatDuration(e.avgHandleTimeSeconds),
      alertSegments: e.avgAlertSegments,
    }));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Manejo vs Volumen</h3>
        <p className="text-xs text-slate-400 mt-0.5">X = Llamadas · Y = Tiempo manejo (min) · Tamaño = Segmentos alerta</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="x"
            type="number"
            name="Llamadas"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Llamadas', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#94a3b8' }}
          />
          <YAxis
            dataKey="y"
            type="number"
            name="Manejo (min)"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Min. manejo', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#94a3b8' }}
          />
          <ZAxis dataKey="z" range={[50, 300]} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} fill="#10b981" fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
