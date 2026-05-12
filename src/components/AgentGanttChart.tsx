import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BICE_COLORS } from '../lib/biceColors';

export type AgentStatusPeriod = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  enColaPercent: number;
  disponiblePercent: number;
  otrosPercent: number;
};

export type AgentGanttData = {
  agentName: string;
  periods: AgentStatusPeriod[];
};

export type DemandPoint = {
  hour: number;
  label: string;
  inboundCalls?: number;
  answered?: number;
  abandoned?: number;
};

type Props = {
  agents: AgentGanttData[];
  demandData: DemandPoint[];
  averageRow?: AgentStatusPeriod[];
};

// Grid goes 08:00 to 18:00 (10 full hours)
const GANTT_START_HOUR = 8;
const GANTT_END_HOUR = 18;
const TOTAL_HOURS = GANTT_END_HOUR - GANTT_START_HOUR; // 10

const statusColors: Record<string, string> = {
  enCola: '#84cc16', // green-500
  disponible: '#3b82f6', // blue-500
  otros: '#cbd5e1', // slate-300
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

export function AgentGanttChart({ agents, demandData, averageRow }: Props) {
  const hasDemand = demandData.some((d) => (d.answered || 0) > 0 || (d.abandoned || 0) > 0);
  const hasAgents = agents.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">
        Súper Gantt: Conectividad vs. Demanda
      </h3>

      {/* Demand Curve */}
      {hasDemand && (
        <div className="h-24 bg-slate-50 rounded border border-slate-100 relative">
          <div className="absolute top-2 left-4 z-10 flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#326295]" />Contestadas</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />Perdidas en Cola</div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={demandData} margin={{ top: 24, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="answeredGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#326295" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#326295" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="abandonedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} height={20} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', fontSize: 12 }}
                formatter={(v: number, name: string) => [
                  `${v} llamadas/día`,
                  name === 'answered' ? 'Contestadas' : 'Perdidas'
                ]}
              />
              <Area
                type="monotone"
                dataKey="answered"
                stackId="1"
                fill="url(#answeredGradient)"
                stroke="#326295"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="abandoned"
                stackId="2"
                fill="url(#abandonedGradient)"
                stroke="#ef4444"
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

            {/* Average Row */}
            {averageRow && (
              <div className="flex border-b border-slate-200 bg-sky-50">
                <div className="w-36 flex-shrink-0 px-3 py-2 text-xs font-bold text-sky-800 border-r border-slate-200 flex items-center">
                  Promedio General
                </div>
                <div className="flex-1 relative h-8">
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div key={i} className="flex-1 border-r border-sky-100" />
                    ))}
                  </div>
                  {averageRow.map((period, idx) => {
                    const left = timeToPercent(period.startHour, period.startMinute);
                    const width = durationToPercent(
                      period.startHour, period.startMinute,
                      period.endHour, period.endMinute
                    );
                    if (width <= 0) return null;
                    return (
                      <div
                        key={idx}
                        className="absolute top-1 h-6 rounded flex items-center justify-center overflow-hidden font-bold text-[11px] text-sky-900"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`Promedio: ${period.enColaPercent}% en cola`}
                      >
                        {period.enColaPercent > 0 ? `${period.enColaPercent}%` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                    const totalWidth = durationToPercent(
                      period.startHour,
                      period.startMinute,
                      period.endHour,
                      period.endMinute
                    );
                    if (totalWidth <= 0) return null;

                    const enColaWidth = (period.enColaPercent / 100) * totalWidth;
                    const dispWidth = (period.disponiblePercent / 100) * totalWidth;
                    const otrosWidth = (period.otrosPercent / 100) * totalWidth;

                    const tooltipText = `En cola: ${period.enColaPercent}%
Disponible: ${period.disponiblePercent}%
Otros: ${period.otrosPercent}%`;

                    return (
                      <div
                        key={idx}
                        className="absolute top-1.5 h-7 flex overflow-hidden opacity-90 hover:opacity-100 transition-opacity rounded group"
                        style={{
                          left: `${left}%`,
                          width: `${totalWidth}%`,
                        }}
                        title={tooltipText}
                      >
                        {/* En Cola */}
                        {period.enColaPercent > 0 && (
                          <div
                            className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                            style={{ width: `${(period.enColaPercent / 100) * 100}%`, backgroundColor: statusColors.enCola }}
                          >
                            {period.enColaPercent >= 15 ? `${period.enColaPercent}%` : ''}
                          </div>
                        )}
                        {/* Disponible */}
                        {period.disponiblePercent > 0 && (
                          <div
                            className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                            style={{ width: `${(period.disponiblePercent / 100) * 100}%`, backgroundColor: statusColors.disponible }}
                          >
                            {period.disponiblePercent >= 15 ? `${period.disponiblePercent}%` : ''}
                          </div>
                        )}
                        {/* Otros */}
                        {period.otrosPercent > 0 && (
                          <div
                            className="h-full flex items-center justify-center text-[10px] font-medium text-slate-700"
                            style={{ width: `${(period.otrosPercent / 100) * 100}%`, backgroundColor: statusColors.otros }}
                          >
                            {period.otrosPercent >= 15 ? `${period.otrosPercent}%` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs pt-3 border-t border-slate-100">
        {[
          { status: 'enCola', label: 'En Cola' },
          { status: 'disponible', label: 'Disponible' },
          { status: 'otros', label: 'Otros (Pausas, etc.)' },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: statusColors[status] }} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
