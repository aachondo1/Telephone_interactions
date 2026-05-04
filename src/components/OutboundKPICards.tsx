import { Tooltip } from './Tooltip';
import { formatDuration } from '../lib/biceColors';
import type { OutboundKPI } from '../lib/outboundKPI';

type Props = {
  kpi: OutboundKPI;
};

const THRESHOLDS = {
  contactRate: 0.6,
  occupancy: 0.25,
};

function getContactRateColor(rate: number): string {
  if (rate >= 0.7) return '#84BD00';
  if (rate >= 0.6) return '#326295';
  if (rate >= 0.5) return '#b8761b';
  return '#c0392b';
}

function getOccupancyColor(occupancy: number): string {
  if (occupancy <= 0.15) return '#84BD00';
  if (occupancy <= 0.25) return '#326295';
  if (occupancy <= 0.35) return '#b8761b';
  return '#c0392b';
}

export function OutboundKPICards({ kpi }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Effective Contact Rate */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Tasa de Contacto Efectivo
          </div>
          <Tooltip
            label="Contactabilidad"
            definition="Porcentaje de llamadas salientes con conversación válida (>10s), excluyendo finalizaciones por sistema."
            formula="(Contactos Válidos / Total Intentos) × 100"
            unit="%"
            benchmark="Meta: ≥60%"
          />
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span
            className="text-4xl font-bold"
            style={{ color: getContactRateColor(kpi.effectiveContactRate) }}
          >
            {(kpi.effectiveContactRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-slate-600">
          <p>
            {kpi.validContacts.toLocaleString('es-CL')} contactos válidos de{' '}
            {kpi.totalOutboundAttempts.toLocaleString('es-CL')} intentos
          </p>
          <div
            className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden"
            style={{ backgroundColor: '#e0f2fe' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, kpi.effectiveContactRate * 100)}%`,
                backgroundColor: getContactRateColor(kpi.effectiveContactRate),
              }}
            />
          </div>
        </div>
      </div>

      {/* AHT Outbound */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            AHT Saliente (Promedio)
          </div>
          <Tooltip
            label="Esfuerzo de Recuperación"
            definition="Desglose de Manejo Total en conversación efectiva vs. tiempo administrativo (ACW)."
            formula="Conversación + ACW"
            unit="min:seg"
            benchmark="Monitorear tendencia"
          />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-600 mb-1">Conversación</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatDuration(kpi.ahtOutbound.conversation)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">ACW (Administrativa)</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatDuration(kpi.ahtOutbound.acw)}
            </p>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs text-slate-600 mb-1">Total</p>
            <p
              className="text-2xl font-bold"
              style={{
                color:
                  kpi.ahtOutbound.acw > kpi.ahtOutbound.conversation
                    ? '#c0392b'
                    : '#1d8e6e',
              }}
            >
              {formatDuration(kpi.ahtOutbound.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Occupancy Impact */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Impacto en Ocupación
          </div>
          <Tooltip
            label="Uso de Capacidad"
            definition="Porcentaje del tiempo total del equipo invertido en gestión proactiva (salientes)."
            formula="(Tiempo Salientes / Tiempo Total) × 100"
            unit="%"
            benchmark="Óptimo: 10-20%"
          />
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span
            className="text-4xl font-bold"
            style={{ color: getOccupancyColor(kpi.occupancyImpact) }}
          >
            {(kpi.occupancyImpact * 100).toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-slate-600">
          <p className="mb-3">
            {kpi.totalOutboundAttempts.toLocaleString('es-CL')} intentos salientes
          </p>
          <div
            className="text-xs font-semibold p-2 rounded"
            style={{
              backgroundColor:
                kpi.occupancyImpact <= THRESHOLDS.occupancy
                  ? '#e3f4ee'
                  : '#fbf1de',
              color:
                kpi.occupancyImpact <= THRESHOLDS.occupancy
                  ? '#1d8e6e'
                  : '#b8761b',
            }}
          >
            {kpi.occupancyImpact <= THRESHOLDS.occupancy
              ? '✓ Dentro de rango óptimo'
              : '⚠ Posible impacto en inbound'}
          </div>
        </div>
      </div>
    </div>
  );
}
