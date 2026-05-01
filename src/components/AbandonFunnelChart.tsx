import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { AbandonFunnelData } from '../lib/kpi';

type Props = {
  data: AbandonFunnelData;
};

export function AbandonFunnelChart({ data }: Props) {
  const { totalInbound, ivrFugues, shortAbandons, queueFugues, bounceAbandons, attendedCalls } = data;

  // Build funnel data: each stage shows cumulative loss
  // Gradient colors: BICE blue (#326295) transitioning to lighter tones, ending in BICE green (#84BD00)
  const chartData = [
    {
      stage: 'Entrantes',
      count: totalInbound,
      percentage: 100,
      color: '#326295', // bice-blue
    },
    {
      stage: 'Después IVR',
      count: totalInbound - ivrFugues,
      percentage: totalInbound > 0 ? Math.round(((totalInbound - ivrFugues) / totalInbound) * 100) : 0,
      color: '#4a7ab0', // bice-blue lighter
    },
    {
      stage: 'Después Abandono Corto',
      count: totalInbound - ivrFugues - shortAbandons,
      percentage: totalInbound > 0 ? Math.round(((totalInbound - ivrFugues - shortAbandons) / totalInbound) * 100) : 0,
      color: '#6b98c7', // bice-blue lighter
    },
    {
      stage: 'Después Cola',
      count: totalInbound - ivrFugues - shortAbandons - queueFugues,
      percentage: totalInbound > 0 ? Math.round(((totalInbound - ivrFugues - shortAbandons - queueFugues) / totalInbound) * 100) : 0,
      color: '#8db3d9', // bice-blue lighter
    },
    {
      stage: 'Después Rebote',
      count: totalInbound - ivrFugues - shortAbandons - queueFugues - bounceAbandons,
      percentage: totalInbound > 0 ? Math.round(((totalInbound - ivrFugues - shortAbandons - queueFugues - bounceAbandons) / totalInbound) * 100) : 0,
      color: '#b0cce8', // bice-blue very light
    },
    {
      stage: 'Atendidas',
      count: attendedCalls,
      percentage: totalInbound > 0 ? Math.round((attendedCalls / totalInbound) * 100) : 0,
      color: '#84BD00', // bice-green
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Embudo Completo de Llamadas</h3>
        <p className="text-sm text-slate-400 mt-1">
          Flujo desde 100% de llamadas entrantes hasta atendidas
        </p>
      </div>

      {totalInbound === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <p>Sin datos para analizar</p>
        </div>
      ) : (
        <>
          <div className="h-80 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="stage"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value} llamadas`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: '#65646A',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed breakdown grid */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Llamadas Entrantes</p>
                <p className="text-3xl font-bold text-blue-600">{totalInbound}</p>
                <p className="text-xs text-slate-500 mt-2">100% (Base del Embudo)</p>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Atendidas</p>
                <p className="text-3xl font-bold text-green-600">{attendedCalls}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {totalInbound > 0 ? Math.round((attendedCalls / totalInbound) * 100) : 0}% de entrantes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Fuga IVR</p>
                <p className="text-2xl font-bold text-purple-600">{ivrFugues}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {totalInbound > 0 ? Math.round((ivrFugues / totalInbound) * 100) : 0}% de entrantes
                </p>
                <p className="text-xs text-slate-400 mt-1">Menú/Sistema</p>
              </div>

              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Abandono Corto</p>
                <p className="text-2xl font-bold text-yellow-600">{shortAbandons}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {totalInbound > 0 ? Math.round((shortAbandons / totalInbound) * 100) : 0}% de entrantes
                </p>
                <p className="text-xs text-slate-400 mt-1">&lt;5 segundos</p>
              </div>

              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Fuga Cola</p>
                <p className="text-2xl font-bold text-orange-600">{queueFugues}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {totalInbound > 0 ? Math.round((queueFugues / totalInbound) * 100) : 0}% de entrantes
                </p>
                <p className="text-xs text-slate-400 mt-1">Espera excesiva</p>
              </div>

              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Abandono tras Rebote</p>
                <p className="text-2xl font-bold text-red-600">{bounceAbandons}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {totalInbound > 0 ? Math.round((bounceAbandons / totalInbound) * 100) : 0}% de entrantes
                </p>
                <p className="text-xs text-slate-400 mt-1">Tras devolución de agente</p>
              </div>
            </div>

            {/* Verification row */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 font-medium mb-2">Verificación de Coherencia:</p>
              <p className="text-xs text-slate-500">
                {ivrFugues} + {shortAbandons} + {queueFugues} + {bounceAbandons} + {attendedCalls} = {ivrFugues + shortAbandons + queueFugues + bounceAbandons + attendedCalls}
                {ivrFugues + shortAbandons + queueFugues + bounceAbandons + attendedCalls === totalInbound ? (
                  <span className="text-green-600 font-medium"> ✓ Correcto</span>
                ) : (
                  <span className="text-red-600 font-medium"> ✗ Error</span>
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
