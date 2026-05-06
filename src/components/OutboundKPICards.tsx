import type { OutboundKPI } from '../lib/kpi';
import { calcChangePercent } from '../lib/periodComparison';

type Props = {
  kpi: OutboundKPI;
  previousKpi?: OutboundKPI | null;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function OutboundKPICards({ kpi, previousKpi }: Props) {
  const prev = previousKpi;
  const contactRatePercent = kpi.effectiveContactRate * 100;
  const prevContactRatePercent = prev ? prev.effectiveContactRate * 100 : undefined;
  const occupancyPercent = kpi.occupancyImpact * 100;
  const prevOccupancyPercent = prev ? prev.occupancyImpact * 100 : undefined;

  const getContactRateColor = (rate: number) => {
    if (rate >= 0.7) return 'text-bice-success';
    if (rate >= 0.6) return 'text-bice-navy';
    if (rate >= 0.5) return 'text-bice-warning';
    return 'text-bice-alert';
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy <= 0.15) return 'text-bice-success';
    if (occupancy <= 0.25) return 'text-bice-navy';
    if (occupancy <= 0.35) return 'text-bice-warning';
    return 'text-bice-alert';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Effective Contact Rate */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-500 leading-tight">Tasa Contacto Efectivo</p>
        <div>
          <p className={`text-3xl font-bold leading-none ${getContactRateColor(kpi.effectiveContactRate)}`}>
            {contactRatePercent.toFixed(1)}%
          </p>
          {prev && (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-sm text-slate-400">
                Período anterior: {prevContactRatePercent?.toFixed(1)}%
              </p>
              {calcChangePercent(contactRatePercent, prevContactRatePercent) !== undefined && Math.abs(calcChangePercent(contactRatePercent, prevContactRatePercent)!) >= 0.05 && (
                <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${calcChangePercent(contactRatePercent, prevContactRatePercent)! > 0 ? 'text-bice-success' : 'text-bice-alert'}`}>
                  {calcChangePercent(contactRatePercent, prevContactRatePercent)! > 0 ? '↑' : '↓'} {calcChangePercent(contactRatePercent, prevContactRatePercent)!.toFixed(1)}%
                </span>
              )}
            </div>
          )}
          {!prev && (
            <p className="text-sm text-slate-400 mt-1.5">
              {kpi.validContacts.toLocaleString('es-CL')} válidos de{' '}
              {kpi.totalOutboundAttempts.toLocaleString('es-CL')} intentos
            </p>
          )}
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, contactRatePercent)}%`,
              backgroundColor: kpi.effectiveContactRate >= 0.7 ? '#1d8e6e' : kpi.effectiveContactRate >= 0.6 ? '#003A70' : kpi.effectiveContactRate >= 0.5 ? '#b8761b' : '#c0392b',
            }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {'\u2713 Conversación >10s, no sistema'}
        </p>
      </div>

      {/* AHT Outbound */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-500 leading-tight">AHT Saliente (Promedio)</p>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-slate-600">Conversación</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatDuration(kpi.ahtOutbound.conversation)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">ACW</p>
            <p className="text-lg font-semibold text-bice-warning">
              {formatDuration(kpi.ahtOutbound.acw)}
            </p>
          </div>
          <div className="border-t border-slate-200 pt-2">
            <p className="text-xs text-slate-600">Total</p>
            <p className={`text-2xl font-bold ${kpi.ahtOutbound.acw > kpi.ahtOutbound.conversation ? 'text-bice-alert' : 'text-bice-success'}`}>
              {formatDuration(kpi.ahtOutbound.total)}
            </p>
          </div>
          {prev && (
            <div className="border-t border-slate-200 pt-2 space-y-0.5">
              <p className="text-xs text-slate-400">Período anterior: {formatDuration(prev.ahtOutbound.total)}</p>
              {calcChangePercent(kpi.ahtOutbound.total, prev.ahtOutbound.total) !== undefined && Math.abs(calcChangePercent(kpi.ahtOutbound.total, prev.ahtOutbound.total)!) >= 0.05 && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${calcChangePercent(kpi.ahtOutbound.total, prev.ahtOutbound.total)! > 0 ? 'text-bice-alert' : 'text-bice-success'}`}>
                  {calcChangePercent(kpi.ahtOutbound.total, prev.ahtOutbound.total)! > 0 ? '↑' : '↓'} {calcChangePercent(kpi.ahtOutbound.total, prev.ahtOutbound.total)!.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Occupancy Impact */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-500 leading-tight">Impacto Ocupación</p>
        <div>
          <p className={`text-3xl font-bold leading-none ${getOccupancyColor(kpi.occupancyImpact)}`}>
            {occupancyPercent.toFixed(1)}%
          </p>
          {prev && (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-sm text-slate-400">
                Período anterior: {prevOccupancyPercent?.toFixed(1)}%
              </p>
              {calcChangePercent(occupancyPercent, prevOccupancyPercent) !== undefined && Math.abs(calcChangePercent(occupancyPercent, prevOccupancyPercent)!) >= 0.05 && (
                <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${calcChangePercent(occupancyPercent, prevOccupancyPercent)! > 0 ? 'text-bice-alert' : 'text-bice-success'}`}>
                  {calcChangePercent(occupancyPercent, prevOccupancyPercent)! > 0 ? '↑' : '↓'} {calcChangePercent(occupancyPercent, prevOccupancyPercent)!.toFixed(1)}%
                </span>
              )}
            </div>
          )}
          {!prev && (
            <p className="text-sm text-slate-400 mt-1.5">
              {kpi.totalOutboundAttempts.toLocaleString('es-CL')} intentos salientes
            </p>
          )}
        </div>
        <div
          className="text-xs font-semibold p-2 rounded"
          style={{
            backgroundColor: kpi.occupancyImpact <= 0.25 ? '#e3f4ee' : '#fbf1de',
            color: kpi.occupancyImpact <= 0.25 ? '#1d8e6e' : '#b8761b',
          }}
        >
          {kpi.occupancyImpact <= 0.25 ? '\u2713 Óptimo' : '\u26A0 Alto impacto inbound'}
        </div>
      </div>
    </div>
  );
}