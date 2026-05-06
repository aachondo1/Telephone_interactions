import { Trophy, Clock, Phone, Users, Zap, AlertOctagon } from 'lucide-react';
import type { ExecutiveStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';
import { calcChangePercent } from '../lib/periodComparison';
import { KPICardWithComparison } from './KPICardWithComparison';

type Props = {
  stats: ExecutiveStat[];
  previousStats?: ExecutiveStat[] | null;
};

export function ExecutiveKPICards({ stats, previousStats }: Props) {
  const attended = stats.filter(e => e.executive !== 'SIN ATENDER');
  const prevAttended = previousStats ? previousStats.filter(e => e.executive !== 'SIN ATENDER') : null;

  const topVolume = attended[0] ?? null;
  const topAvgDuration = attended.length > 0
    ? attended.reduce((best, e) => e.avgDurationSeconds > best.avgDurationSeconds ? e : best, attended[0])
    : null;
  const topTotalTime = attended.length > 1
    ? attended.reduce((best, e) => e.totalDurationSeconds > best.totalDurationSeconds ? e : best, attended[0])
    : null;
  const topHandleTime = attended.length > 0
    ? attended.reduce((best, e) => e.avgHandleTimeSeconds > best.avgHandleTimeSeconds ? e : best, attended[0])
    : null;
  const topBounceRate = attended.length > 0
    ? attended.reduce((best, e) => e.bounceRate > best.bounceRate ? e : best, attended[0])
    : null;
  const totalActive = attended.length;
  const avgBounceRate = attended.length > 0
    ? Math.round(attended.reduce((a, b) => a + b.bounceRate, 0) / attended.length)
    : 0;

  // Previous period values
  const prevTotalActive = prevAttended ? prevAttended.length : undefined;
  const prevAvgBounceRate = prevAttended && prevAttended.length > 0
    ? Math.round(prevAttended.reduce((a, b) => a + b.bounceRate, 0) / prevAttended.length)
    : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <KPICardWithComparison
        title="Top ejecutivo"
        currentValue={topVolume ? topVolume.executive : '—'}
        subtitle={topVolume ? `${topVolume.count.toLocaleString('es-CL')} llamadas` : ''}
        icon={<Trophy size={20} className="text-sky-600" />}
        accent="bg-sky-50 text-sky-600"
        className="border-sky-100"
      />
      <KPICardWithComparison
        title="Mayor duración prom."
        currentValue={topAvgDuration ? topAvgDuration.avgDurationFormatted : '—'}
        subtitle={topAvgDuration ? topAvgDuration.executive : ''}
        icon={<Clock size={20} className="text-amber-600" />}
        accent="bg-amber-50 text-amber-600"
        className="border-amber-100"
      />
      <KPICardWithComparison
        title="Mayor tiempo teléfono"
        currentValue={topTotalTime ? topTotalTime.totalDurationFormatted : '—'}
        subtitle={topTotalTime ? topTotalTime.executive : ''}
        icon={<Phone size={20} className="text-emerald-600" />}
        accent="bg-emerald-50 text-emerald-600"
        className="border-emerald-100"
      />
      <KPICardWithComparison
        title="Ejecutivos activos"
        currentValue={totalActive.toLocaleString('es-CL')}
        previousValue={prevTotalActive?.toLocaleString('es-CL')}
        changePercent={calcChangePercent(totalActive, prevTotalActive)}
        subtitle="Con llamadas atendidas"
        icon={<Users size={20} className="text-slate-600" />}
        accent="bg-slate-100 text-slate-600"
        className="border-slate-100"
      />
      <KPICardWithComparison
        title="Mayor tiempo manejo"
        currentValue={topHandleTime ? formatDuration(topHandleTime.avgHandleTimeSeconds) : '—'}
        subtitle={topHandleTime ? `${topHandleTime.executive}` : ''}
        icon={<Zap size={20} className="text-purple-600" />}
        accent="bg-purple-50 text-purple-600"
        className="border-purple-100"
      />
      <KPICardWithComparison
        title="Rebote promedio"
        currentValue={`${avgBounceRate}%`}
        previousValue={prevAvgBounceRate !== undefined ? `${prevAvgBounceRate}%` : undefined}
        changePercent={calcChangePercent(avgBounceRate, prevAvgBounceRate)}
        isLowerBetter
        subtitle={topBounceRate ? `Max: ${topBounceRate.executive}` : ''}
        icon={<AlertOctagon size={20} className="text-orange-600" />}
        accent="bg-orange-50 text-orange-600"
        className="border-orange-100"
      />
    </div>
  );
}
