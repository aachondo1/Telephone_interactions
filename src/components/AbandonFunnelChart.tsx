import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { AbandonFunnelData } from '../lib/kpi';

type Props = {
  data: AbandonFunnelData;
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
                {funnelDataWithPercent.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: row.fill }}
                        />
                        {row.stage}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{row.calls.toLocaleString('es-ES')}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
