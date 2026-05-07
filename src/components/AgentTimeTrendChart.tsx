import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { AgentConnectivityHourly } from '../lib/supabase';
import { getMondayKey, weekLabel, monthLabel, MONTH_LABELS } from '../lib/kpi/shared';

type Granularity = 'hour' | 'day' | 'week' | 'month';

type Props = {
  connectivityData: AgentConnectivityHourly[];
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
};

type BucketEntry = {
  bucketKey: string;
  label: string;
  inQueue: number;
  outQueue: number;
  disconnected: number;
};

type TooltipPayload = { payload?: BucketEntry };

function fmtHM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function isBusinessHour(date: string, hour: number): boolean {
  const d = new Date(date + 'T12:00:00');
  const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  if (dow === 0 || dow === 6) return false;
  if (dow === 5) return hour >= 8 && hour < 14; // Fri 08:00–13:59
  return hour >= 8 && hour < 18; // Mon–Thu 08:00–17:59
}

function isInQueueStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('cola') || s.includes('queue') || s.includes('disponible') || s.includes('available');
}

function isOfflineStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('offline') || s.includes('desconectado') || s.includes('disconnected');
}

function getBucketKey(date: string, hour: number, gran: Granularity): string {
  if (gran === 'hour') return `${date} ${String(hour).padStart(2, '0')}:00`;
  if (gran === 'day')  return date;
  if (gran === 'week') return getMondayKey(date);
  // month
  return date.slice(0, 7);
}

function getBucketLabel(bucketKey: string, gran: Granularity): string {
  if (gran === 'hour') {
    // bucketKey = "YYYY-MM-DD HH:00" — show "DD Mon HH:00" to disambiguate across days
    const parts = bucketKey.split(' ');
    const dateStr = parts[0];
    const timeStr = parts[1] ?? '';
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${timeStr}`;
  }
  if (gran === 'day') {
    const d = new Date(bucketKey + 'T12:00:00');
    return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
  }
  if (gran === 'week') return weekLabel(bucketKey);
  return monthLabel(bucketKey);
}

const CustomTooltip = ({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  granularity?: Granularity;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  const connected = d.inQueue + d.outQueue;
  const disponibilidad = connected > 0 ? ((d.inQueue / connected) * 100).toFixed(1) : '0.0';
  const granLabel = granularity === 'week' ? `Semana del ${label}` : label ?? '';
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-xs space-y-1.5 min-w-52">
      <p className="font-semibold text-slate-800 text-sm mb-2">{granLabel}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#84BD00' }} />
        <span className="text-slate-600">En Cola:</span>
        <span className="font-medium text-slate-800 ml-auto">{fmtHM(d.inQueue)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#65646A' }} />
        <span className="text-slate-600">Fuera de Cola:</span>
        <span className="font-medium text-slate-800 ml-auto">{fmtHM(d.outQueue)}</span>
      </div>
      {d.disconnected > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: '#94a3b8' }} />
          <span className="text-slate-600">Desconectado:</span>
          <span className="font-medium text-red-600 ml-auto">{fmtHM(d.disconnected)}</span>
        </div>
      )}
      <div className="border-t border-slate-100 pt-1.5 mt-1 flex items-center gap-2">
        <span className="text-slate-500">Disponibilidad:</span>
        <span className={`font-semibold ml-auto ${parseFloat(disponibilidad) >= 70 ? 'text-emerald-600' : parseFloat(disponibilidad) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
          {disponibilidad}%
        </span>
      </div>
    </div>
  );
};

const GRAN_LABELS: Record<Granularity, string> = {
  hour: 'Hora',
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

export function AgentTimeTrendChart({ connectivityData, granularity, onGranularityChange }: Props) {
  const chartData = useMemo<BucketEntry[]>(() => {
    const buckets = new Map<string, { inQueue: number; outQueue: number; disconnected: number }>();

    for (const row of connectivityData) {
      if (!row.date || row.hour == null) continue;
      if (granularity === 'hour' && !isBusinessHour(row.date, row.hour)) continue;
      const status = row.status || '';

      const key = getBucketKey(row.date, row.hour, granularity);
      if (!buckets.has(key)) buckets.set(key, { inQueue: 0, outQueue: 0, disconnected: 0 });
      const b = buckets.get(key)!;
      const secs = row.seconds_in_bucket || 0;
      if (isOfflineStatus(status)) {
        b.disconnected += secs;
      } else if (isInQueueStatus(status)) {
        b.inQueue += secs;
      } else {
        b.outQueue += secs;
      }
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        bucketKey: key,
        label: getBucketLabel(key, granularity),
        inQueue: v.inQueue,
        outQueue: v.outQueue,
        disconnected: v.disconnected,
      }));
  }, [connectivityData, granularity]);

  if (connectivityData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center space-y-2">
        <p className="text-slate-500 font-medium text-sm">Sin datos de conectividad horaria</p>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Para ver esta gráfica, carga el reporte de <strong>Estado de Agentes</strong> (CSV de conectividad de Genesys Cloud) desde el panel de carga de datos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Tendencia de Tiempo en Cola</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Evolución de En Cola vs Fuera de Cola por período · Excluyendo estados Offline/Desconectado
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {(['hour', 'day', 'week', 'month'] as Granularity[]).map(g => (
            <button
              key={g}
              onClick={() => onGranularityChange(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                granularity === g
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {GRAN_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {[
          { color: '#84BD00', label: 'En Cola (Productivo)' },
          { color: '#65646A', label: 'Fuera de Cola (Pausas)' },
          { color: '#94a3b8', label: 'Desconectado en horario laboral' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="colorInQueue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#84BD00" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#84BD00" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorOutQueue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#65646A" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#65646A" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorDisconnected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={v => `${((v as number) / 3600).toFixed(1)}h`}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip granularity={granularity} />} />
          <Legend iconSize={10} iconType="square" wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="inQueue"
            stackId="1"
            stroke="#84BD00"
            fill="url(#colorInQueue)"
            strokeWidth={2}
            name="En Cola (Productivo)"
          />
          <Area
            type="monotone"
            dataKey="outQueue"
            stackId="1"
            stroke="#65646A"
            fill="url(#colorOutQueue)"
            strokeWidth={2}
            name="Fuera de Cola (Pausas)"
          />
          <Area
            type="monotone"
            dataKey="disconnected"
            stackId="1"
            stroke="#94a3b8"
            fill="url(#colorDisconnected)"
            strokeWidth={2}
            name="Desconectado"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
