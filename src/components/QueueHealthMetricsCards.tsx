import { TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import type { QueueHealthMetric } from '../lib/kpi';

type Props = {
  metrics: QueueHealthMetric[];
};

export function QueueHealthMetricsCards({ metrics }: Props) {
  const queue = metrics[0];

  if (!queue) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <p className="text-slate-500">Sin datos disponibles</p>
      </div>
    );
  }

  // Diagnóstico: Comparar ASA vs ATA
  const getDiagnosis = () => {
    if (queue.asaSeconds > queue.ataSeconds) {
      return { message: 'Equipo lento', color: 'bg-red-50 text-red-600', border: 'border-red-100' };
    } else if (queue.asaSeconds < queue.ataSeconds) {
      return { message: 'Equipo rápido', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' };
    }
    return { message: 'En el límite', color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' };
  };
  const diagnosis = getDiagnosis();

  const cards = [
    {
      label: 'Nivel de Servicio (SL%)',
      value: `${queue.serviceLevelPercent}%`,
      sub: 'Atendidas < 20s',
      icon: TrendingUp,
      color: queue.serviceLevelPercent >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
      border: queue.serviceLevelPercent >= 80 ? 'border-emerald-100' : 'border-red-100',
      benchmark: '≥ 80%',
    },
    {
      label: 'Tasa de Abandono',
      value: `${queue.abandonmentRatePercent}%`,
      sub: 'Clientes perdidos',
      icon: TrendingDown,
      color: queue.abandonmentRatePercent <= 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600',
      border: queue.abandonmentRatePercent <= 10 ? 'border-emerald-100' : 'border-orange-100',
      benchmark: '≤ 10%',
    },
    {
      label: 'ASA (Velocidad de Respuesta)',
      value: queue.asaFormatted,
      sub: 'Solo llamadas atendidas',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      benchmark: 'Menor es mejor',
    },
    {
      label: 'ATA (Paciencia del Cliente)',
      value: queue.ataFormatted,
      sub: 'Solo llamadas abandonadas',
      icon: Clock,
      color: diagnosis.color,
      border: diagnosis.border,
      benchmark: diagnosis.message,
    },
  ];

  const supplementaryCards = [
    {
      label: 'AWT Global (Referencia)',
      value: queue.awtFormatted,
      sub: 'Promedio de todas',
      icon: Clock,
      color: 'bg-slate-50 text-slate-600',
      border: 'border-slate-100',
      benchmark: 'Informativo',
    },
    {
      label: 'Erlang C (Carga)',
      value: queue.erlangC.toFixed(1),
      sub: 'Intensidad de tráfico',
      icon: Zap,
      color: queue.erlangC <= 0.8 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
      border: queue.erlangC <= 0.8 ? 'border-emerald-100' : 'border-amber-100',
      benchmark: '≤ 0.8 ideal',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Metrics: SL%, Abandono%, ASA, ATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, border, benchmark }) => (
          <div key={label} className={`bg-white rounded-2xl p-6 shadow-sm border ${border}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{benchmark}</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Supplementary Metrics: AWT Global & Erlang C */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supplementaryCards.map(({ label, value, sub, icon: Icon, color, border, benchmark }) => (
          <div key={label} className={`bg-white rounded-2xl p-6 shadow-sm border ${border}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{benchmark}</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
