import { useMemo, useState } from 'react';
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
import { SectionHeader } from './SectionHeader';
import { PhoneOutgoing } from 'lucide-react';

type Props = {
  records: CallRecord[];
  previousRecords?: CallRecord[];
};

export function OutboundDashboard({ records, previousRecords }: Props) {
  const [selectedQueue, setSelectedQueue] = useState<string | 'all'>('all');

  const filteredRecords = useMemo(() => {
    if (selectedQueue === 'all') {
      return records;
    }
    return records.filter(r => r.queue === selectedQueue);
  }, [records, selectedQueue]);

  const kpi = useMemo(() => calculateOutboundKPIs(filteredRecords), [filteredRecords]);

  const previousKpi = useMemo(
    () => previousRecords && previousRecords.length > 0 ? calculateOutboundKPIs(previousRecords) : null,
    [previousRecords],
  );

  const heatmapData = useMemo(
    () => generateContactabilityHeatmap(filteredRecords),
    [filteredRecords]
  );

  const executiveStats = useMemo(
    () => calculateExecutiveOutboundStats(filteredRecords),
    [filteredRecords]
  );

  const scatterData = useMemo(
    () => generateExecutiveScatterData(filteredRecords),
    [filteredRecords]
  );

  const uniqueQueues = useMemo(() => {
    const queues = new Set<string>();
    records
      .filter(r => r.call_direction?.toLowerCase() === 'saliente')
      .forEach(r => {
        if (r.queue && r.queue.trim() !== '') {
          queues.add(r.queue);
        }
      });
    return Array.from(queues).sort();
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        icon={PhoneOutgoing}
        title="Gestión Proactiva"
        description="Inteligencia de Llamadas Salientes: Contactabilidad, Esfuerzo de Recuperación e Impacto en Ocupación"
      />

      {/* Queue Filter */}
      {uniqueQueues.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
            Filtrar por Cola
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedQueue('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedQueue === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {uniqueQueues.map(queue => (
              <button
                key={queue}
                onClick={() => setSelectedQueue(queue)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedQueue === queue
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {queue}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <OutboundKPICards kpi={kpi} previousKpi={previousKpi} />

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
