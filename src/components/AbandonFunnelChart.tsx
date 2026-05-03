import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { AbandonFunnelData } from '../lib/kpi';
import { Tooltip as InfoTooltip } from './Tooltip';

type Props = {
  data: AbandonFunnelData;
};

// Stage definitions for tooltips
const stageDefinitions = {
  'Entrantes Brutas': {
    definition: 'Total de todas las llamadas entrantes (inbound) recibidas, sin ningún filtro aplicado',
    unit: 'Cantidad absoluta',
    benchmark: 'Base 100% para analizar el flujo',
  },
  'Abandon en Menú': {
    definition: 'Llamadas que el cliente abandonó dentro del menú IVR después de pasar más de 10 segundos navegando. Indica frustración con la interfaz automática.',
    unit: 'Cantidad absoluta',
    benchmark: 'Menor es mejor (objetivo: <5%)',
  },
  'Error de Marcación': {
    definition: 'Llamadas que el cliente abandonó muy rápido en el IVR (<10 segundos). Generalmente accidental o cambio de idea inmediato.',
    unit: 'Cantidad absoluta',
    benchmark: 'Menor es mejor (pequeño porcentaje es normal)',
  },
  'Abandon Corto': {
    definition: 'Llamadas que llegaron a la cola pero fueron abandonadas en los primeros 5 segundos. Clientes que no quisieron esperar.',
    unit: 'Cantidad absoluta',
    benchmark: 'Menor es mejor (indica baja paciencia inicial)',
  },
  'Llamadas Válidas': {
    definition: 'Llamadas que pasaron todos los filtros de calidad: salieron del IVR, llegaron a la cola y esperaron más de 5 segundos. Base para análisis de operacional.',
    formula: 'Entrantes - (Abandon Menú + Error + Abandon Corto)',
    unit: 'Cantidad absoluta',
    benchmark: 'Nueva base 100% para resto del embudo',
  },
  'Atendidas': {
    definition: 'Llamadas válidas que fueron contestadas y atendidas por un agente. Métrica de productividad.',
    unit: 'Cantidad absoluta',
    benchmark: 'Mayor es mejor (objetivo: >90% de válidas)',
  },
  'Abandonadas': {
    definition: 'Llamadas válidas que no fueron atendidas. El cliente abandonó después de esperar en cola/alerta más de 5 segundos.',
    unit: 'Cantidad absoluta',
    benchmark: 'Menor es mejor (objetivo: <10%)',
  },
};

export function AbandonFunnelChart({ data }: Props) {
  const {
    totalInbound,
    ivrMenuAbandons,
    ivrErrors,
    shortAbandons,
    validCalls,
    attendedCalls,
    realAbandonedCalls,
  } = data;

  // Create funnel stages as bar chart data
  const funnelData = [
    {
      stage: 'Entrantes Brutas',
      calls: totalInbound,
      fill: '#3b82f6',
    },
    {
      stage: 'Abandon en Menú',
      calls: ivrMenuAbandons,
      fill: '#d946ef',
    },
    {
      stage: 'Error de Marcación',
      calls: ivrErrors,
      fill: '#a78bfa',
    },
    {
      stage: 'Abandon Corto',
      calls: shortAbandons,
      fill: '#fbbf24',
    },
    {
      stage: 'Llamadas Válidas',
      calls: validCalls,
      fill: '#60a5fa',
    },
    {
      stage: 'Atendidas',
      calls: attendedCalls,
      fill: '#84bd00',
    },
    {
      stage: 'Abandonadas',
      calls: realAbandonedCalls,
      fill: '#ef4444',
    },
  ];

  // Calculate percentages relative to total inbound
  const funnelDataWithPercent = funnelData.map(item => ({
    ...item,
    percentage: totalInbound > 0 ? ((item.calls / totalInbound) * 100).toFixed(1) : '0',
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Embudo de Llamadas (Lógica Sincera)</h3>
        <p className="text-sm text-slate-400 mt-1">
          Flujo de llamadas desde entrada hasta resolución: Entrantes → Pérdidas/Válidas → Atendidas/Abandonadas
        </p>
      </div>

      {totalInbound === 0 ? (
        <div className="flex items-center justify-center h-80 text-slate-400">
          <p>Sin datos para analizar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bar Chart Funnel */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={190} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                  formatter={(value) => `${value} llamadas`}
                />
                <Bar dataKey="calls" radius={[0, 8, 8, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Etapa</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-700">Llamadas</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-700">% del Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funnelDataWithPercent.map((row, idx) => {
                  const stageDef = stageDefinitions[row.stage as keyof typeof stageDefinitions];
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: row.fill }}
                          />
                          <div className="flex items-center gap-1">
                            {row.stage}
                            {stageDef && (
                              <InfoTooltip
                                definition={stageDef.definition}
                                formula={stageDef.formula}
                                unit={stageDef.unit}
                                benchmark={stageDef.benchmark}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.calls.toLocaleString('es-ES')}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
