import { BarChart2, Clock, AlertCircle, Layers, TrendingDown, Zap } from 'lucide-react';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';
import { calcChangePercent } from '../lib/periodComparison';
import { KPICardWithComparison } from './KPICardWithComparison';

type Props = {
  stats: QueueStat[];
  totalCalls: number;
  previousStats?: QueueStat[] | null;
  previousTotalCalls?: number | null;
};

export function QueueKPICards({ stats, totalCalls, previousStats, previousTotalCalls }: Props) {
  const topQueue = stats[0] ?? null;
  const prevTopQueue = previousStats?.[0] ?? null;
  const avgDuration = totalCalls > 0
    ? Math.round(stats.reduce((acc, q) => acc + q.avgDurationSeconds * q.count, 0) / totalCalls)
    : 0;
  const prevAvgDuration = previousTotalCalls && previousTotalCalls > 0 && previousStats
    ? Math.round(previousStats.reduce((acc, q) => acc + q.avgDurationSeconds * q.count, 0) / previousTotalCalls)
    : undefined;
  const totalUnattended = stats.reduce((acc, q) => acc + q.unattendedCount, 0);
  const prevTotalUnattended = previousStats ? previousStats.reduce((acc, q) => acc + q.unattendedCount, 0) : undefined;
  const totalAbandonedInQueue = stats.reduce((acc, q) => acc + q.abandonQueueRate * q.unattendedCount / 100, 0);
  const prevTotalAbandonedInQueue = previousStats
    ? previousStats.reduce((acc, q) => acc + q.abandonQueueRate * q.unattendedCount / 100, 0)
    : undefined;
  const avgBounceRate = stats.length > 0
    ? Math.round(stats.reduce((acc, q) => acc + q.bounceRate, 0) / stats.length)
    : 0;
  const prevAvgBounceRate = previousStats && previousStats.length > 0
    ? Math.round(previousStats.reduce((acc, q) => acc + q.bounceRate, 0) / previousStats.length)
    : undefined;

  const unattendedPct = totalCalls > 0 ? Math.round((totalUnattended / totalCalls) * 100) : 0;
  const prevUnattendedPct = previousTotalCalls && previousTotalCalls > 0 && prevTotalUnattended !== undefined
    ? Math.round((prevTotalUnattended / previousTotalCalls) * 100)
    : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <KPICardWithComparison
        title="Cola principal (por tiempo)"
        currentValue={topQueue ? topQueue.queue : '—'}
        subtitle={topQueue ? `${topQueue.totalDurationFormatted} tiempo total` : ''}
        icon={<Layers size={20} className="text-sky-600" />}
        accent="bg-sky-50 text-sky-600"
        className="border-sky-100"
      />
      <KPICardWithComparison
        title="Duración promedio"
        currentValue={formatDuration(avgDuration)}
        previousValue={prevAvgDuration !== undefined ? formatDuration(prevAvgDuration) : undefined}
        changePercent={prevAvgDuration !== undefined ? calcChangePercent(avgDuration, prevAvgDuration) : undefined}
        isNeutral
        subtitle="Todas las colas"
        icon={<Clock size={20} className="text-emerald-600" />}
        accent="bg-emerald-50 text-emerald-600"
        className="border-emerald-100"
      />
      <KPICardWithComparison
        title="% tiempo en cola principal"
        currentValue={topQueue ? `${topQueue.percentage}%` : '—'}
        previousValue={prevTopQueue ? `${prevTopQueue.percentage}%` : undefined}
        changePercent={prevTopQueue ? calcChangePercent(topQueue?.percentage ?? 0, prevTopQueue.percentage) : undefined}
        isNeutral
        subtitle={topQueue ? 'del tiempo total' : ''}
        icon={<BarChart2 size={20} className="text-amber-600" />}
        accent="bg-amber-50 text-amber-600"
        className="border-amber-100"
      />
      <KPICardWithComparison
        title="Sin atender"
        currentValue={totalUnattended.toLocaleString('es-CL')}
        previousValue={prevTotalUnattended !== undefined ? prevTotalUnattended.toLocaleString('es-CL') : undefined}
        changePercent={calcChangePercent(unattendedPct, prevUnattendedPct)}
        isLowerBetter
        subtitle={totalCalls > 0 ? `${unattendedPct}% del total` : ''}
        icon={<AlertCircle size={20} className="text-red-500" />}
        accent="bg-red-50 text-red-500"
        className="border-red-100"
      />
      <KPICardWithComparison
        title="Abandonos en cola"
        currentValue={Math.round(totalAbandonedInQueue).toLocaleString('es-CL')}
        previousValue={prevTotalAbandonedInQueue !== undefined ? Math.round(prevTotalAbandonedInQueue).toLocaleString('es-CL') : undefined}
        changePercent={calcChangePercent(Math.round(totalAbandonedInQueue), prevTotalAbandonedInQueue !== undefined ? Math.round(prevTotalAbandonedInQueue) : undefined)}
        isLowerBetter
        subtitle={totalUnattended > 0 ? `${Math.round((totalAbandonedInQueue / totalUnattended) * 100)}% de abandonos` : ''}
        icon={<TrendingDown size={20} className="text-orange-600" />}
        accent="bg-orange-50 text-orange-600"
        className="border-orange-100"
      />
      <KPICardWithComparison
        title="Tasa de rebote"
        currentValue={`${avgBounceRate}%`}
        previousValue={prevAvgBounceRate !== undefined ? `${prevAvgBounceRate}%` : undefined}
        changePercent={calcChangePercent(avgBounceRate, prevAvgBounceRate)}
        isLowerBetter
        subtitle="Promedio entre colas"
        icon={<Zap size={20} className="text-purple-600" />}
        accent="bg-purple-50 text-purple-600"
        className="border-purple-100"
      />
    </div>
  );
}
