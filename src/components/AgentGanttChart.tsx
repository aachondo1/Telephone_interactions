import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BICE_COLORS } from '../lib/biceColors';

export type AgentStatusPeriod = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  status: 'productivo' | 'ocioso' | 'pausa' | 'no_responde';
};

export type AgentGanttData = {
  agentName: string;
  periods: AgentStatusPeriod[];
};

export type DemandPoint = {
  hour: number;
  label: string;
  inboundCalls: number;
};

type Props = {
  agents: AgentGanttData[];
  demandData: DemandPoint[];
};

// Grid goes 08:00 to 18:00 (10 full hours)
const GANTT_START_HOUR = 8;
const GANTT_END_HOUR = 18;
const TOTAL_HOURS = GANTT_END_HOUR - GANTT_START_HOUR; // 10

const statusColors: Record<string, string> = {
  productivo: BICE_COLORS.productive,
  ocioso: BICE_COLORS.available,
  pausa: BICE_COLORS.pause,
  no_responde: BICE_COLORS.noResponse,
};

function timeToPercent(hour: number, minute: number): number {
  const totalMinutes = (hour - GANTT_START_HOUR) * 60 + minute;
  const maxMinutes = TOTAL_HOURS * 60;
  return Math.max(0, Math.min(100, (totalMinutes / maxMinutes) * 100));
}

function durationToPercent(startHour: number, startMin: number, endHour: number, endMin: number): number {
  const startMin_ = (startHour - GANTT_START_HOUR) * 60 + startMin;
  const endMin_ = (endHour - GANTT_START_HOUR) * 60 + endMin;
  const duration = Math.max(0, endMin_ - startMin_);
  return (duration / (TOTAL_HOURS * 60)) * 100;
}

export function AgentGanttChart({ agents, demandData }: Props) {
  const hasDemand = demandData.some((d) => d.inboundCalls > 0);
  const hasAgents = agents.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Súper Gantt: Conectividad vs. Demanda (08:00-18:00)
        </h3>
        <p className="text-sm text-slate-600 mb-3">
          Las barras de colores muestran el estado de cada agente por hora. Los picos de demanda están arriba.
          <span className="font-semibold"> Las barras ROJAS durante alta demanda requieren investigación.</span>
        </p>

        {/* Legend - Moved to top */}
        <div className="flex flex-wrap gap-4 text-xs pb-3 border-b border-slate-100">
          {[
            { status: 'productivo', label: 'Productivo - Manejando llamadas' },
            { status: 'ocioso', label: 'Ocioso/Disponible - Conectado sin actividad' },
            { status: 'pausa', label: 'Pausa - Descanso/Reunión' },
            { status: 'no_responde', label: 'No Responde - Ignorando alertas ⚠️' },
          ].map(({ status, label }) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: statusColors[status] }} />
              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Demand Curve */}
      {hasDemand && (
        <div className="h-20 bg-slate-50 rounded border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demandData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#326295" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#326295" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} height={20} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', fontSize: 12 }}
                formatter={(v) => [`${v} llamadas`, 'Demanda']}
              />
              <Area
                type="monotone"
                dataKey="inboundCalls"
                fill="url(#demandGradient)"
                stroke="#326295"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gantt Chart */}
      {!hasAgents ? (
        <div className="border border-slate-100 rounded p-8 text-center text-slate-500 text-sm">
          Sin datos de conectividad para mostrar el Gantt
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded bg-white">
          <div className="inline-block min-w-full" style={{ minWidth: '700px' }}>
            {/* Hour Headers — 08:00 to 18:00 */}
            <div className="flex bg-slate-100 border-b border-slate-200">
              <div className="w-36 flex-shrink-0 px-3 py-2 text-xs font-semibold text-slate-600 border-r border-slate-200">
                Agente
              </div>
              <div className="flex-1 flex">
                {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
                  const hour = GANTT_START_HOUR + i;
                  return (
                    <div
                      key={hour}
                      className="flex-1 px-1 py-2 text-xs font-semibold text-slate-600 border-r border-slate-200 text-center"
                    >
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent Rows */}
            {agents.map((agent) => (
              <div key={agent.agentName} className="flex border-b border-slate-100 hover:bg-slate-50">
                <div className="w-36 flex-shrink-0 px-3 py-3 text-sm font-medium text-slate-900 border-r border-slate-200 truncate">
                  {agent.agentName}
                </div>
                <div className="flex-1 relative h-10">
                  {/* Hour grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div key={i} className="flex-1 border-r border-slate-100" />
                    ))}
                  </div>

                  {/* Status periods */}
                  {agent.periods.map((period, idx) => {
                    const left = timeToPercent(period.startHour, period.startMinute);
                    const width = durationToPercent(
                      period.startHour,
                      period.startMinute,
                      period.endHour,
                      period.endMinute
                    );
                    if (width <= 0) return null;
                    return (
                      <div
                        key={idx}
                        className="absolute top-1.5 h-7 rounded opacity-90 hover:opacity-100 transition-opacity"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: statusColors[period.status] || '#ccc',
                          minWidth: '3px',
                        }}
                        title={`${period.status}: ${String(period.startHour).padStart(2, '0')}:${String(period.startMinute).padStart(2, '0')} – ${String(period.endHour).padStart(2, '0')}:${String(period.endMinute).padStart(2, '0')}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
