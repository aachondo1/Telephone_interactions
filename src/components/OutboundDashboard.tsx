import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { CallRecord } from '../lib/supabase';
import { calculateOutboundKPIs, generateContactabilityHeatmap } from '../lib/outboundKPI';
import { OutboundKPICards } from './OutboundKPICards';
import { ContactabilityHeatmap } from './ContactabilityHeatmap';

type Props = {
  records: CallRecord[];
};

export function OutboundDashboard({ records }: Props) {
  const [selectedQueue, setSelectedQueue] = useState<string | 'all'>('all');

  const filteredRecords = useMemo(() => {
    if (selectedQueue === 'all') {
      return records;
    }
    return records.filter(r => r.queue === selectedQueue);
  }, [records, selectedQueue]);

  const kpi = useMemo(() => calculateOutboundKPIs(filteredRecords), [filteredRecords]);

  const heatmapData = useMemo(
    () => generateContactabilityHeatmap(filteredRecords),
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
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={28} className="text-bice-navy" />
          <h1 className="text-3xl font-bold text-bice-navy">Gestión Proactiva</h1>
        </div>
        <p className="text-slate-600 text-sm">
          Inteligencia de Llamadas Salientes: Contactabilidad, Esfuerzo de Recuperación e Impacto en Ocupación
        </p>
      </div>

      {/* Queue Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
          Filtrar por Cola
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedQueue('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedQueue === 'all'
                ? 'bg-bice-navy text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas las Colas
          </button>
          {uniqueQueues.map(queue => (
            <button
              key={queue}
              onClick={() => setSelectedQueue(queue)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedQueue === queue
                  ? 'bg-bice-navy text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {queue}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <OutboundKPICards kpi={kpi} />

      {/* Heatmap Section */}
      <div>
        <h2 className="text-lg font-bold text-bice-navy mb-4">
          Heatmap de Contactabilidad por Hora
        </h2>
        <ContactabilityHeatmap data={heatmapData} />
      </div>
    </div>
  );
}
