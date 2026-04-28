import { BarChart2, Clock, AlertCircle, Layers, TrendingDown, Zap } from 'lucide-react';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
  totalCalls: number;
};

export function QueueKPICards({ stats, totalCalls }: Props) {
  const topQueue = stats[0] ?? null;
  const avgDuration = totalCalls > 0
    ? Math.round(stats.reduce((acc, q) => acc + q.avgDurationSeconds * q.count, 0) / totalCalls)
    : 0;
  const totalUnattended = stats.reduce((acc, q) => acc + q.unattendedCount, 0);
  const totalAbandonedInQueue = stats.reduce((acc, q) => acc + q.abandonQueueRate * q.unattendedCount / 100, 0);
  const totalAbandonedInAlert = stats.reduce((acc, q) => acc + q.abandonAlertRate * q.unattendedCount / 100, 0);
  const avgBounceRate = stats.length > 0
    ? Math.round(stats.reduce((acc, q) => acc + q.bounceRate, 0) / stats.length)
    : 0;

  const cards = [
    {
      label: 'Cola principal (por tiempo)',
      value: topQueue ? topQueue.queue : '—',
      sub: topQueue ? `${topQueue.totalDurationFormatted} tiempo total` : '',
      icon: Layers,
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
    },
    {
      label: 'Duración promedio',
      value: formatDuration(avgDuration),
      sub: 'Todas las colas',
      icon: Clock,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: '% tiempo en cola principal',
      value: topQueue ? `${topQueue.percentage}%` : '—',
      sub: topQueue ? `del tiempo total` : '',
      icon: BarChart2,
      color: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
    },
    {
      label: 'Sin atender',
      value: totalUnattended.toLocaleString('es-CL'),
      sub: totalCalls > 0 ? `${Math.round((totalUnattended / totalCalls) * 100)}% del total` : '',
      icon: AlertCircle,
      color: 'bg-red-50 text-red-500',
      border: 'border-red-100',
    },
    {
      label: 'Abandonos en cola',
      value: Math.round(totalAbandonedInQueue).toLocaleString('es-CL'),
      sub: totalUnattended > 0 ? `${Math.round((totalAbandonedInQueue / totalUnattended) * 100)}% de abandonos` : '',
      icon: TrendingDown,
      color: 'bg-orange-50 text-orange-600',
      border: 'border-orange-100',
    },
    {
      label: 'Tasa de rebote',
      value: `${avgBounceRate}%`,
      sub: 'Promedio entre colas',
      icon: Zap,
      color: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
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
