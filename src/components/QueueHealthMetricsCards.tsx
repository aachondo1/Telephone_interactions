import { TrendingUp, TrendingDown, Clock, Zap, PhoneOff, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { QueueHealthMetric, OperationalKPIs, AbandonFunnelData } from '../lib/kpi';
import { calcChangePercent } from '../lib/periodComparison';
import { Tooltip } from './Tooltip';

type Props = {
  metrics: QueueHealthMetric[];
  operationalKPIs: OperationalKPIs;
  funnelData?: AbandonFunnelData;
  previousMetrics?: QueueHealthMetric[] | null;
  previousOperationalKPIs?: OperationalKPIs | null;
};

type CardData = {
  label: string;
  currentValue: string;
  currentNumeric: number;
  previousNumeric?: number;
  previousValue?: string;
  isLowerBetter?: boolean;
  isNeutral?: boolean;
  sub: string;
  icon: LucideIcon;
  color: string;
  border: string;
  benchmark: string;
  tooltip?: { definition: string; formula: string; unit: string; benchmark: string };
};

type BreakdownCardData = {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  color: string;
  border: string;
  benchmark: string;
  tooltip?: { definition: string; formula: string; unit: string; benchmark: string };
};

function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function computeAggregates(metrics: QueueHealthMetric[]) {
  const validQueues = metrics.filter(m => (m.attendedCalls > 0 || m.abandonedCalls > 0) && m.queue !== 'Sin cola');
  if (validQueues.length === 0) return null;

  const totalValidCalls = validQueues.reduce((sum, m) => sum + m.totalCalls, 0);
  const totalAttendedCalls = validQueues.reduce((sum, m) => sum + m.attendedCalls, 0);
  const totalAbandonedCalls = validQueues.reduce((sum, m) => sum + m.abandonedCalls, 0);

  const serviceLevelPercent = totalValidCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.serviceLevelPercent * m.totalCalls), 0) / totalValidCalls)
    : 0;

  const abandonmentRatePercent = totalValidCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.abandonmentRatePercent * m.totalCalls), 0) / totalValidCalls)
    : 0;

  const asaSeconds = totalAttendedCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.asaSeconds * m.attendedCalls), 0) / totalAttendedCalls)
    : 0;

  const ataSeconds = totalAbandonedCalls > 0
    ? Math.round(validQueues.reduce((sum, m) => sum + (m.ataSeconds * m.abandonedCalls), 0) / totalAbandonedCalls)
    : 0;

  const erlangC = Math.round((validQueues.reduce((sum, m) => sum + m.erlangC, 0) / validQueues.length) * 10) / 10;

  return {
    totalValidCalls,
    totalAttendedCalls,
    totalAbandonedCalls,
    serviceLevelPercent,
    abandonmentRatePercent,
    asaSeconds,
    ataSeconds,
    erlangC,
  };
}

