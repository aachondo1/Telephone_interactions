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

export type AdherenceEvent = {
  start_time: Date | string;
  end_time: Date | string;
  status: string;
};

type HourBucket = {
  hour: string;
  onQueuePct: number;
  offQueuePct: number;
  offlinePct: number;
  onQueueSec: number;
  offQueueSec: number;
  offlineSec: number;
};

const OPERATIVE_START = 8;
const OPERATIVE_END = 18;
const HOUR_SECONDS = 3600;

function classifyStatus(status: string): 'onQueue' | 'offQueue' | 'offline' {
  const s = status.toLowerCase().trim();
  // onQueue: actively handling calls
  if (
    s === 'disponible' ||
    s === 'interactuando' ||
    s === 'comunicando' ||
    s === 'alertando' ||
    s === 'available' ||
    s === 'interacting' ||
    s === 'communicating' ||
    s === 'alerting' ||
    s === 'on queue'
  ) {
    return 'onQueue';
  }
  // offline: disconnected or unresponsive
  if (
    s === 'desconectado' ||
    s === 'no responde' ||
    s === 'sistema ausente' ||
    s === 'offline' ||
    s === 'disconnected' ||
    s === 'system away'
  ) {
    return 'offline';
  }
  // everything else (pausa, comida, reunión, custom states) → offQueue
  return 'offQueue';
}

function buildHourBuckets(events: AdherenceEvent[]): HourBucket[] {
  const parsed = events.map((e) => ({
    start: new Date(e.start_time).getTime(),
    end: new Date(e.end_time).getTime(),
    category: classifyStatus(e.status),
    dateKey: new Date(e.start_time).toISOString().split('T')[0],
  }));

  // Unique days where the agent has any activity
  const allActiveDates = new Set(parsed.map((e) => e.dateKey));

  return Array.from({ length: OPERATIVE_END - OPERATIVE_START }, (_, i) => {
    const hour = OPERATIVE_START + i;
    let onQueueSec = 0;
    let offQueueSec = 0;
    let offlineSec = 0;

    // Dates that have at least one event intersecting this hour
    const datesWithCoverage = new Set<string>();

    for (const ev of parsed) {
      // Build the window for this event's date + this hour
      const evDate = ev.dateKey;
      const refDay = new Date(evDate + 'T00:00:00');
      const wStart = new Date(refDay);
      wStart.setHours(hour, 0, 0, 0);
      const wEnd = new Date(refDay);
      wEnd.setHours(hour + 1, 0, 0, 0);

      const overlapStart = Math.max(ev.start, wStart.getTime());
      const overlapEnd = Math.min(ev.end, wEnd.getTime());
      if (overlapEnd <= overlapStart) continue;

      const secs = (overlapEnd - overlapStart) / 1000;
      if (ev.category === 'onQueue') onQueueSec += secs;
      else if (ev.category === 'offQueue') offQueueSec += secs;
      else offlineSec += secs;

      datesWithCoverage.add(evDate);
    }

    // Days with activity but no event in this hour = disconnected for that whole hour
    const uncoveredDays = [...allActiveDates].filter((d) => !datesWithCoverage.has(d)).length;
    offlineSec += uncoveredDays * HOUR_SECONDS;

    const total = onQueueSec + offQueueSec + offlineSec;
    const toPercent = (s: number) => (total > 0 ? Math.round((s / total) * 100) : 0);

    // Fix rounding so percentages always add to 100
    const onP = toPercent(onQueueSec);
    const offQP = toPercent(offQueueSec);
    const offLP = total > 0 ? 100 - onP - offQP : 0;

    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      onQueuePct: onP,
      offQueuePct: offQP,
      offlinePct: Math.max(0, offLP),
      onQueueSec: Math.round(onQueueSec),
      offQueueSec: Math.round(offQueueSec),
      offlineSec: Math.round(offlineSec),
    };
  });
}

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  // payload arrives as [onQueue, offQueue, offline]
  const find = (name: string) => payload.find((p: any) => p.dataKey === name);
  const onQ = find('onQueuePct');
  const offQ = find('offQueuePct');
  const offL = find('offlinePct');

  const rawData: HourBucket | undefined = payload[0]?.payload;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm min-w-[180px]">
      <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label} hrs</p>
      {onQ && (
        <div className="flex justify-between items-center gap-4 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#84BD00' }} />
            <span className="text-slate-600">En Cola</span>
          </span>
          <span className="font-semibold text-slate-800">
            {onQ.value}%
            {rawData && <span className="font-normal text-slate-400 ml-1">({formatMinutes(rawData.onQueueSec)})</span>}
          </span>
        </div>
      )}
      {offQ && (
        <div className="flex justify-between items-center gap-4 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#65646A' }} />
            <span className="text-slate-600">Fuera de Cola</span>
          </span>
          <span className="font-semibold text-slate-800">
            {offQ.value}%
            {rawData && <span className="font-normal text-slate-400 ml-1">({formatMinutes(rawData.offQueueSec)})</span>}
          </span>
        </div>
      )}
      {offL && (
        <div className="flex justify-between items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-slate-600">Desconectado</span>
          </span>
          <span className="font-semibold text-slate-800">
            {offL.value}%
            {rawData && <span className="font-normal text-slate-400 ml-1">({formatMinutes(rawData.offlineSec)})</span>}
          </span>
        </div>
      )}
    </div>
  );
};

type Props = {
  agentName: string;
  events: AdherenceEvent[];
};

export function AgentAdherenceProfile({ agentName, events }: Props) {
  const data = buildHourBuckets(events);
  const hasData = events.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Perfil de Adherencia Horaria
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {agentName} — Distribución promedio del tiempo por bloque horario
        </p>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Sin eventos de conectividad para este agente
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend
                iconType="square"
                iconSize={10}
                formatter={(value) =>
                  value === 'onQueuePct'
                    ? 'En Cola (Productivo)'
                    : value === 'offQueuePct'
                      ? 'Fuera de Cola (Shrinkage)'
                      : 'Desconectado'
                }
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              <Bar dataKey="onQueuePct" stackId="a" fill="#84BD00" radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="offQueuePct" stackId="a" fill="#65646A" isAnimationActive={false} />
              <Bar dataKey="offlinePct" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>

          <p className="text-xs text-slate-400">
            Barras rojas a una hora específica indican que sistemáticamente el agente se desconecta o no responde en ese bloque.
          </p>
        </>
      )}
    </div>
  );
}
