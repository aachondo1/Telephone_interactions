import { CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { DataQualityReport } from '../lib/kpi';

export function DataQualityBanner({ quality }: { quality: DataQualityReport | null }) {
  if (!quality) return null;

  const hasCriticalIssues = quality.criticalIssues.handleTimeCorrupted > 0 || quality.criticalIssues.technicalCutsAsAttended > 0;
  const hasOutboundFiltered = quality.outboundCalls > 0;
  const isClean = !hasCriticalIssues && !hasOutboundFiltered;

  if (isClean) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center gap-3">
        <CheckCircle size={20} className="text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Integridad de datos verificada</p>
          <p className="text-sm text-emerald-700 mt-0.5">Se analizaron {quality.totalRecords.toLocaleString('es-CL')} registros sin anomalías detectadas</p>
        </div>
      </div>
    );
  }

  if (hasCriticalIssues) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Anomalías detectadas en datos</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {quality.handleTimeCorrupted} registros con handle_time corrupto, {quality.technicalCuts} cortes técnicos detectados.
              Ver pestaña <strong>Auditoría</strong> para detalles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasOutboundFiltered) {
    return (
      <div className="bg-sky-50 border border-sky-200 rounded-2xl px-6 py-4 flex items-center gap-3">
        <Info size={20} className="text-sky-600" />
        <div>
          <p className="font-semibold text-sky-900">Llamadas salientes filtradas</p>
          <p className="text-sm text-sky-700 mt-0.5">Se excluyeron {quality.outboundCalls.toLocaleString('es-CL')} llamadas salientes de los cálculos de KPI (Service Level solo incluye entrantes)</p>
        </div>
      </div>
    );
  }

  return null;
}

export function DataQualityIndicator({ quality }: { quality: DataQualityReport | null }) {
  if (!quality) return null;

  const hasCritical = quality.criticalIssues.handleTimeCorrupted > 0 || quality.criticalIssues.technicalCutsAsAttended > 0;
  const hasWarning = quality.handleTimeCorrupted > 0 || quality.technicalCuts > 0;

  if (hasCritical) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <AlertCircle size={14} />
        Anomalías detectadas
      </span>
    );
  }

  if (hasWarning) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <AlertTriangle size={14} />
        Advertencias
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <CheckCircle size={14} />
      Datos limpios
    </span>
  );
}
