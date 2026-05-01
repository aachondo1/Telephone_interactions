import { Sankey, Link, Node, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { AbandonFunnelData } from '../lib/kpi';

type Props = {
  data: AbandonFunnelData;
};

export function AbandonFunnelChart({ data }: Props) {
  const {
    totalInbound,
    ivrFugues,
    shortAbandons,
    validCalls,
    attendedCalls,
    realAbandonedCalls,
  } = data;

  // Sankey diagram nodes and links
  const nodes = [
    { name: 'Entrantes Brutas' },
    { name: 'Fuga IVR' },
    { name: 'Abandono Corto' },
    { name: 'Llamadas Válidas' },
    { name: 'Atendidas' },
    { name: 'Abandonadas' },
  ];

  const links = [
    { source: 0, target: 1, value: ivrFugues, stroke: '#a78bfa' },
    { source: 0, target: 2, value: shortAbandons, stroke: '#fbbf24' },
    { source: 0, target: 3, value: validCalls, stroke: '#60a5fa' },
    { source: 3, target: 4, value: attendedCalls, stroke: '#84bd00' },
    { source: 3, target: 5, value: realAbandonedCalls, stroke: '#ef4444' },
  ];

  const sankey = {
    nodes,
    links,
  };

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
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankey}
              node={{ fill: '#8884d8', fillOpacity: 1 }}
              link={{ stroke: '#d1d5db', strokeOpacity: 0.5 }}
              nodePadding={150}
              margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
            >
              <Node
                shape="rect"
                fill="#ffffff"
                stroke="#e2e8f0"
                fillOpacity={1}
              />
              <Link stroke="#d1d5db" strokeOpacity={0.3} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '12px',
                }}
                formatter={(value) => `${value} llamadas`}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
