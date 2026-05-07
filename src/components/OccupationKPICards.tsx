import { TrendingUp, AlertCircle, Clock, AlertTriangle } from 'lucide-react';

export type OccupationKPIData = {
  effectiveOccupancy: number;
  occupancyTrend: number;
  shrinkagePercent: number;
  shrinkageTrend: number;
  evasionTime: { hours: number; minutes: number };
  evasionCalls: number;
  ghostHours: { hours: number; minutes: number };
  ghostImpact: number;
};

type Props = {
  data: OccupationKPIData;
};

function getOccupancyInterpretation(occupancy: number): { text: string; color: string } {
  if (occupancy === 0) return { text: 'Sin datos cargados', color: 'text-slate-500' };
  if (occupancy < 50) return { text: '⚠️ Bajo - Investigar desempeño', color: 'text-red-600' };
  if (occupancy < 70) return { text: 'ℹ️ Por debajo del objetivo (70%+)', color: 'text-orange-600' };
  return { text: '✓ Excelente desempeño', color: 'text-emerald-600' };
}

function getShrinkageInterpretation(shrinkage: number): string {
  if (shrinkage === 0) return 'Sin datos';
  if (shrinkage > 20) return '🔴 Crítico - Sesión con gerente urgente';
  if (shrinkage > 15) return '⚠️ Por encima del límite permitido';
  return '✓ Dentro del límite aceptable (≤15%)';
}

function getEvasionInterpretation(hours: number, minutes: number): string {
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes === 0) return '✓ Sin evasión reportada';
  if (totalMinutes > 120) return '🔴 Crítico - Escalada a compliance';
  if (totalMinutes > 60) return '⚠️ Alto - Requiere revisión';
  return '✓ Aceptable';
}

function getGhostHoursInterpretation(hours: number, minutes: number): string {
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes === 0) return '✓ Sin anomalías detectadas';
  if (totalMinutes > 30) return '🔴 Crítico - Auditoría de fraude recomendada';
  if (totalMinutes > 15) return '⚠️ Investigar anomalía de horas';
  return '✓ Normal';
}

export function OccupationKPICards({ data }: Props) {
  const getShrinkageColor = (shrinkage: number) => {
    if (shrinkage > 20) return 'text-red-600 bg-red-50';
    if (shrinkage > 15) return 'text-orange-600 bg-orange-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  const getShrinkageBorder = (shrinkage: number) => {
    if (shrinkage > 20) return 'border-red-100';
    if (shrinkage > 15) return 'border-orange-100';
    return 'border-emerald-100';
  };

  const occupancyInterp = getOccupancyInterpretation(data.effectiveOccupancy);

  const cards = [
    {
      label: 'Ocupación Efectiva',
      value: `${data.effectiveOccupancy}%`,
      subValue: `${data.occupancyTrend > 0 ? '+' : ''}${data.occupancyTrend}% vs período anterior`,
      interpretation: occupancyInterp.text,
      interpretationColor: occupancyInterp.color,
      icon: TrendingUp,
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
      tooltip: '% del tiempo disponible realmente productivo (conversación + ACW)',
    },
    {
      label: 'Pérdida por Shrinkage',
      value: `${data.shrinkagePercent}%`,
      subValue: `${data.shrinkageTrend > 0 ? '+' : ''}${data.shrinkageTrend}% vs período anterior`,
      interpretation: getShrinkageInterpretation(data.shrinkagePercent),
      interpretationColor: data.shrinkagePercent > 20 ? 'text-red-600' : data.shrinkagePercent > 15 ? 'text-orange-600' : 'text-emerald-600',
      icon: AlertTriangle,
      color: getShrinkageColor(data.shrinkagePercent),
      border: getShrinkageBorder(data.shrinkagePercent),
      tooltip: 'Tiempo en Pausa, Comida, Reunión u otros estados no productivos',
    },
    {
      label: 'Fugas por Evasión',
      value: `${String(data.evasionTime.hours).padStart(2, '0')}:${String(data.evasionTime.minutes).padStart(2, '0')}`,
      subValue: `Equiv. a ${data.evasionCalls} llamadas no contestadas`,
      interpretation: getEvasionInterpretation(data.evasionTime.hours, data.evasionTime.minutes),
      interpretationColor: 'text-red-600',
      icon: AlertCircle,
      color: 'bg-red-50 text-red-600',
      border: 'border-red-100',
      tooltip: 'Total de tiempo que el agente no respondió a alertas (riesgo de abandono)',
    },
    {
      label: 'Inflación de Horas',
      value: `${String(data.ghostHours.hours).padStart(2, '0')}:${String(data.ghostHours.minutes).padStart(2, '0')}`,
      subValue: `Impacto en ocupación: +${data.ghostImpact}%`,
      interpretation: getGhostHoursInterpretation(data.ghostHours.hours, data.ghostHours.minutes),
      interpretationColor: 'text-violet-600',
      icon: Clock,
      color: 'bg-violet-50 text-violet-600',
      border: 'border-violet-100',
      tooltip: 'Horas "fantasma" - tiempo reportado fuera de horario normal o con anomalías',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.color} border ${card.border} rounded-lg p-5 relative group`}
            title={card.tooltip}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mb-1">{card.value}</p>
                <p className="text-xs text-slate-500 mb-2">{card.subValue}</p>
              </div>
              <Icon size={24} className="flex-shrink-0 opacity-20" />
            </div>

            {/* Interpretation line */}
            <div className={`text-xs font-medium ${card.interpretationColor} bg-white/50 rounded px-2 py-1`}>
              {card.interpretation}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded whitespace-normal pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 w-48">
              {card.tooltip}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
