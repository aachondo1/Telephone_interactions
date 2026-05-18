import { Fragment } from 'react';
import { AreaChart, Area, XAxis, Tooltip, CartesianGrid } from 'recharts';
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

const GANTT_START_HOUR = 8;
const GANTT_END_HOUR = 18;
const TOTAL_HOURS = GANTT_END_HOUR - GANTT_START_HOUR; // 10

const statusColors: Record<string, string> = {
  enCola: BICE_COLORS.productive,
  disponible: BICE_COLORS.available,
  otros: '#cbd5e1',
};

const LABEL_COL_WIDTH_PX = 144;
const HOUR_COL_WIDTH_PX = 72;
const TIMELINE_WIDTH_PX = TOTAL_HOURS * HOUR_COL_WIDTH_PX;

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function buildPeriodMap(periods: AgentStatusPeriod[]): Map<number, AgentStatusPeriod> {
  const m = new Map<number, AgentStatusPeriod>();
  for (const p of periods) m.set(p.startHour, p);
  return m;
}

export function AgentGanttChart({ agents, demandData, averageRow }: Props) {
  const hasDemand = demandData.some((d) => (d.answered || 0) > 0 || (d.abandoned || 0) > 0);
  const hasAgents = agents.length > 0;
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => GANTT_START_HOUR + i);
  const averageMap = averageRow ? buildPeriodMap(averageRow) : null;

  const gridTemplateColumns = `${LABEL_COL_WIDTH_PX}px repeat(${TOTAL_HOURS}, ${HOUR_COL_WIDTH_PX}px)`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">
        Súper Gantt: Conectividad vs. Demanda
      </h3>

      {!hasAgents ? (
        <div className="border border-slate-100 rounded p-8 text-center text-slate-500 text-sm">
          Sin datos de conectividad para mostrar el Gantt
        </div>
      ) : (
        <div className="border border-slate-100 rounded bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns,
                minWidth: LABEL_COL_WIDTH_PX + TIMELINE_WIDTH_PX,
              }}
            >
              {hasDemand && (
                <>
                  <div className="sticky left-0 z-20 bg-slate-50 border-b border-slate-100 border-r border-slate-200 px-3 py-2" />
                  <div
                    className="bg-slate-50 border-b border-slate-100 px-3 py-2 flex items-center gap-4 text-xs font-medium"
                    style={{ gridColumn: `2 / span ${TOTAL_HOURS}` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BICE_COLORS.available }} />
                      Contestadas
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BICE_COLORS.noResponse }} />
                      Abandonadas (cola + alerta)
                    </div>
                  </div>
                  <div className="sticky left-0 z-20 bg-slate-50 border-b border-slate-100 border-r border-slate-200 px-3 py-2" />
                  <div
                    className="bg-slate-50 border-b border-slate-100 px-2 py-2"
                    style={{ gridColumn: `2 / span ${TOTAL_HOURS}` }}
                  >
                    <AreaChart
                      width={TIMELINE_WIDTH_PX}
                      height={92}
                      data={demandData}
                      margin={{ top: 8, right: 12, bottom: 0, left: 12 }}
                    >
                      <defs>
                        <linearGradient id="answeredGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BICE_COLORS.available} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={BICE_COLORS.available} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="abandonedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BICE_COLORS.noResponse} stopOpacity={0.22} />
                          <stop offset="95%" stopColor={BICE_COLORS.noResponse} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} height={18} interval={0} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(v: number | undefined, name: string) => [
                          `${typeof v === 'number' ? v : 0} llamadas/día`,
                          name === 'answered'
                            ? 'Contestadas'
                            : 'Abandonadas (cola + alerta, sin short abandons)',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="answered"
                        fill="url(#answeredGradient)"
                        stroke={BICE_COLORS.available}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="abandoned"
                        fill="url(#abandonedGradient)"
                        stroke={BICE_COLORS.noResponse}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </div>
                </>
              )}

              <div className="sticky left-0 z-20 bg-slate-100 border-b border-slate-200 border-r border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                Agente
              </div>
              {hours.map((h) => (
                <div
                  key={`h-${h}`}
                  className="bg-slate-100 border-b border-slate-200 border-r border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 text-center tabular-nums"
                >
                  {hourLabel(h)}
                </div>
              ))}

              {averageMap && (
                <>
                  <div className="sticky left-0 z-20 bg-sky-50 border-b border-slate-200 border-r border-slate-200 px-3 py-2 text-xs font-bold text-sky-900 flex items-center">
                    Promedio General
                  </div>
                  {hours.map((h) => {
                    const p = averageMap.get(h);
                    const v = p?.enColaPercent ?? 0;
                    const title = `Promedio\nEn cola: ${v}%`;
                    return (
                      <div
                        key={`avg-${h}`}
                        className="bg-sky-50 border-b border-slate-200 border-r border-slate-200 px-2 py-2"
                        title={title}
                      >
                        <div className="relative h-7 rounded-md border border-slate-200 bg-white overflow-hidden">
                          <div className="absolute inset-0 flex">
                            <div style={{ width: `${v}%`, backgroundColor: statusColors.enCola }} />
                            <div style={{ width: `${100 - v}%`, backgroundColor: '#e2e8f0' }} />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-bold tabular-nums text-slate-900 bg-white/75 backdrop-blur px-1 rounded">
                              {v}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {agents.map((agent) => {
                const periodsByHour = buildPeriodMap(agent.periods);
                return (
                  <Fragment key={agent.agentName}>
                    <div
                      key={`name-${agent.agentName}`}
                      className="sticky left-0 z-20 bg-white border-b border-slate-100 border-r border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 truncate"
                      title={agent.agentName}
                    >
                      {agent.agentName}
                    </div>
                    {hours.map((h) => {
                      const p = periodsByHour.get(h);
                      const enCola = p?.enColaPercent ?? 0;
                      const disp = p?.disponiblePercent ?? 0;
                      const otros = p?.otrosPercent ?? Math.max(0, 100 - enCola - disp);
                      const title = `En cola: ${enCola}%\nDisponible: ${disp}%\nOtros: ${otros}%`;

                      return (
                        <div
                          key={`cell-${agent.agentName}-${h}`}
                          className="border-b border-slate-100 border-r border-slate-100 px-2 py-2"
                          title={title}
                        >
                          <div className="relative h-7 rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                            <div className="absolute inset-0 flex">
                              <div style={{ width: `${enCola}%`, backgroundColor: statusColors.enCola }} />
                              <div style={{ width: `${disp}%`, backgroundColor: statusColors.disponible }} />
                              <div style={{ width: `${Math.max(0, 100 - enCola - disp)}%`, backgroundColor: statusColors.otros }} />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[11px] font-semibold tabular-nums text-slate-900 bg-white/75 backdrop-blur px-1 rounded">
                                {enCola}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
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
