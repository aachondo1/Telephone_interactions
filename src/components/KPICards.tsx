import { Phone, Clock, CheckCircle, PhoneMissed } from 'lucide-react';
import type { KPISummary } from '../lib/kpi';

type Props = {
  kpis: KPISummary;
};

type CardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
};

function KPICard({ title, value, subtitle, icon, accent }: CardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500 leading-tight">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function KPICards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total de llamadas"
        value={kpis.totalCalls.toLocaleString('es-CL')}
        subtitle="Registros en el período"
        icon={<Phone size={20} className="text-sky-600" />}
        accent="bg-sky-50"
      />
      <KPICard
        title="Duración promedio"
        value={kpis.avgDurationFormatted}
        subtitle="Por llamada"
        icon={<Clock size={20} className="text-emerald-600" />}
        accent="bg-emerald-50"
      />
      <KPICard
        title="Completitud"
        value={`${kpis.completenessRate}%`}
        subtitle="Exportación completa"
        icon={<CheckCircle size={20} className="text-amber-600" />}
        accent="bg-amber-50"
      />
      <KPICard
        title="Sin atender"
        value={`${kpis.unattendedPercent}%`}
        subtitle={`${kpis.unattendedCount.toLocaleString('es-CL')} llamadas`}
        icon={<PhoneMissed size={20} className="text-red-500" />}
        accent="bg-red-50"
      />
    </div>
  );
}
