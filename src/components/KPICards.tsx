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
        icon={<Phone size={20} className="text-bice-navy" />}
        accent="bg-bice-navy-tint"
      />
      <KPICardWithComparison
        title="Duración promedio"
        currentValue={kpis.avgDurationFormatted}
        previousValue={prev ? prev.avgDurationFormatted : undefined}
        changePercent={prev ? calcChangePercent(kpis.avgDurationSeconds, prev.avgDurationSeconds) : undefined}
        isNeutral
        subtitle="Por llamada"
        icon={<Clock size={20} className="text-bice-cyan" />}
        accent="bg-bice-cyan-tint"
      />
      <KPICardWithComparison
        title="Completitud"
        currentValue={`${kpis.completenessRate}%`}
        previousValue={prev ? `${prev.completenessRate}%` : undefined}
        changePercent={calcChangePercent(kpis.completenessRate, prev?.completenessRate)}
        subtitle="Exportación completa"
        icon={<CheckCircle size={20} className="text-bice-success" />}
        accent="bg-bice-success-bg"
      />
      <KPICardWithComparison
        title="Sin atender"
        currentValue={`${kpis.unattendedPercent}%`}
        previousValue={prev ? `${prev.unattendedPercent}%` : undefined}
        changePercent={calcChangePercent(kpis.unattendedPercent, prev?.unattendedPercent)}
        isLowerBetter
        subtitle={`${kpis.unattendedCount.toLocaleString('es-CL')} llamadas`}
        icon={<PhoneMissed size={20} className="text-bice-alert" />}
        accent="bg-bice-alert-bg"
      />
    </div>
  );
}