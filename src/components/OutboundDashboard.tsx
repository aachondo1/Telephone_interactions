import { useMemo } from 'react';
import type { CallRecord } from '../lib/supabase';
import {
  calculateOutboundKPIs,
  generateContactabilityHeatmap,
  calculateExecutiveOutboundStats,
  generateExecutiveScatterData,
} from '../lib/kpi';
import { OutboundKPICards } from './OutboundKPICards';
import { ContactabilityHeatmap } from './ContactabilityHeatmap';
import { OutboundExecutiveScatter } from './OutboundExecutiveScatter';
import { OutboundExecutiveRankings } from './OutboundExecutiveRankings';

type Props = {
  records: CallRecord[];
};

export function OutboundDashboard({ records }: Props) {
  const kpi = useMemo(() => calculateOutboundKPIs(records), [records]);

  const heatmapData = useMemo(
    () => generateContactabilityHeatmap(records),
    [records]
  );

  const executiveStats = useMemo(
    () => calculateExecutiveOutboundStats(records),
    [records]
  );

  const scatterData = useMemo(
    () => generateExecutiveScatterData(records),
    [records]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestión Proactiva</h1>
        <p className="text-sm text-slate-600">
          Inteligencia de Llamadas Salientes: Contactabilidad, Esfuerzo de Recuperación e Impacto en Ocupación
        </p>
      </div>

      {/* KPI Cards */}
      <OutboundKPICards kpi={kpi} />

      {/* Debug Info - Breakdown de filtros */}
      {kpi.debugStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Desglose de Llamadas Salientes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-blue-600 font-medium">Total Salientes</p>
              <p className="text-xl font-bold text-blue-900">
                {kpi.debugStats.totalSalientes}
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Con Ejecutivo</p>
              <p className="text-xl font-bold text-blue-900">
                {kpi.debugStats.withValidExecutive}
              </p>
              <p className="text-xs text-blue-500">
                {(kpi.debugStats.withValidExecutive / kpi.debugStats.totalSalientes * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Con Conversación</p>
              <p className="text-xl font-bold text-blue-900">
                {kpi.debugStats.withConversation}
              </p>
              <p className="text-xs text-blue-500">
                {(kpi.debugStats.withConversation / kpi.debugStats.totalSalientes * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Desconexión 'Sistema'</p>
              <p className="text-xl font-bold text-blue-900">
                {kpi.debugStats.withSistemaExit}
              </p>
              <p className="text-xs text-blue-500">
                {(kpi.debugStats.withSistemaExit / kpi.debugStats.totalSalientes * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Section */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Heatmap de Contactabilidad por Hora
        </h2>
        <ContactabilityHeatmap data={heatmapData} />
      </div>

      {/* Executive Analysis Section */}
      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Análisis de Ejecutivos
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Identificar patrones de productividad: cerradores efectivos vs. marcadores compulsivos
        </p>

        {/* Scatter Plot */}
        <div className="mb-8">
          <OutboundExecutiveScatter data={scatterData} />
        </div>

        {/* Rankings Table */}
        <OutboundExecutiveRankings stats={executiveStats} />
      </div>
    </div>
  );
}
