import { Clock, AlertCircle, TrendingDown, Users, Zap, Target } from 'lucide-react';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';
import { QueueWaitDistribution } from './QueueWaitDistribution';
import { QueuesDetailTable } from './QueuesDetailTable';
import type { CallRecord } from '../lib/supabase';

type Props = {
  stats: QueueStat[];
  records: CallRecord[];
  totalCalls: number;
};

export function QueueHealthDashboard({ stats, records, totalCalls }: Props) {
  // Calcular métricas agregadas de salud
  const totalUnattended = stats.reduce((acc, q) => acc + q.unattendedCount, 0);
  const totalAbandonedInQueue = stats.reduce((acc, q) => acc + (q.abandonQueueRate * q.unattendedCount / 100), 0);
  const totalAbandonedInAlert = stats.reduce((acc, q) => acc + (q.abandonAlertRate * q.unattendedCount / 100), 0);

  // ASA (Average Speed of Answer) - tiempo promedio de espera en cola
  const totalQueueTime = stats.reduce((acc, q) => acc + q.avgQueueTimeSeconds * q.count, 0);
  const asa = totalCalls > 0 ? Math.round(totalQueueTime / totalCalls) : 0;

  // ATA (Answer Time Average/Paciencia) - tiempo que aguantan antes de colgar
  const totalAlertTime = stats.reduce((acc, q) => acc + q.avgAlertTimeSeconds * q.count, 0);
  const ata = totalCalls > 0 ? Math.round(totalAlertTime / totalCalls) : 0;

  // Handle Time promedio
  const totalHandleTime = stats.reduce((acc, q) => acc + q.avgHandleTimeSeconds * q.count, 0);
  const handleTime = totalCalls > 0 ? Math.round(totalHandleTime / totalCalls) : 0;

  // Tasa de rebote promedio
  const avgBounceRate = stats.length > 0
    ? Math.round(stats.reduce((acc, q) => acc + q.bounceRate, 0) / stats.length)
    : 0;

  // Service Level (% de llamadas atendidas dentro de 20s)
  const attendedInTime = records.filter(r => r.queue && r.attended && (r.queue_time_seconds ?? 0) <= 20).length;
  const serviceLevel = totalCalls > 0 ? Math.round((attendedInTime / totalCalls) * 100) : 0;

  const kpiCards = [
    {
      label: 'ASA (Velocidad de Respuesta)',
      value: formatDuration(asa),
      sub: 'Tiempo promedio en cola',
      icon: Clock,
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
    },
    {
      label: 'ATA (Paciencia)',
      value: formatDuration(ata),
      sub: 'Tiempo en alertas promedio',
      icon: Target,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Handle Time',
      value: formatDuration(handleTime),
      sub: 'Duración efectiva',
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100',
    },
    {
      label: 'Service Level (≤20s)',
      value: `${serviceLevel}%`,
      sub: 'Llamadas atendidas a tiempo',
      icon: Target,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
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
      label: 'Tasa de rebote',
      value: `${avgBounceRate}%`,
      sub: 'Promedio entre colas',
      icon: Zap,
      color: 'bg-orange-50 text-orange-600',
      border: 'border-orange-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {kpiCards.map(({ label, value, sub, icon: Icon, color, border }) => (
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

      {/* Abandon Funnel */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Embudo de Abandonos</h3>
          <p className="text-xs text-slate-400 mt-0.5">Clasificación de llamadas no atendidas</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total sin atender</span>
            <div className="flex items-center gap-2">
              <div className="w-full bg-slate-100 rounded-full h-2 min-w-48">
                <div className="bg-slate-400 h-full rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-sm font-semibold text-slate-700 min-w-16 text-right">{totalUnattended}</span>
            </div>
          </div>
          <div className="flex items-center justify-between pl-4 border-l-2 border-red-200">
            <span className="text-sm text-slate-600">Abandonados en cola</span>
            <div className="flex items-center gap-2">
              <div className="w-full bg-slate-100 rounded-full h-2 min-w-48">
                <div className="bg-red-400 h-full rounded-full" style={{ width: totalUnattended > 0 ? (totalAbandonedInQueue / totalUnattended * 100) : 0 + '%' }} />
              </div>
              <span className="text-sm font-semibold text-red-600 min-w-16 text-right">{Math.round(totalAbandonedInQueue)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between pl-4 border-l-2 border-orange-200">
            <span className="text-sm text-slate-600">Abandonados en alerta</span>
            <div className="flex items-center gap-2">
              <div className="w-full bg-slate-100 rounded-full h-2 min-w-48">
                <div className="bg-orange-400 h-full rounded-full" style={{ width: totalUnattended > 0 ? (totalAbandonedInAlert / totalUnattended * 100) : 0 + '%' }} />
              </div>
              <span className="text-sm font-semibold text-orange-600 min-w-16 text-right">{Math.round(totalAbandonedInAlert)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Wait Distribution */}
      <QueueWaitDistribution records={records.filter(r => r.queue)} />

      {/* Performance Table */}
      <QueuesDetailTable stats={stats} />
    </div>
  );
}
