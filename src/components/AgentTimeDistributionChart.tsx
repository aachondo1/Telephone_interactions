import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { AgentStatusRecord } from '../lib/supabase';

type Props = {
  agentStatusRecords: AgentStatusRecord[];
};

type ChartRow = {
  agentName: string;
  inQueueHours: number;
  outQueueHours: number;
  totalHours: number;
};

function toHM(seconds: number): { h: number; m: number } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return { h, m };
}

function fmtHM(seconds: number): string {
  const { h, m } = toHM(seconds);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload?: ChartRow }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  const totalSec = d.totalHours * 3600;
  const inSec = d.inQueueHours * 3600;
  const outSec = d.outQueueHours * 3600;
  const disponibilidad = d.totalHours > 0 ? ((d.inQueueHours / d.totalHours) * 100).toFixed(1) : '0.0';
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-xs space-y-1.5 min-w-52">
      <p className="font-semibold text-slate-800 text-sm mb-2">{d.agentName}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#84BD00' }} />
        <span className="text-slate-600">En Cola:</span>
        <span className="font-medium text-slate-800 ml-auto">{fmtHM(inSec)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#65646A' }} />
        <span className="text-slate-600">Fuera de Cola:</span>
        <span className="font-medium text-slate-800 ml-auto">{fmtHM(outSec)}</span>
      </div>
      <div className="border-t border-slate-100 pt-1.5 mt-1 flex items-center gap-2">
        <span className="text-slate-500">Turno Total:</span>
        <span className="font-medium text-slate-800 ml-auto">{fmtHM(totalSec)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Disponibilidad:</span>
        <span className={`font-semibold ml-auto ${parseFloat(disponibilidad) >= 70 ? 'text-emerald-600' : parseFloat(disponibilidad) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
          {disponibilidad}%
        </span>
      </div>
    </div>
  );
};

export function AgentTimeDistributionChart({ agentStatusRecords }: Props) {
  const chartData = useMemo<ChartRow[]>(() =>
    agentStatusRecords
      .filter(r => (r.connected_seconds || 0) > 0)
      .map(r => ({
        agentName: r.agent_name || '(sin nombre)',
        inQueueHours: (r.in_queue_seconds || 0) / 3600,
        outQueueHours: (r.out_of_queue_seconds || 0) / 3600,
        totalHours: (r.connected_seconds || 0) / 3600,
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 20),
    [agentStatusRecords]
  );

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
        Sin datos de estado de agentes para mostrar la distribución de tiempo.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Distribución de Tiempo por Agente</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            En Cola vs Fuera de Cola · Top 20 por horas totales · Basado en registros de estado cargados
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {[
          { color: '#84BD00', label: 'En Cola (Productivo)' },
          { color: '#65646A', label: 'Fuera de Cola (Pausas / Shrinkage)' },
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
            tickFormatter={v => `${(v as number).toFixed(0)}h`}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="agentName"
            type="category"
            width={185}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} iconType="square" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="inQueueHours" stackId="a" fill="#84BD00" name="En Cola (Productivo)" maxBarSize={24} radius={[0, 0, 0, 0]} />
          <Bar dataKey="outQueueHours" stackId="a" fill="#65646A" name="Fuera de Cola (Pausas/Shrinkage)" maxBarSize={24} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
