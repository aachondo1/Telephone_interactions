import { calculateQueueWaitDistribution } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';
import { Clock, AlertTriangle, TrendingDown } from 'lucide-react';

type Props = {
  records: CallRecord[];
};

export function AbandonTimeThresholds({ records }: Props) {
  const distribution = calculateQueueWaitDistribution(records ?? []);
  const { buckets, totalValidCalls } = distribution;

  if (!buckets || buckets.length === 0 || totalValidCalls === 0) {
    return null;
  }

  // Calculate cumulative percentages at each threshold
  const count120 = buckets
    .filter(b => ['<10s', '10-20s', '20-30s', '30-60s', '60-120s'].includes(b.label))
    .reduce((sum, b) => sum + b.count, 0);

  const count300 = buckets
    .filter(b => ['<10s', '10-20s', '20-30s', '30-60s', '60-120s', '120-300s'].includes(b.label))
    .reduce((sum, b) => sum + b.count, 0);

  const count600 = buckets
    .filter(b => ['<10s', '10-20s', '20-30s', '30-60s', '60-120s', '120-300s', '300-600s'].includes(b.label))
    .reduce((sum, b) => sum + b.count, 0);

  const pct120 = totalValidCalls > 0 ? Math.round((count120 / totalValidCalls) * 100) : 0;
  const pct300 = totalValidCalls > 0 ? Math.round((count300 / totalValidCalls) * 100) : 0;
  const pct600 = totalValidCalls > 0 ? Math.round((count600 / totalValidCalls) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Puntos de Frustración: Abandonos por Tiempo</h3>
        <p className="text-sm text-slate-400 mt-1">
          Umbrales críticos que indican cuándo los clientes alcanzan su límite de paciencia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 120 Seconds Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-50 border border-blue-200 p-6">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-100 rounded-full opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock size={24} className="text-blue-600" />
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">120s</span>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Paciencia Mínima</p>
            <p className="text-3xl font-bold text-blue-600 mb-1">{pct120}%</p>
            <p className="text-sm text-slate-600 mb-3">{count120} de {totalValidCalls} llamadas</p>
            <p className="text-xs text-slate-500">
              Clientes que abandonan dentro de 2 minutos. Punto de frustración inicial.
            </p>
          </div>
        </div>

        {/* 300 Seconds Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-100 rounded-full opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">300s</span>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Zona de Riesgo</p>
            <p className="text-3xl font-bold text-amber-600 mb-1">{pct300}%</p>
            <p className="text-sm text-slate-600 mb-3">{count300} de {totalValidCalls} llamadas</p>
            <p className="text-xs text-slate-500">
              Clientes que esperan hasta 5 minutos. Nivel crítico de frustración.
            </p>
          </div>
        </div>

        {/* 600 Seconds Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-50 border border-red-200 p-6">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-red-100 rounded-full opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown size={24} className="text-red-600" />
              </div>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">600s</span>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Límite Psicológico</p>
            <p className="text-3xl font-bold text-red-600 mb-1">{pct600}%</p>
            <p className="text-sm text-slate-600 mb-3">{count600} de {totalValidCalls} llamadas</p>
            <p className="text-xs text-slate-500">
              Clientes que esperan hasta 10 minutos. Casi irrecuperables.
            </p>
          </div>
        </div>
      </div>

      {/* Insight Bar */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs font-semibold text-slate-700 mb-2">💡 Interpretación:</p>
        <ul className="space-y-1 text-xs text-slate-600">
          <li>
            <strong className="text-slate-700">{pct120}% antes de 120s:</strong> {pct120 < 50 ? 'Mayoría de clientes esperan más de 2 minutos - escalación urgente' : 'Buena parte de abandonos ocurren al inicio'}
          </li>
          <li>
            <strong className="text-slate-700">{pct300}% antes de 300s:</strong> {pct300 > 80 ? 'Mayoría abandona dentro de 5 min - problema crítico de staffing' : 'Distribución extendida en el tiempo'}
          </li>
          <li>
            <strong className="text-slate-700">{pct600}% antes de 600s:</strong> {pct600 > 95 ? 'Casi todos abandonan antes de 10 min' : 'Algunos clientes esperan más de 10 minutos'}
          </li>
        </ul>
      </div>
    </div>
  );
}
