import type { OutboundKPI } from '../lib/outboundKPI';

type Props = {
  kpi: OutboundKPI;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Effective Contact Rate */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
          Tasa Contacto Efectivo
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span
            className="text-3xl font-bold"
            style={{ color: getContactRateColor(kpi.effectiveContactRate) }}
          >
            {(kpi.effectiveContactRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-slate-600 space-y-1">
          <p>
            {kpi.validContacts.toLocaleString('es-CL')} válidos de{' '}
            {kpi.totalOutboundAttempts.toLocaleString('es-CL')} intentos
          </p>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, kpi.effectiveContactRate * 100)}%`,
                backgroundColor: getContactRateColor(kpi.effectiveContactRate),
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            ✓ Conversación &gt;10s, no sistema
          </p>
        </div>
      </div>

      {/* AHT Outbound */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
          AHT Saliente (Promedio)
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-slate-600">Conversación</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatDuration(kpi.ahtOutbound.conversation)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">ACW</p>
            <p className="text-lg font-semibold text-amber-600">
              {formatDuration(kpi.ahtOutbound.acw)}
            </p>
          </div>
          <div className="border-t border-slate-200 pt-2">
            <p className="text-xs text-slate-600">Total</p>
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
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
          Impacto Ocupación
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span
            className="text-3xl font-bold"
            style={{ color: getOccupancyColor(kpi.occupancyImpact) }}
          >
            {(kpi.occupancyImpact * 100).toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-slate-600 space-y-2">
          <p>{kpi.totalOutboundAttempts.toLocaleString('es-CL')} intentos salientes</p>
          <div
            className="text-xs font-semibold p-2 rounded"
            style={{
              backgroundColor:
                kpi.occupancyImpact <= 0.25 ? '#e3f4ee' : '#fbf1de',
              color: kpi.occupancyImpact <= 0.25 ? '#1d8e6e' : '#b8761b',
            }}
          >
            {kpi.occupancyImpact <= 0.25
              ? '✓ Óptimo'
              : '⚠ Alto impacto inbound'}
          </div>
        </div>
      </div>
    </div>
  );
}