export function QueueHealthMetricsCards({ metrics, operationalKPIs, funnelData, previousMetrics, previousOperationalKPIs }: Props) {
  const agg = computeAggregates(metrics);
  const prevAgg = previousMetrics ? computeAggregates(previousMetrics) : null;

  if (!agg) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <p className="text-slate-500">Sin datos disponibles</p>
      </div>
    );
  }

  const getDiagnosis = (asa: number, ata: number) => {
    if (asa > ata) {
      return { message: 'Equipo lento', color: 'bg-bice-alert-bg text-bice-alert', border: 'border-bice-alert/20' };
    } else if (asa < ata) {
      return { message: 'Equipo rápido', color: 'bg-bice-success-bg text-bice-success', border: 'border-bice-success/20' };
    }
    return { message: 'En el límite', color: 'bg-bice-warning-bg text-bice-warning', border: 'border-bice-warning/20' };
  };
  const diagnosis = getDiagnosis(agg.asaSeconds, agg.ataSeconds);

  const cards: CardData[] = [
    {
      label: 'Nivel de Servicio (SL%)',
      currentValue: `${agg.serviceLevelPercent}%`,
      currentNumeric: agg.serviceLevelPercent,
      previousNumeric: prevAgg?.serviceLevelPercent,
      previousValue: prevAgg ? `${prevAgg.serviceLevelPercent}%` : undefined,
      sub: 'Espera perceptual ≤ 20s',
      icon: TrendingUp,
      color: agg.serviceLevelPercent >= 80 ? 'bg-bice-success-bg text-bice-success' : 'bg-bice-alert-bg text-bice-alert',
      border: agg.serviceLevelPercent >= 80 ? 'border-bice-success/20' : 'border-bice-alert/20',
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
      currentValue: `${agg.abandonmentRatePercent}%`,
      currentNumeric: agg.abandonmentRatePercent,
      previousNumeric: prevAgg?.abandonmentRatePercent,
      previousValue: prevAgg ? `${prevAgg.abandonmentRatePercent}%` : undefined,
      isLowerBetter: true,
      sub: 'Clientes perdidos',
      icon: TrendingDown,
      color: agg.abandonmentRatePercent <= 10 ? 'bg-bice-success-bg text-bice-success' : 'bg-bice-warning-bg text-bice-warning',
      border: agg.abandonmentRatePercent <= 10 ? 'border-bice-success/20' : 'border-bice-warning/20',
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
      currentValue: formatDuration(agg.asaSeconds),
      currentNumeric: agg.asaSeconds,
      previousNumeric: prevAgg?.asaSeconds,
      previousValue: prevAgg ? formatDuration(prevAgg.asaSeconds) : undefined,
      isLowerBetter: true,
      sub: 'Solo llamadas atendidas (perceptual)',
      icon: Clock,
      color: 'bg-bice-navy-tint text-bice-navy',
      border: 'border-bice-navy/10',
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
      currentValue: formatDuration(agg.ataSeconds),
      currentNumeric: agg.ataSeconds,
      previousNumeric: prevAgg?.ataSeconds,
      previousValue: prevAgg ? formatDuration(prevAgg.ataSeconds) : undefined,
      isNeutral: true,
      sub: 'Solo llamadas abandonadas (perceptual)',
      icon: Clock,
      color: diagnosis.color,
      border: diagnosis.border,
      benchmark: diagnosis.message,
      tooltip: {
        definition: 'Tiempo promedio de espera PERCEPTUAL (en cola + en alerta) antes de que cliente abandone',
        formula: 'SUM(queue_time + alert_time de abandonadas) / Cantidad de abandonadas',
        unit: 'Segundos (mm:ss)',
        benchmark: 'Si ATA > ASA: cliente es paciente (buen equipo). Si ATA < ASA: cliente impaciente (necesita personal)',
      },
    },
  ];

  const operationalCards: CardData[] = [
    {
      label: 'Tasa de Rebote',
      currentValue: `${operationalKPIs.bounceRatePercent}%`,
      currentNumeric: operationalKPIs.bounceRatePercent,
      previousNumeric: previousOperationalKPIs?.bounceRatePercent,
      previousValue: previousOperationalKPIs ? `${previousOperationalKPIs.bounceRatePercent}%` : undefined,
      isLowerBetter: true,
      sub: 'De llamadas atendidas',
      icon: PhoneOff,
      color: 'bg-bice-navy-tint text-bice-navy',
      border: 'border-bice-navy/10',
      benchmark: 'Menor es mejor',
      tooltip: {
        definition: 'Porcentaje de llamadas atendidas que fueron devueltas a cola (alert_segments > 1)',
        formula: 'Llamadas atendidas con rebotes / Llamadas atendidas × 100',
        unit: 'Porcentaje (%)',
        benchmark: 'Menor es mejor. Alta tasa indica falta de disponibilidad',
      },
    },
    {
      label: 'Abandono en Menú',
      currentValue: `${operationalKPIs.menuAbandonRatePercent}%`,
      currentNumeric: operationalKPIs.menuAbandonRatePercent,
      previousNumeric: previousOperationalKPIs?.menuAbandonRatePercent,
      previousValue: previousOperationalKPIs ? `${previousOperationalKPIs.menuAbandonRatePercent}%` : undefined,
      isLowerBetter: true,
      sub: 'De llamadas inbound',
      icon: TrendingDown,
      color: operationalKPIs.menuAbandonRatePercent <= 10 ? 'bg-bice-success-bg text-bice-success' : 'bg-bice-warning-bg text-bice-warning',
      border: operationalKPIs.menuAbandonRatePercent <= 10 ? 'border-bice-success/20' : 'border-bice-warning/20',
      benchmark: '≤ 10%',
      tooltip: {
        definition: 'Porcentaje de llamadas que abandonaron en el IVR después de 10 segundos (indicativo de confusión/frustración)',
        formula: '(flow_exit ≠ true AND ivr_time > 10s) / Total inbound × 100',
        unit: 'Porcentaje (%)',
        benchmark: '≤ 10%. Alerta de problemas de usabilidad en menú IVR',
      },
    },
    {
      label: 'Éxito de Alertas',
      currentValue: `${operationalKPIs.alertSuccessRatio}%`,
      currentNumeric: operationalKPIs.alertSuccessRatio,
      previousNumeric: previousOperationalKPIs?.alertSuccessRatio,
      previousValue: previousOperationalKPIs ? `${previousOperationalKPIs.alertSuccessRatio}%` : undefined,
      sub: 'Probabilidad de respuesta',
      icon: Activity,
      color: 'bg-bice-success-bg text-bice-success',
      border: 'border-bice-success/20',
      benchmark: 'Mayor es mejor',
      tooltip: {
        definition: 'Probabilidad de que un ejecutivo atienda una alerta (inversión de tasa de no responden)',
        formula: '1 - (Total "No responden" / Total alertas) × 100',
        unit: 'Porcentaje (%)',
        benchmark: 'Mayor es mejor. Refleja disponibilidad real del equipo',
      },
    },
  ];

  const supplementaryCards: CardData[] = [
    {
      label: 'Erlang C (Carga)',
      currentValue: agg.erlangC.toFixed(1),
      currentNumeric: agg.erlangC,
      previousNumeric: prevAgg?.erlangC,
      previousValue: prevAgg ? prevAgg.erlangC.toFixed(1) : undefined,
      isNeutral: true,
      sub: 'Intensidad de tráfico',
      icon: Zap,
      color: agg.erlangC <= 0.8 ? 'bg-bice-success-bg text-bice-success' : 'bg-bice-warning-bg text-bice-warning',
      border: agg.erlangC <= 0.8 ? 'border-bice-success/20' : 'border-bice-warning/20',
      benchmark: '≤ 0.8 ideal',
      tooltip: {
        definition: 'Intensidad de tráfico normalizada: promedio de agentes ocupados durante el período',
        formula: 'SUM(handle_time_seconds) / (3600 × Horas del período)',
        unit: 'Erlangs',
        benchmark: '≤ 0.8 ideal. Mide dimensionamiento de personal',
      },
    },
  ];

  const abandonmentBreakdownCards: BreakdownCardData[] = funnelData ? [
    {
      label: 'Abandonos en Cola',
      value: funnelData.abandonInQueue.toLocaleString('es-ES'),
      sub: 'Nunca asignadas a agente',
      icon: PhoneOff,
      color: 'bg-bice-alert-bg text-bice-alert',
      border: 'border-bice-alert/20',
      benchmark: 'Estado 1',
      tooltip: {
        definition: 'Llamadas abandonadas en cola sin ser asignadas a un agente (alert_time = 0)',
        formula: 'queue_time ≥ 10s AND alert_time = 0 AND conversation_total = 0',
        unit: 'Cantidad absoluta',
        benchmark: 'Indica falta de staffing',
      },
    },
    {
      label: 'Abandonos en Escritorio',
      value: funnelData.abandonInAlert.toLocaleString('es-ES'),
      sub: 'Asignadas pero no contestadas',
      icon: PhoneOff,
      color: 'bg-bice-warning-bg text-bice-warning',
      border: 'border-bice-warning/20',
      benchmark: 'Estado 2',
      tooltip: {
        definition: 'Llamadas asignadas a un agente pero no contestadas (alert_time > 0, conversation = 0)',
        formula: 'queue_time ≥ 10s AND alert_time > 0 AND conversation_total = 0',
        unit: 'Cantidad absoluta',
        benchmark: 'Indica agentes no disponibles o poco atentos',
      },
    },
  ] : [];

  const secondRowCards: CardData[] = [...operationalCards, supplementaryCards[0]];

  return (
    <div className="space-y-4">
      {/* Row 1: Primary Metrics (SL%, Abandono%, ASA, ATA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <ComparisonCard key={card.label} card={card} />
        ))}
      </div>

      {/* Row 2: Operational KPIs + Erlang C */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondRowCards.map(card => (
          <ComparisonCard key={card.label} card={card} />
        ))}
      </div>

      {/* Row 3: Abandonment Breakdown (if available) */}
      {abandonmentBreakdownCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {abandonmentBreakdownCards.map(card => (
            <div key={card.label} className={`bg-white rounded-2xl p-6 shadow-sm border ${card.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <span className="text-xs text-slate-400 font-medium">{card.benchmark}</span>
              </div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">{card.label}</p>
                {card.tooltip && (
                  <Tooltip
                    label={card.label}
                    definition={card.tooltip.definition}
                    formula={card.tooltip.formula}
                    unit={card.tooltip.unit}
                    benchmark={card.tooltip.benchmark}
                  />
                )}
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-1">{card.value}</p>
              <p className="text-xs text-slate-500">{card.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ card }: { card: CardData }) {
  const { label, currentValue, currentNumeric, previousNumeric, previousValue, isLowerBetter, isNeutral, sub, icon: Icon, color, border, benchmark, tooltip } = card;

  const change = calcChangePercent(currentNumeric, previousNumeric);

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border ${border}`}>
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
      <p className="text-2xl font-bold text-slate-800 mb-1">{currentValue}</p>
      {previousValue !== undefined ? (
        <div className="space-y-0.5">
          <p className="text-xs text-slate-400">Período anterior: {previousValue}</p>
          {change !== undefined && Math.abs(change) >= 0.05 && (
            <ChangeIndicator
              changePercent={change}
              isLowerBetter={isLowerBetter}
              isNeutral={isNeutral}
            />
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{sub}</p>
      )}
    </div>
  );
}

function ChangeIndicator({
  changePercent,
  isLowerBetter,
  isNeutral,
}: {
  changePercent: number;
  isLowerBetter?: boolean;
  isNeutral?: boolean;
}) {
  const isPositive = changePercent > 0;
  const isImprovement = isLowerBetter ? !isPositive : isPositive;

  let color = 'text-slate-400';
  if (!isNeutral) {
    color = isImprovement ? 'text-bice-success' : 'text-bice-alert';
  }

  const Arrow = isPositive ? '↑' : '↓';
  const formatted = `${Arrow} ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      {formatted}
    </span>
  );
}