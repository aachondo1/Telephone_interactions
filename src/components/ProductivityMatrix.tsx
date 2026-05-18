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

export type ProductivityPoint = {
  name: string;
  connectionRatio: number;
  workQueueHours: number;
  connectedSeconds: number;
  disconnectedSeconds: number;
  workQueueSeconds: number;
};

type Props = {
  data: ProductivityPoint[];
};

function formatSecondsHHMM(totalSeconds: number): string {
  const h = Math.floor(Math.abs(totalSeconds) / 3600);
  const m = Math.floor((Math.abs(totalSeconds) % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getQuadrantInfo(
  connectionRatio: number,
  workQueueHours: number,
  avgX: number,
  avgY: number
): { color: string; label: string } {
  const highConnection = connectionRatio >= avgX;
  const highWork = workQueueHours >= avgY;

  if (highConnection && highWork) return { color: '#84BD00', label: 'Pilar' };
  if (!highConnection && !highWork) return { color: '#ef4444', label: 'Fuga Crítica' };
  if (highConnection && !highWork) return { color: '#f97316', label: 'Recurso Ocioso' };
  return { color: '#64748b', label: 'Alta Productividad' };
}

export function ProductivityMatrix({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500">
        Sin datos disponibles para la matriz de productividad
      </div>
    );
  }

  const avgConnectionRatio = data.reduce((s, d) => s + d.connectionRatio, 0) / data.length;
  const avgWorkQueueHours = data.reduce((s, d) => s + d.workQueueHours, 0) / data.length;

  const enrichedData = data.map((d) => ({
    ...d,
    ...getQuadrantInfo(d.connectionRatio, d.workQueueHours, avgConnectionRatio, avgWorkQueueHours),
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProductivityPoint & { color: string; label: string; disconnectedSeconds: number; workQueueSeconds: number } }> } = {}) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-300 rounded p-3 shadow-lg min-w-[200px]">
        <p className="font-semibold text-sm text-slate-900 mb-1">{d.name}</p>
        <p className="text-xs text-slate-600">
          Desconectado del Turno:{' '}
          <span className="font-medium">{formatSecondsHHMM(d.disconnectedSeconds)}</span>
        </p>
        <p className="text-xs text-slate-600">
          Tiempo efectivo en Cola:{' '}
          <span className="font-medium">{formatSecondsHHMM(d.workQueueSeconds)}</span>
        </p>
        <p className="text-xs mt-1 font-semibold" style={{ color: d.color }}>
          {d.label}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Matriz de Productividad</h3>
        <p className="text-sm text-slate-500 mt-1">
          Eje X: Nivel de Conexión (Conectado / Desconectado) · Eje Y: Trabajo Real en Cola (horas)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="connectionRatio"
            name="Nivel de Conexión"
            label={{
              value: 'Nivel de Conexión (Conectado / Desconectado)',
              position: 'insideBottomRight',
              offset: -10,
              fontSize: 11,
              fill: '#64748b',
            }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="workQueueHours"
            name="Trabajo Real (h)"
            label={{
              value: 'Trabajo Real en Cola (h)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontSize: 11,
              fill: '#64748b',
            }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

          <ReferenceLine
            x={avgConnectionRatio}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{
              value: `Prom: ${avgConnectionRatio.toFixed(2)}`,
              position: 'top',
              fill: '#64748b',
              fontSize: 11,
            }}
          />
          <ReferenceLine
            y={avgWorkQueueHours}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{
              value: `Prom: ${avgWorkQueueHours.toFixed(1)}h`,
              position: 'right',
              fill: '#64748b',
              fontSize: 11,
            }}
          />

          <Scatter
            name="Agentes"
            data={enrichedData}
            shape={({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { color: string } }) => (
              <circle
                cx={cx}
                cy={cy}
                r={7}
                fill={payload?.color ?? '#999'}
                opacity={0.85}
                stroke={payload?.color ?? '#999'}
                strokeWidth={1.5}
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-xs text-slate-600">Fuga Crítica (Baja conexión / Poca cola)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#f97316' }} />
          <span className="text-xs text-slate-600">Recurso Ocioso / Presentismo (Alta conexión / Poca cola)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#84BD00' }} />
          <span className="text-xs text-slate-600">Pilares (Alta conexión / Alta productividad)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#64748b' }} />
          <span className="text-xs text-slate-600">Alta productividad / Baja conexión</span>
        </div>
      </div>
    </div>
  );
}
