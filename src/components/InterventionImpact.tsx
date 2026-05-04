import type { InterventionMetrics } from '../lib/kpi';
import { TrendingDown, AlertCircle } from 'lucide-react';

type Props = {
  data: InterventionMetrics[];
};

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

export function InterventionImpact({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Impacto de Alertas en Demanda de Personal
        </h3>
        <div className="text-slate-400 text-sm text-center py-12">Sin datos disponibles</div>
      </div>
    );
  }

  const totalCallsWithAlert = data.reduce((sum, m) => sum + m.callsWithAlert, 0);
  const totalCallsWithoutAlert = data.reduce((sum, m) => sum + m.callsWithoutAlert, 0);
  const totalCalls = totalCallsWithAlert + totalCallsWithoutAlert;
  const avgAlertTime = totalCalls > 0
    ? Math.round(data.reduce((sum, m) => sum + m.avgAlertTimeSeconds * m.callsWithAlert, 0) / totalCallsWithAlert)
    : 0;
  const totalErlangsByAlerts = Math.round(data.reduce((sum, m) => sum + m.erlangsByAlerts, 0) * 100) / 100;
  const totalErlangTotal = Math.round(data.reduce((sum, m) => sum + m.erlangTotal, 0) * 100) / 100;
  const impactPercentage = totalErlangTotal > 0
    ? Math.round((totalErlangsByAlerts / totalErlangTotal) * 1000) / 10
    : 0;

  const topQueues = [...data]
    .sort((a, b) => b.erlangsByAlerts - a.erlangsByAlerts)
    .slice(0, 3);

  const criticalQueues = data.filter(m => m.alertTimeAsPercentageOfAHT > 20)
    .sort((a, b) => b.alertTimeAsPercentageOfAHT - a.alertTimeAsPercentageOfAHT);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Impacto de Alertas en Demanda de Personal
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Análisis del tiempo de búsqueda (Alert Time) y su impacto en la demanda de Erlangs
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Llamadas con Alerta</p>
          <p className="text-2xl font-bold text-blue-900 mt-2">{totalCallsWithAlert.toLocaleString()}</p>
          <p className="text-[10px] text-blue-700 mt-1">
            {totalCalls > 0 ? Math.round((totalCallsWithAlert / totalCalls) * 100) : 0}% del total
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Tiempo Promedio Alerta</p>
          <p className="text-xl font-bold text-amber-900 mt-2">{formatSeconds(avgAlertTime)}</p>
          <p className="text-[10px] text-amber-700 mt-1">Por llamada</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Erlangs por Alertas</p>
          <p className="text-2xl font-bold text-red-900 mt-2">{totalErlangsByAlerts.toFixed(2)}</p>
          <p className="text-[10px] text-red-700 mt-1">Líneas adicionales</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Impacto en Demanda</p>
          <p className="text-2xl font-bold text-emerald-900 mt-2">{impactPercentage}%</p>
          <p className="text-[10px] text-emerald-700 mt-1">De la demanda total</p>
        </div>
      </div>

      {/* Tabla por Cola */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Desglose por Cola</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-slate-600 font-semibold">Cola</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Llamadas con Alerta</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Promedio Alerta</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">% Alerta/AHT</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Erlangs Manejo</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Erlangs Alerta</th>
                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Erlangs Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map(m => (
                <tr key={m.queueName} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 text-slate-700 font-medium">{m.queueName}</td>
                  <td className="text-right py-2 px-3 text-slate-600">{m.callsWithAlert.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-slate-600">{formatSeconds(m.avgAlertTimeSeconds)}</td>
                  <td className={`text-right py-2 px-3 font-semibold ${m.alertTimeAsPercentageOfAHT > 20 ? 'text-red-600' : 'text-slate-600'}`}>
                    {m.alertTimeAsPercentageOfAHT.toFixed(1)}%
                  </td>
                  <td className="text-right py-2 px-3 text-slate-600">{m.erlangsByHandle.toFixed(2)}</td>
                  <td className="text-right py-2 px-3 text-red-600 font-semibold">{m.erlangsByAlerts.toFixed(2)}</td>
                  <td className="text-right py-2 px-3 text-slate-700 font-bold">{m.erlangTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Colas por Impacto */}
      {topQueues.length > 0 && (
        <div className="mb-6 bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            Top Colas por Impacto de Alertas
          </h4>
          <div className="space-y-2">
            {topQueues.map((q, idx) => (
              <div key={q.queueName} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{q.queueName}</p>
                  <p className="text-xs text-slate-500">
                    {q.erlangsByAlerts.toFixed(2)} Erlangs adicionales ({Math.round((q.erlangsByAlerts / q.erlangTotal) * 100)}% de la demanda)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas Críticas */}
      {criticalQueues.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h4 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Colas con Alto Tiempo de Búsqueda
          </h4>
          <div className="space-y-3">
            {criticalQueues.map(q => (
              <div key={q.queueName} className="border-l-4 border-red-500 pl-3">
                <p className="text-sm font-semibold text-red-900">{q.queueName}</p>
                <p className="text-xs text-red-800 mt-1">
                  <strong>{q.alertTimeAsPercentageOfAHT.toFixed(1)}%</strong> del tiempo es búsqueda de agente
                </p>
                <p className="text-xs text-red-700 mt-1.5">
                  <strong>Sugerencias de optimización:</strong>
                  <ul className="mt-1 ml-4 space-y-1">
                    <li>• Implementar skill-based routing para dirigir llamadas a agentes disponibles más rápidamente</li>
                    <li>• Revisar cobertura de turnos durante horas pico</li>
                    <li>• Entrenar más agentes en esta especialidad</li>
                  </ul>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {criticalQueues.length === 0 && (
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <p className="text-sm text-emerald-900 font-semibold flex items-center gap-2">
            ✓ Búsqueda de Agentes Eficiente
          </p>
          <p className="text-xs text-emerald-700 mt-2">
            Todas las colas mantienen tiempo de búsqueda bajo (&lt;20% del AHT_p). Continúa monitoreando.
          </p>
        </div>
      )}
    </div>
  );
}
