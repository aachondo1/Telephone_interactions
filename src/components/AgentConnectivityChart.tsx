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
import type { ExecutiveStat } from '../lib/kpi';

type Props = {
  agentRecords: AgentStatusRecord[];
  executiveStats: ExecutiveStat[];
};

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function pct(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

// Normalize name for matching: lowercase + trim + collapse spaces
function normName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

type ChartRow = {
  name: string;
  talkTime: number;
  idleInQueue: number;
  outOfQueue: number;
  connectedSeconds: number;
  inQueueSeconds: number;
  outOfQueueSeconds: number;
  talkTimeSeconds: number;
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> } = {}) => {
  if (!active || !payload?.length) return null;

  const row: ChartRow = payload[0]?.payload;
  const connected = row.connectedSeconds;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-xs space-y-2 min-w-52">
      <p className="font-semibold text-slate-800 text-sm">{label}</p>

      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 inline-block" />
            Tiempo en llamadas
          </span>
          <span className="font-medium text-slate-700">
            {fmtHours(row.talkTimeSeconds)} ({pct(row.talkTimeSeconds, row.inQueueSeconds)} cola)
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-200 inline-block" />
            En cola sin hablar
          </span>
          <span className="font-medium text-slate-700">{fmtHours(row.idleInQueue)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
            Fuera de la cola
          </span>
          <span className="font-medium text-slate-700">
            {fmtHours(row.outOfQueueSeconds)} ({pct(row.outOfQueueSeconds, connected)} del total)
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2 flex justify-between">
        <span className="text-slate-500">Total conectada</span>
        <span className="font-semibold text-slate-700">{fmtHours(connected)}</span>
      </div>
    </div>
  );
};

export function AgentConnectivityChart({ agentRecords, executiveStats }: Props) {
  // Build lookup: normalized name → total talk seconds from calls
  const talkMap = new Map<string, number>();
  for (const s of executiveStats) {
    if (s.executive && s.executive !== 'SIN ATENDER') {
      talkMap.set(normName(s.executive), s.totalDurationSeconds);
    }
  }

  const chartData: ChartRow[] = agentRecords.map(r => {
    const talkTimeSeconds = talkMap.get(normName(r.agent_name)) ?? 0;
    const idleInQueue     = Math.max(0, r.in_queue_seconds - talkTimeSeconds);
    return {
      name:              r.agent_name,
      talkTime:          talkTimeSeconds,
      idleInQueue,
      outOfQueue:        r.out_of_queue_seconds,
      connectedSeconds:  r.connected_seconds,
      inQueueSeconds:    r.in_queue_seconds,
      outOfQueueSeconds: r.out_of_queue_seconds,
      talkTimeSeconds,
    };
  }).sort((a, b) => b.connectedSeconds - a.connectedSeconds);

  const hasCrossRef = chartData.some(r => r.talkTimeSeconds > 0);

  const tickFmt = (v: number) => {
    const h = Math.floor(v / 3600);
    return `${h}h`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-800">Distribución del tiempo conectado</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Conectado = En la cola + Fuera de la cola
          {hasCrossRef && ' · El tiempo en llamadas proviene del reporte de llamadas cargado'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 72)}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 24, bottom: 4, left: 160 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tickFormatter={tickFmt}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={155}
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Legend
            iconType="square"
            iconSize={10}
            formatter={(value) => (
              <span className="text-xs text-slate-600">{value}</span>
            )}
          />
          {hasCrossRef && (
            <Bar dataKey="talkTime" name="Tiempo en llamadas" stackId="a" fill="#0284c7" radius={[0, 0, 0, 0]} />
          )}
          <Bar dataKey="idleInQueue" name="En cola sin hablar" stackId="a" fill="#bae6fd" />
          <Bar dataKey="outOfQueue"  name="Fuera de la cola"   stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-100">
              <th className="text-left py-2 pr-4 font-medium">Agente</th>
              <th className="text-right py-2 px-3 font-medium">Conectado</th>
              <th className="text-right py-2 px-3 font-medium">En la cola</th>
              <th className="text-right py-2 px-3 font-medium">Fuera de la cola</th>
              {hasCrossRef && <th className="text-right py-2 px-3 font-medium">Tiempo en llamadas</th>}
              {hasCrossRef && <th className="text-right py-2 pl-3 font-medium">Ocupación real</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {chartData.map(r => {
              const occupancy = r.inQueueSeconds > 0
                ? Math.round((r.talkTimeSeconds / r.inQueueSeconds) * 100)
                : null;
              return (
                <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-slate-700">{r.name}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{fmtHours(r.connectedSeconds)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {fmtHours(r.inQueueSeconds)}
                    <span className="text-slate-400 ml-1">({pct(r.inQueueSeconds, r.connectedSeconds)})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {fmtHours(r.outOfQueueSeconds)}
                    <span className="text-slate-400 ml-1">({pct(r.outOfQueueSeconds, r.connectedSeconds)})</span>
                  </td>
                  {hasCrossRef && (
                    <td className="py-2.5 px-3 text-right text-slate-600">{fmtHours(r.talkTimeSeconds)}</td>
                  )}
                  {hasCrossRef && (
                    <td className="py-2.5 pl-3 text-right">
                      {occupancy !== null ? (
                        <span className={`font-semibold ${
                          occupancy >= 70 ? 'text-emerald-600' :
                          occupancy >= 40 ? 'text-amber-600' :
                          'text-slate-400'
                        }`}>
                          {occupancy}%
                        </span>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasCrossRef && (
        <p className="text-xs text-slate-400">
          Ocupación real = tiempo en llamadas / tiempo en cola. Verde ≥70%, naranja ≥40%.
        </p>
      )}
    </div>
  );
}
