import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

const BUSINESS_START = 8.5; // 08:30
const BUSINESS_END = 18; // 18:00
const HOURS_IN_DAY = BUSINESS_END - BUSINESS_START;

const statusColors: Record<string, string> = {
  productivo: BICE_COLORS.productive,
  ocioso: BICE_COLORS.available,
  pausa: BICE_COLORS.pause,
  no_responde: BICE_COLORS.noResponse,
};

function timeToPercentage(hour: number, minute: number): number {
  const totalMinutes = (hour - BUSINESS_START) * 60 + minute;
  const maxMinutes = HOURS_IN_DAY * 60;
  return (totalMinutes / maxMinutes) * 100;
}

function getPeriodWidth(start: number, startMin: number, end: number, endMin: number): number {
  const startTotal = (start - BUSINESS_START) * 60 + startMin;
  const endTotal = (end - BUSINESS_START) * 60 + endMin;
  const durationMin = Math.max(0, endTotal - startTotal);
  const maxMinutes = HOURS_IN_DAY * 60;
  return (durationMin / maxMinutes) * 100;
}

export function AgentGanttChart({ agents, demandData }: Props) {
  const maxDemand = Math.max(...demandData.map((d) => d.inboundCalls), 1);
  const normalizedDemand = demandData.map((d) => ({
    ...d,
    normalizedValue: (d.inboundCalls / maxDemand) * 100,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">
        Súper Gantt: Conectividad vs. Demanda
      </h3>

      {/* Demand Curve */}
      <div className="h-20 bg-slate-50 rounded border border-slate-100">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={normalizedDemand}>
            <defs>
              <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#326295" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#326295" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              height={25}
              interval={1}
              angle={-45}
              textAnchor="end"
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              formatter={(value) => [`${Math.round(value as number)} llamadas`, 'Demanda']}
              labelFormatter={(label) => `${label}`}
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

      {/* Gantt Chart */}
      <div className="overflow-x-auto border border-slate-100 rounded bg-white">
        <div className="inline-block min-w-full">
          {/* Hour Headers */}
          <div className="flex bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
            <div className="w-32 flex-shrink-0 px-3 py-2 text-xs font-semibold text-slate-600 border-r border-slate-200">
              Agente
            </div>
            <div className="flex-1 flex">
              {Array.from({ length: 10 }, (_, i) => {
                const hour = 8 + i;
                return (
                  <div
                    key={hour}
                    className="flex-1 px-2 py-2 text-xs font-semibold text-slate-600 border-r border-slate-200 text-center"
                    style={{ minWidth: '60px' }}
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
              <div className="w-32 flex-shrink-0 px-3 py-3 text-sm font-medium text-slate-900 border-r border-slate-200 truncate">
                {agent.agentName}
              </div>
              <div className="flex-1 relative h-12 bg-white">
                {/* Time grid */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-slate-100"
                      style={{ minWidth: '60px' }}
                    />
                  ))}
                </div>

                {/* Periods */}
                <div className="absolute inset-0">
                  {agent.periods.map((period, idx) => {
                    const left = timeToPercentage(period.startHour, period.startMinute);
                    const width = getPeriodWidth(
                      period.startHour,
                      period.startMinute,
                      period.endHour,
                      period.endMinute
                    );
                    const color = statusColors[period.status] || '#ccc';

                    return (
                      <div
                        key={idx}
                        className="absolute h-6 my-3 rounded border border-slate-300 opacity-90 hover:opacity-100 transition-opacity"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: color,
                          minWidth: '2px',
                        }}
                        title={`${period.status}: ${String(period.startHour).padStart(2, '0')}:${String(period.startMinute).padStart(2, '0')} - ${String(period.endHour).padStart(2, '0')}:${String(period.endMinute).padStart(2, '0')}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: BICE_COLORS.productive }}
          />
          <span>Productivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: BICE_COLORS.available }}
          />
          <span>Ocioso</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: BICE_COLORS.pause }}
          />
          <span>Pausa</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: BICE_COLORS.noResponse }}
          />
          <span>No Responde</span>
        </div>
      </div>
    </div>
  );
}
