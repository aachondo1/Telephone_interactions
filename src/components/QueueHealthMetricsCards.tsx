import { TrendingUp, TrendingDown, Clock, Zap, PhoneOff, AlertCircle, Activity } from 'lucide-react';
import type { QueueHealthMetric, OperationalKPIs } from '../lib/kpi';
import { Tooltip } from './Tooltip';

type Props = {
  metrics: QueueHealthMetric[];
  operationalKPIs: OperationalKPIs;
};

function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function QueueHealthMetricsCards({ metrics, operationalKPIs }: Props) {
  // Calculate aggregate metrics across all queues (weighted averages)
  const validQueues = metrics.filter(m => (m.attendedCalls > 0 || m.abandonedCalls > 0) && m.queue !== 'Sin cola');

  if (validQueues.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <p className="text-slate-500">Sin datos disponibles</p>
      </div>
    );
  }

  // Weighted average calculations
  const totalValidCalls = validQueues.reduce((sum, m) => sum + m.totalCalls, 0);
  const totalAttendedCalls = validQueues.reduce((sum, m) => sum + m.attendedCalls, 0);
  const totalAbandonedCalls = validQueues.reduce((sum, m) => sum + m.abandonedCalls, 0);

  // SL%: Weighted average by total calls
  const serviceLevelPercent = totalValidCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.serviceLevelPercent * m.totalCalls), 0) / totalValidCalls)
    : 0;

  // Abandonment %: Weighted average by total calls
  const abandonmentRatePercent = totalValidCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.abandonmentRatePercent * m.totalCalls), 0) / totalValidCalls)
    : 0;

  // ASA: Weighted average by attended calls
  const asaSeconds = totalAttendedCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.asaSeconds * m.attendedCalls), 0) / totalAttendedCalls)
    : 0;

  // ATA: Weighted average by abandoned calls
  const ataSeconds = totalAbandonedCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.ataSeconds * m.abandonedCalls), 0) / totalAbandonedCalls)
    : 0;

  // Erlang C: Simple average across queues
  const erlangC = Math.round((validQueues.reduce((sum, m) => sum + m.erlangC, 0) / validQueues.length) * 10) / 10;

  // Diagnóstico: Comparar ASA vs ATA
  const getDiagnosis = () => {
    if (asaSeconds > ataSeconds) {
      return { message: 'Equipo lento', color: 'bg-red-50 text-red-600', border: 'border-red-100' };
    } else if (asaSeconds < ataSeconds) {
      return { message: 'Equipo rápido', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' };
    }
    return { message: 'En el límite', color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' };
  };
  const diagnosis = getDiagnosis();

  const cards = [
    {
      label: 'Nivel de Servicio (SL%)',
      value: `${serviceLevelPercent}%`,
      sub: 'Espera perceptual ≤ 20s',
      icon: TrendingUp,
      color: serviceLevelPercent >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
      border: serviceLevelPercent >= 80 ? 'border-emerald-100' : 'border-red-100',
      benchmark: '≥ 80%',
      tooltip: {
        definition: 'Porcentaje de llamadas atendidas dentro de 20 segundos (INCLUYENDO tiempo en cola + tiempo en alerta)',
        formula: '(Atendidas donde queue_time + alert_time ≤ 20s) / (Atendidas + Abandonadas reales) × 100',
        unit: 'Porcentaje (%)',
        benchmark: '≥ 80% (norma WFM Chile). Nota: Incluye tiempo de rebote para reflejar experiencia real del cliente',
      },
    },
    {
      label: 'Tasa de Abandono',
      value: `${abandonmentRatePercent}%`,
      sub: 'Clientes perdidos',
      icon: TrendingDown,
      color: abandonmentRatePercent <= 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600',
      border: abandonmentRatePercent <= 10 ? 'border-emerald-100' : 'border-orange-100',
      benchmark: '≤ 10%',
      tooltip: {
        definition: 'Porcentaje de clientes que cuelgan antes de ser atendidos (en cola o alerta)',
        formula: '(Reales abandonadas en cola/alerta) / (Atendidas + Abandonadas reales) × 100',
        unit: 'Porcentaje (%)',
        benchmark: '≤ 10%. Nota: Denominador es igual al de SL% → SL% + Abandon% = 100%',
      },
    },
    {
      label: 'ASA (Velocidad de Respuesta)',
      value: formatDuration(asaSeconds),
      sub: 'Solo llamadas atendidas (perceptual)',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      benchmark: 'Menor es mejor',
      tooltip: {
        definition: 'Tiempo promedio de espera PERCEPTUAL (en cola + en alerta) de llamadas atendidas',
        formula: 'SUM(queue_time + alert_time de atendidas) / Cantidad de atendidas',
        unit: 'Segundos (mm:ss)',
        benchmark: 'Menor es mejor. Mide velocidad real del equipo incluyendo rebotes',
      },
    },
    {
      label: 'ATA (Paciencia del Cliente)',
      value: formatDuration(ataSeconds),
      sub: 'Solo llamadas abandonadas (perceptual)',
      icon: Clock,
      color: diagnosis.color,
      border: diagnosis.border,
      benchmark: diagnosis.message,
      tooltip: {
        definition: 'Tiempo promedio de espera PERCEPTUAL (en cola + en alerta) antes de que cliente abandone',
        formula: 'SUM(queue_time + alert_time de abandonadas) / Cantidad de abandonadas',
        unit: 'Segundos (mm:ss)',
        benchmark: 'Si ATA &gt; ASA: cliente es paciente (buen equipo). Si ATA &lt; ASA: cliente impaciente (necesita personal)',
      },
    },
  ];

  const operationalCards = [
    {
      label: 'Tasa de Rebote',
      value: `${operationalKPIs.bounceRatePercent}%`,
      sub: 'De llamadas atendidas',
      icon: PhoneOff,
      color: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100',
      benchmark: 'Menor es mejor',
      tooltip: {
        definition: 'Porcentaje de llamadas atendidas que fueron devueltas a cola (alert_segments > 1)',
        formula: 'Llamadas atendidas con rebotes / Llamadas atendidas × 100',
        unit: 'Porcentaje (%)',
        benchmark: 'Menor es mejor. Alta tasa indica falta de disponibilidad',
      },
    },
    {
      label: 'Resolución IVR',
      value: `${operationalKPIs.ivrResolutionRatePercent}%`,
      sub: 'De llamadas inbound',
      icon: AlertCircle,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      benchmark: 'Mayor es mejor',
      tooltip: {
        definition: 'Porcentaje de llamadas que fueron resueltas en el IVR sin entrar a cola (flow_exit = false)',
        formula: 'Llamadas IVR sin entrar a cola / Llamadas inbound × 100',
        unit: 'Porcentaje (%)',
        benchmark: 'Mayor es mejor. Alivia carga de colas',
      },
    },
    {
      label: 'Éxito de Alertas',
      value: `${operationalKPIs.alertSuccessRatio}%`,
      sub: 'Probabilidad de respuesta',
      icon: Activity,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
      benchmark: 'Mayor es mejor',
      tooltip: {
        definition: 'Probabilidad de que un ejecutivo atienda una alerta (inversión de tasa de no responden)',
        formula: '1 - (Total "No responden" / Total alertas) × 100',
        unit: 'Porcentaje (%)',
        benchmark: 'Mayor es mejor. Refleja disponibilidad real del equipo',
      },
    },
  ];

  const supplementaryCards = [
    {
      label: 'Erlang C (Carga)',
      value: erlangC.toFixed(1),
      sub: 'Intensidad de tráfico',
      icon: Zap,
      color: erlangC <= 0.8 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
      border: erlangC <= 0.8 ? 'border-emerald-100' : 'border-amber-100',
      benchmark: '≤ 0.8 ideal',
      tooltip: {
        definition: 'Intensidad de tráfico normalizada: promedio de agentes ocupados durante el período',
        formula: 'SUM(handle_time_seconds) / (3600 × Horas del período)',
        unit: 'Erlangs',
        benchmark: '≤ 0.8 ideal. Mide dimensionamiento de personal',
      },
    },
  ];

  // Combine operational cards with Erlang C for second row (4 columns)
  const secondRowCards = [...operationalCards, supplementaryCards[0]];

  return (
    <div className="space-y-4">
      {/* Row 1: Primary Metrics (SL%, Abandono%, ASA, ATA) */}
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

      {/* Row 2: Operational KPIs + Erlang C */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondRowCards.map(({ label, value, sub, icon: Icon, color, border, benchmark, tooltip }) => (
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
