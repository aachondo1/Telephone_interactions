import { TrendingUp, TrendingDown } from 'lucide-react';
import type { KPISummary } from '../lib/kpi';

type Props = {
  kpis: KPISummary;
};

export function DurationExtremes({ kpis }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={22} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Duración Máxima
          </p>
          <p className="text-2xl font-bold font-mono text-slate-800">
            {kpis.maxDurationFormatted}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {kpis.maxDurationSeconds.toLocaleString('es-CL')} segundos
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
          <TrendingDown size={22} className="text-sky-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Duración Mínima
          </p>
          <p className="text-2xl font-bold font-mono text-slate-800">
            {kpis.minDurationFormatted}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {kpis.minDurationSeconds.toLocaleString('es-CL')} segundos
          </p>
        </div>
      </div>
    </div>
  );
}
