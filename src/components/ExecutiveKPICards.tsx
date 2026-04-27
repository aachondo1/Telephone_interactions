import { Trophy, Clock, Phone, Users } from 'lucide-react';
import type { ExecutiveStat } from '../lib/kpi';

type Props = {
  stats: ExecutiveStat[];
};

export function ExecutiveKPICards({ stats }: Props) {
  const attended = stats.filter(e => e.executive !== 'SIN ATENDER');
  const topVolume = attended[0] ?? null;
  const topAvgDuration = attended.length > 0
    ? attended.reduce((best, e) => e.avgDurationSeconds > best.avgDurationSeconds ? e : best, attended[0])
    : null;
  const topTotalTime = attended.length > 1
    ? attended.reduce((best, e) => e.totalDurationSeconds > best.totalDurationSeconds ? e : best, attended[0])
    : null;
  const totalActive = attended.length;

  const cards = [
    {
      label: 'Top ejecutivo',
      value: topVolume ? topVolume.executive : '—',
      sub: topVolume ? `${topVolume.count.toLocaleString('es-CL')} llamadas` : '',
      icon: Trophy,
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
    },
    {
      label: 'Mayor duración prom.',
      value: topAvgDuration ? topAvgDuration.avgDurationFormatted : '—',
      sub: topAvgDuration ? topAvgDuration.executive : '',
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
    },
    {
      label: 'Mayor tiempo teléfono',
      value: topTotalTime ? topTotalTime.totalDurationFormatted : '—',
      sub: topTotalTime ? topTotalTime.executive : '',
      icon: Phone,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Ejecutivos activos',
      value: totalActive.toLocaleString('es-CL'),
      sub: 'Con llamadas atendidas',
      icon: Users,
      color: 'bg-slate-100 text-slate-600',
      border: 'border-slate-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, sub, icon: Icon, color, border }) => (
        <div key={label} className={`bg-white rounded-2xl p-5 shadow-sm border ${border} flex items-start gap-4`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wide leading-none mb-1">{label}</p>
            <p className="text-lg font-bold text-slate-800 leading-tight truncate">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}