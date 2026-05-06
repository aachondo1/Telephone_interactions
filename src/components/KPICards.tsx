import { Phone, Clock, CheckCircle, PhoneMissed } from 'lucide-react';
import type { KPISummary } from '../lib/kpi';
import { calcChangePercent } from '../lib/periodComparison';
import { KPICardWithComparison } from './KPICardWithComparison';

type Props = {
  kpis: KPISummary;
  previousKpis?: KPISummary | null;
};

export function KPICards({ kpis, previousKpis }: Props) {
  const prev = previousKpis;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICardWithComparison
        title="Total de llamadas"
        currentValue={kpis.totalCalls.toLocaleString('es-CL')}
        previousValue={prev ? prev.totalCalls.toLocaleString('es-CL') : undefined}
        changePercent={calcChangePercent(kpis.totalCalls, prev?.totalCalls)}
        subtitle="Registros en el período"
        icon={<Phone size={20} className="text-sky-600" />}
        accent="bg-sky-50"
      />
      <KPICardWithComparison
        title="Duración promedio"
        currentValue={kpis.avgDurationFormatted}
        previousValue={prev ? prev.avgDurationFormatted : undefined}
        changePercent={prev ? calcChangePercent(kpis.avgDurationSeconds, prev.avgDurationSeconds) : undefined}
        isNeutral
        subtitle="Por llamada"
        icon={<Clock size={20} className="text-emerald-600" />}
        accent="bg-emerald-50"
      />
      <KPICardWithComparison
        title="Completitud"
        currentValue={`${kpis.completenessRate}%`}
        previousValue={prev ? `${prev.completenessRate}%` : undefined}
        changePercent={calcChangePercent(kpis.completenessRate, prev?.completenessRate)}
        subtitle="Exportación completa"
        icon={<CheckCircle size={20} className="text-amber-600" />}
        accent="bg-amber-50"
      />
      <KPICardWithComparison
        title="Sin atender"
        currentValue={`${kpis.unattendedPercent}%`}
        previousValue={prev ? `${prev.unattendedPercent}%` : undefined}
        changePercent={calcChangePercent(kpis.unattendedPercent, prev?.unattendedPercent)}
        isLowerBetter
        subtitle={`${kpis.unattendedCount.toLocaleString('es-CL')} llamadas`}
        icon={<PhoneMissed size={20} className="text-red-500" />}
        accent="bg-red-50"
      />
    </div>
  );
}
