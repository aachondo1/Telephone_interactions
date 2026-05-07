import { TrendingUp, AlertCircle, Clock, AlertTriangle, PhoneCall } from 'lucide-react';

export type OccupationKPIData = {
  effectiveOccupancy: number;
  occupancyTrend: number;
  shrinkagePercent: number;
  shrinkageTrend: number;
  evasionTime: { hours: number; minutes: number };
  evasionCalls: number;
  ghostHours: { hours: number; minutes: number };
  ghostImpact: number;
  cascadeResponseRate: number;
  totalAlerted: number;
};

type Props = {
  data: OccupationKPIData;
};

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

  const getCascadeColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-600 bg-emerald-50';
    if (rate >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getCascadeBorder = (rate: number) => {
    if (rate >= 80) return 'border-emerald-100';
    if (rate >= 50) return 'border-orange-100';
    return 'border-red-100';
  };

  const cards = [
    {
      label: 'Ocupación Efectiva',
      value: `${data.effectiveOccupancy}%`,
      subValue: `${data.occupancyTrend > 0 ? '+' : ''}${data.occupancyTrend}% vs semana anterior`,
      icon: TrendingUp,
      color: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
      tooltip: '(Tiempo Conversación + ACW) / Tiempo Disponible real',
    },
    {
      label: 'Pérdida por Shrinkage',
      value: `${data.shrinkagePercent}%`,
      subValue: `Límite aceptable: 15%`,
      icon: AlertTriangle,
      color: getShrinkageColor(data.shrinkagePercent),
      border: getShrinkageBorder(data.shrinkagePercent),
      tooltip: 'Tiempo en Pausa, Comida o Reunión',
    },
    {
      label: 'Fugas por Evasión',
      value: `${String(data.evasionTime.hours).padStart(2, '0')}:${String(data.evasionTime.minutes).padStart(2, '0')}`,
      subValue: `Equiv. a ${data.evasionCalls} llamadas no contestadas`,
      icon: AlertCircle,
      color: 'bg-red-50 text-red-600',
      border: 'border-red-100',
      tooltip: 'Total de tiempo No Responde',
    },
    {
      label: 'Inflación de Horas',
      value: `${String(data.ghostHours.hours).padStart(2, '0')}:${String(data.ghostHours.minutes).padStart(2, '0')}`,
      subValue: `Impacto en ocupación: +${data.ghostImpact}%`,
      icon: Clock,
      color: 'bg-violet-50 text-violet-600',
      border: 'border-violet-100',
      tooltip: 'Horas "Fantasma" detectadas',
    },
    {
      label: 'Tasa Respuesta Cascada',
      value: `${data.cascadeResponseRate}%`,
      subValue: `Sobre ${data.totalAlerted} alertas totales`,
      icon: PhoneCall,
      color: getCascadeColor(data.cascadeResponseRate),
      border: getCascadeBorder(data.cascadeResponseRate),
      tooltip: 'Alertas recibidas respondidas / Total alertas del equipo',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.color} border ${card.border} rounded-lg p-5 relative group`}
            title={card.tooltip}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mb-1">{card.value}</p>
                <p className="text-xs text-slate-600">{card.subValue}</p>
              </div>
              <Icon size={24} className="flex-shrink-0 opacity-20" />
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {card.tooltip}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
