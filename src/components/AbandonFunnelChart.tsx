import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AbandonFunnelData } from '../lib/kpi';

type Props = {
  data: AbandonFunnelData;
};

export function AbandonFunnelChart({ data }: Props) {
  const chartData = [
    {
      name: 'Fugas',
      'IVR (Menú)': data.ivrFugues,
      'Cola (Espera)': data.queueFugues,
      'Alerta (Agentes)': data.alertFugues,
    },
  ];

  const total = data.totalAbandons;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Análisis de Fugas en el Embudo</h3>
        <p className="text-sm text-slate-400 mt-1">
          Identificar dónde se pierden los clientes en el proceso
        </p>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <p>Sin abandonos para analizar</p>
        </div>
      ) : (
        <>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value} clientes`}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="IVR (Menú)" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Cola (Espera)" stackId="a" fill="#f97316" />
                <Bar dataKey="Alerta (Agentes)" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Fuga en IVR</p>
              <p className="text-2xl font-bold text-purple-600">{data.ivrFugues}</p>
              <p className="text-xs text-slate-500 mt-2">
                {total > 0 ? Math.round((data.ivrFugues / total) * 100) : 0}% del total
              </p>
              <p className="text-xs text-slate-400 mt-2">Menú confuso o no intuitivo</p>
            </div>

            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Fuga en Cola</p>
              <p className="text-2xl font-bold text-orange-600">{data.queueFugues}</p>
              <p className="text-xs text-slate-500 mt-2">
                {total > 0 ? Math.round((data.queueFugues / total) * 100) : 0}% del total
              </p>
              <p className="text-xs text-slate-400 mt-2">Falta de personal, espera excesiva</p>
            </div>

            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Fuga en Alerta</p>
              <p className="text-2xl font-bold text-red-600">{data.alertFugues}</p>
              <p className="text-xs text-slate-500 mt-2">
                {total > 0 ? Math.round((data.alertFugues / total) * 100) : 0}% del total
              </p>
              <p className="text-xs text-slate-400 mt-2">Agentes no disponibles</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
