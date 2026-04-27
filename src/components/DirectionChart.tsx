import type { DirectionStat } from '../lib/kpi';
import { PhoneIncoming, PhoneOutgoing } from 'lucide-react';

type Props = {
  stats: DirectionStat[];
};

const DIRECTION_COLORS: Record<string, { bar: string; bg: string; text: string; icon: React.ReactNode }> = {
  inbound: {
    bar: 'bg-sky-400',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    icon: <PhoneIncoming size={16} className="text-sky-600" />,
  },
  outbound: {
    bar: 'bg-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: <PhoneOutgoing size={16} className="text-emerald-600" />,
  },
  entrante: {
    bar: 'bg-sky-400',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    icon: <PhoneIncoming size={16} className="text-sky-600" />,
  },
  saliente: {
    bar: 'bg-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: <PhoneOutgoing size={16} className="text-emerald-600" />,
  },
};

function getStyle(direction: string) {
  const key = direction.toLowerCase();
  return DIRECTION_COLORS[key] ?? {
    bar: 'bg-slate-400',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    icon: null,
  };
}

export function DirectionChart({ stats }: Props) {
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">
        Entrantes vs Salientes
      </h3>

      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-4 mb-6">
        {stats.map(s => {
          const style = getStyle(s.direction);
          const pct = total > 0 ? (s.count / total) * 100 : 0;
          return (
            <div
              key={s.direction}
              className={`${style.bar} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${s.direction}: ${pct.toFixed(1)}%`}
            />
          );
        })}
        {stats.length === 0 && <div className="bg-slate-100 w-full" />}
      </div>

      {/* Legend cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => {
          const style = getStyle(s.direction);
          return (
            <div key={s.direction} className={`${style.bg} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                {style.icon}
                <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
                  {s.direction}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.count.toLocaleString('es-CL')}</p>
              <p className="text-sm text-slate-500">{s.percentage}% del total</p>
            </div>
          );
        })}
        {stats.length === 0 && (
          <p className="col-span-2 text-center text-slate-400 py-4">Sin datos</p>
        )}
      </div>
    </div>
  );
}
