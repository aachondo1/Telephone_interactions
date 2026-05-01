import { Sankey, Sink, Source, Link, Node, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { AbandonFunnelData } from '../lib/kpi';
import { Tooltip as UITooltip } from './Tooltip';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

type Props = {
  data: AbandonFunnelData;
};

function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}s`;
}

export function AbandonFunnelChart({ data }: Props) {
  const {
    totalInbound,
    ivrFugues,
    shortAbandons,
    validCalls,
    attendedCalls,
    realAbandonedCalls,
    asaPerceptualSeconds,
    ataPerceptualSeconds,
    avgIvrSeconds,
    integrityCheck,
  } = data;

  // Calculate percentages
  const validCallsPercent = totalInbound > 0 ? Math.round((validCalls / totalInbound) * 100) : 0;
  const attendedPercent = validCalls > 0 ? Math.round((attendedCalls / validCalls) * 100) : 0;
  const abandonedPercent = validCalls > 0 ? Math.round((realAbandonedCalls / validCalls) * 100) : 0;

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
    <div className="space-y-6">
      {/* Sankey Diagram */}
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
          <div className="h-96 mb-8">
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

      {/* Level 1: Raw Inbound */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h4 className="font-bold text-slate-800 mb-4">Nivel 1: Entrantes Brutas (100%)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total Inbound</p>
            <p className="text-3xl font-bold text-blue-600">{totalInbound}</p>
            <p className="text-xs text-slate-500 mt-2">Todas las llamadas entrantes</p>
          </div>

          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Fuga IVR</p>
              <UITooltip
                definition="Llamadas que NO llegaron a cola (menú/sistema)"
                formula="Count(flow_exit === false)"
                unit="Llamadas"
                benchmark="Refleja diseño de IVR y satisfacción de autoservicio"
              />
            </div>
            <p className="text-2xl font-bold text-purple-600">{ivrFugues}</p>
            <p className="text-xs text-slate-500 mt-2">
              {totalInbound > 0 ? Math.round((ivrFugues / totalInbound) * 100) : 0}% de entrantes
            </p>
            {avgIvrSeconds > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                ⏱️ Promedio IVR: {formatDuration(avgIvrSeconds)}
              </p>
            )}
          </div>

          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Abandono Corto</p>
              <UITooltip
                definition="Abandonos en cola en menos de 5 segundos"
                formula="Count(queue_time < 5s AND attended === false)"
                unit="Llamadas"
                benchmark="Ruido de datos. No refleja decisión real del cliente"
              />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{shortAbandons}</p>
            <p className="text-xs text-slate-500 mt-2">
              {totalInbound > 0 ? Math.round((shortAbandons / totalInbound) * 100) : 0}% de entrantes
            </p>
          </div>
        </div>
      </div>

      {/* Level 2: Valid Calls (New 100% Reference) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <h4 className="font-bold text-slate-800">
            Nivel 2: Llamadas Válidas ({validCallsPercent}%)
          </h4>
          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
            NUEVA BASE (100%)
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Llamadas que llegaron a cola y NO son ruido de datos (abandonos cortos). Esta es la base
          real para calcular las métricas operacionales.
        </p>
        <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Válidas</p>
          <p className="text-4xl font-bold text-blue-600">{validCalls}</p>
          <p className="text-sm text-slate-500 mt-2">
            = {totalInbound} - {ivrFugues} - {shortAbandons}
          </p>
        </div>
      </div>

      {/* Level 3: Final Distribution */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h4 className="font-bold text-slate-800 mb-4">Nivel 3: Distribución Final (100% de Válidas)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attended */}
          <div className="bg-green-50 rounded-xl p-6 border-l-4 border-green-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Atendidas</p>
                <p className="text-4xl font-bold text-green-600">{attendedCalls}</p>
                <p className="text-sm text-slate-500 mt-2">{attendedPercent}% de válidas</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600" />
              </div>
            </div>

            {asaPerceptualSeconds > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">ASA Perceptual</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                      {formatDuration(asaPerceptualSeconds)}
                    </p>
                  </div>
                  <UITooltip
                    definition="Promedio de espera que vive el cliente (cola + alerta)"
                    formula="sum(queue_time + alert_time) / count(attended)"
                    unit="Segundos"
                    benchmark="Métrica de experiencia real. Refleja disponibilidad del equipo"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Tiempo promedio de espera (cola + alerta)
                </p>
              </div>
            )}
          </div>

          {/* Abandoned */}
          <div className="bg-red-50 rounded-xl p-6 border-l-4 border-red-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Abandonadas</p>
                <p className="text-4xl font-bold text-red-600">{realAbandonedCalls}</p>
                <p className="text-sm text-slate-500 mt-2">{abandonedPercent}% de válidas</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown size={24} className="text-red-600" />
              </div>
            </div>

            {ataPerceptualSeconds > 0 && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">ATA Perceptual</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">
                      {formatDuration(ataPerceptualSeconds)}
                    </p>
                  </div>
                  <UITooltip
                    definition="Promedio de espera antes del abandono"
                    formula="sum(queue_time + alert_time) / count(abandoned)"
                    unit="Segundos"
                    benchmark="Clientes esperan X segundos antes de colgar. Indica punto de frustración"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Tiempo promedio antes de abandonar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Integrity Check */}
      <div className={`rounded-2xl shadow-sm border p-6 ${integrityCheck.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${integrityCheck.isValid ? 'bg-green-100' : 'bg-red-100'}`}>
            <AlertCircle size={20} className={integrityCheck.isValid ? 'text-green-600' : 'text-red-600'} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800 mb-2">Verificación de Coherencia</p>
            <p className="text-xs text-slate-600 mb-3">
              Validación: IVR + Cortos + Atendidas + Abandonadas = Total Entrantes
            </p>
            <div className="bg-white bg-opacity-60 rounded-lg p-3">
              <p className="text-xs font-mono text-slate-700">
                {ivrFugues} + {shortAbandons} + {attendedCalls} + {realAbandonedCalls} ={' '}
                <span className="font-bold">{integrityCheck.actual}</span>
              </p>
              <p className="text-xs font-mono text-slate-600 mt-1">
                Esperado: {integrityCheck.expected}
              </p>
            </div>
            <p className={`text-xs font-medium mt-2 ${integrityCheck.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {integrityCheck.isValid ? '✓ Los datos son coherentes' : '✗ Error en integridad de datos'}
            </p>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6">
        <h5 className="font-bold text-slate-800 mb-3">📊 Por qué esta estructura es "sincera"</h5>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>
              <strong>Fuga IVR + Abandono Corto</strong> se restan primero porque son "ruido de datos" que no reflejan capacidad operacional
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>
              <strong>Llamadas Válidas</strong> son el nuevo 100% de referencia para calcular tasa de abandono real
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>
              <strong>ASA + ATA Perceptual</strong> muestran por qué la gente se va (espera en cola + espera en alerta)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>
              <strong>Integridad</strong> confirma que no hay fugas de datos en el cálculo
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
