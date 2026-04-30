import { TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import type { QueueHealthMetric } from '../lib/kpi';
import { Tooltip } from './Tooltip';

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
      tooltip: {
        definition: 'Porcentaje de llamadas atendidas dentro de 20 segundos del tiempo total de espera',
        formula: '(Llamadas atendidas < 20s) / (Llamadas válidas) × 100',
        unit: 'Porcentaje (%)',
        benchmark: '≥ 80% (norma WFM Chile)',
      },
    },
    {
      label: 'Tasa de Abandono',
      value: `${queue.abandonmentRatePercent}%`,
      sub: 'Clientes perdidos',
      icon: TrendingDown,
      color: queue.abandonmentRatePercent <= 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600',
      border: queue.abandonmentRatePercent <= 10 ? 'border-emerald-100' : 'border-orange-100',
      benchmark: '≤ 10%',
      tooltip: {
        definition: 'Porcentaje de clientes que cuelgan antes de ser atendidos en cola o alerta',
        formula: '(Abandonadas en cola/alerta) / (Llamadas válidas) × 100',
        unit: 'Porcentaje (%)',
        benchmark: '≤ 10%',
      },
    },
    {
      label: 'ASA (Velocidad de Respuesta)',
      value: queue.asaFormatted,
      sub: 'Solo llamadas atendidas',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      benchmark: 'Menor es mejor',
      tooltip: {
        definition: 'Tiempo promedio de espera desde que el cliente entra en cola hasta que es atendido',
        formula: 'SUM(queue_time_seconds de llamadas atendidas) / Cantidad de atendidas',
        unit: 'Segundos (mm:ss)',
        benchmark: 'Menor es mejor. Mide velocidad del equipo',
      },
    },
    {
      label: 'ATA (Paciencia del Cliente)',
      value: queue.ataFormatted,
      sub: 'Solo llamadas abandonadas',
      icon: Clock,
      color: diagnosis.color,
      border: diagnosis.border,
      benchmark: diagnosis.message,
      tooltip: {
        definition: 'Tiempo promedio que un cliente espera antes de abandonar la llamada',
        formula: 'SUM(queue_time_seconds de abandonadas) / Cantidad de abandonadas',
        unit: 'Segundos (mm:ss)',
        benchmark: 'Si ATA &gt; ASA: cliente paciente. Si ATA &lt; ASA: cliente impaciente',
      },
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
      tooltip: {
        definition: 'Tiempo promedio de espera de TODAS las llamadas válidas (atendidas + abandonadas)',
        formula: 'SUM(queue_time_seconds de todas) / Cantidad total',
        unit: 'Segundos (mm:ss)',
        benchmark: 'Informativo. Usa ASA y ATA para diagnóstico más preciso',
      },
    },
    {
      label: 'Erlang C (Carga)',
      value: queue.erlangC.toFixed(1),
      sub: 'Intensidad de tráfico',
      icon: Zap,
      color: queue.erlangC <= 0.8 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
      border: queue.erlangC <= 0.8 ? 'border-emerald-100' : 'border-amber-100',
      benchmark: '≤ 0.8 ideal',
      tooltip: {
        definition: 'Intensidad de tráfico normalizada: promedio de agentes ocupados durante el período',
        formula: 'SUM(handle_time_seconds) / (3600 × Horas del período)',
        unit: 'Erlangs',
        benchmark: '≤ 0.8 ideal. Mide dimensionamiento de personal',
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Metrics: SL%, Abandono%, ASA, ATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, border, benchmark, tooltip }) => (
          <div key={label} className={`bg-white rounded-2xl p-6 shadow-sm border ${border}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{benchmark}</span>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
              {tooltip && (
                <Tooltip
                  label={label}
                  definition={tooltip.definition}
                  formula={tooltip.formula}
                  unit={tooltip.unit}
                  benchmark={tooltip.benchmark}
                />
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Supplementary Metrics: AWT Global & Erlang C */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supplementaryCards.map(({ label, value, sub, icon: Icon, color, border, benchmark, tooltip }) => (
          <div key={label} className={`bg-white rounded-2xl p-6 shadow-sm border ${border}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{benchmark}</span>
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
              {tooltip && (
                <Tooltip
                  label={label}
                  definition={tooltip.definition}
                  formula={tooltip.formula}
                  unit={tooltip.unit}
                  benchmark={tooltip.benchmark}
                />
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
