import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import type { QueueHealthMetric } from '../lib/kpi';

type Props = {
  metric: QueueHealthMetric;
};

export function ASAATADiagnosis({ metric }: Props) {
  const asa = metric.asaSeconds;
  const ata = metric.ataSeconds;

  // Determinar el cuadrante
  const isASAHigh = asa > ata;
  const isASALow = asa <= ata;

  let diagnosis: {
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    icon: typeof AlertCircle;
    color: string;
    bgColor: string;
    borderColor: string;
  } = {
    title: 'Diagnóstico',
    message: '',
    severity: 'info',
    icon: AlertCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  };

  if (isASAHigh && ata < 30) {
    // ASA alto, ATA bajo: Peligro crítico
    diagnosis = {
      title: '🚨 CRÍTICO: Equipo Lento + Cliente Impaciente',
      message: 'Riesgo muy alto de abandono. Tus agentes tardan más en responder que lo que los clientes están dispuestos a esperar. Necesitas agentes adicionales INMEDIATAMENTE.',
      severity: 'critical',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100',
    };
  } else if (isASAHigh && ata >= 30) {
    // ASA alto pero ATA también: Clientes pacientes
    diagnosis = {
      title: '⚠️ ALERTA: Equipo Lento (pero clientes tolerantes)',
      message: 'Tu equipo es lento pero tus clientes están dispuestos a esperar. Cualquier reducción de personal hará que los abandonos se disparen. Optimiza operaciones.',
      severity: 'warning',
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    };
  } else if (isASALow && ata > asa) {
    // ASA bajo, ATA más alto: Saludable
    diagnosis = {
      title: '✓ SALUDABLE: Equipo Rápido + Clientes Pacientes',
      message: 'Tu equipo es rápido y los clientes toleran esperas. Este es el escenario ideal. Mantén esta velocidad.',
      severity: 'info',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    };
  } else if (isASALow && ata <= asa) {
    // ASA bajo, ATA igual o menor: En el límite
    diagnosis = {
      title: '⚠️ EN EL LÍMITE: Equilibrio Precario',
      message: 'ASA y ATA están en paridad. Cualquier baja de personal o aumento de demanda hará que los abandonos se disparen.',
      severity: 'warning',
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    };
  }

  const Icon = diagnosis.icon;

  return (
    <div className={`${diagnosis.bgColor} ${diagnosis.borderColor} rounded-2xl border p-6 space-y-4`}>
      <div className="flex items-start gap-4">
        <Icon size={24} className={`${diagnosis.color} flex-shrink-0 mt-1`} />
        <div className="flex-1">
          <h3 className={`font-bold text-lg ${diagnosis.color} mb-2`}>{diagnosis.title}</h3>
          <p className="text-sm text-slate-700">{diagnosis.message}</p>
        </div>
      </div>

      {/* Matriz de decisión */}
      <div className="mt-6 pt-4 border-t border-current border-opacity-20">
        <p className="text-xs font-semibold text-slate-600 mb-3">Matriz de Diagnóstico:</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="font-semibold mb-1">ASA Alto + ATA Bajo</p>
            <p>Equipo lento, cliente impaciente → Abandonos ↑↑</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="font-semibold mb-1">ASA Alto + ATA Alto</p>
            <p>Equipo lento, cliente paciente → Riesgo limitado</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="font-semibold mb-1">ASA Bajo + ATA Alto</p>
            <p>Equipo rápido, cliente paciente → Ideal ✓</p>
          </div>
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="font-semibold mb-1">ASA Bajo + ATA Bajo</p>
            <p>ASA y ATA en paridad → En el límite ⚠️</p>
          </div>
        </div>
      </div>

      {/* Métricas actuales */}
      <div className="mt-4 pt-4 border-t border-current border-opacity-20 flex gap-6">
        <div>
          <p className="text-xs text-slate-600 mb-1">ASA (Velocidad de tu equipo)</p>
          <p className="text-xl font-bold">{metric.asaFormatted}</p>
        </div>
        <div>
          <p className="text-xs text-slate-600 mb-1">ATA (Paciencia del cliente)</p>
          <p className="text-xl font-bold">{metric.ataFormatted}</p>
        </div>
      </div>
    </div>
  );
}
