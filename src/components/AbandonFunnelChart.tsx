import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AbandonFunnelData } from '../lib/kpi';
import { Tooltip as InfoTooltip } from './Tooltip';

type Props = {
  data: AbandonFunnelData;
};

// Stage definitions for tooltips
const stageDefinitions = {
  'Inbound': {
    definition: 'Total de todas las llamadas entrantes (inbound) recibidas, sin ningún filtro aplicado',
    unit: 'Cantidad absoluta',
    benchmark: 'Base 100% para analizar el flujo',
  },
  'Llegaron a Cola': {
    definition: 'Llamadas que salieron del menú IVR y llegaron a la cola (queue_time > 0). Inbound que pasaron de la IVR a espera de agente.',
    unit: 'Cantidad absoluta',
    benchmark: 'Mayor es mejor - indica que IVR no es bloqueador',
  },
  'Asignadas a Ejecutivo': {
    definition: 'Llamadas asignadas a un agente (alert_time > 0). Agente fue alertado aunque no haya contestado. Visualiza dónde se pierden llamadas sin ser atendidas.',
    unit: 'Cantidad absoluta',
    benchmark: 'Muestra intentos de conexión con agente',
  },
  'Conversación Real': {
    definition: 'Llamadas con conversación efectiva (conversation_total_seconds > 0). Contacto real con agente. Métrica de productividad.',
    unit: 'Cantidad absoluta',
    benchmark: 'Mayor es mejor (objetivo: maximizar)',
  },
};

export function AbandonFunnelChart({ data }: Props) {
  const {
    totalInbound,
    reachedQueue,
    assigned,
    conversationReal,
    abandonInQueue,
    abandonInAlert,
  } = data;

  // Create new 4-level funnel structure
  // Level 1: Inbound (100%)
  // Level 2: Reached Queue
  // Level 3: Assigned to Agent
  // Level 4: Conversation Real
  const funnelData = [
    {
      stage: 'Inbound',
      calls: totalInbound,
      fill: '#3b82f6',
    },
    {
      stage: 'Llegaron a Cola',
      calls: reachedQueue,
      fill: '#60a5fa',
    },
    {
      stage: 'Asignadas a Ejecutivo',
      calls: assigned,
      fill: '#fbbf24',
    },
    {
      stage: 'Conversación Real',
      calls: conversationReal,
      fill: '#84bd00',
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
        <h3 className="text-lg font-bold text-slate-800">Embudo de Llamadas (4 Niveles Operativos)</h3>
        <p className="text-sm text-slate-400 mt-1">
          Flujo de llamadas: Inbound → Cola → Asignadas → Conversación Real. Abandons desglosados por estado.
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

          {/* Funnel Breakdown Table */}
          <div className="overflow-x-auto">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Flujo del Embudo</h4>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Nivel</th>
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

          {/* Abandonment Breakdown */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Desglose de Abandonos</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs text-slate-600 mb-1">Estado 1: Abandono en Cola</p>
                <p className="text-2xl font-bold text-red-600">{abandonInQueue.toLocaleString('es-ES')}</p>
                <p className="text-xs text-slate-500 mt-1">Nunca asignadas a agente</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-xs text-slate-600 mb-1">Estado 2: Abandono en Escritorio</p>
                <p className="text-2xl font-bold text-amber-600">{abandonInAlert.toLocaleString('es-ES')}</p>
                <p className="text-xs text-slate-500 mt-1">Asignadas pero no contestadas</p>
              </div>
            </div>
            <div className="mt-3 bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-700 mb-1">Total Abandonos: <span className="text-lg font-bold">{(abandonInQueue + abandonInAlert).toLocaleString('es-ES')}</span></p>
              <p className="text-xs text-slate-600">
                Tasa de abandono: {reachedQueue > 0 ? (((abandonInQueue + abandonInAlert) / reachedQueue) * 100).toFixed(1) : 0}% de llamadas que llegaron a cola
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
