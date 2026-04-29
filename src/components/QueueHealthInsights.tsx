import { AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react';
import type { QueueHealthInsight } from '../lib/kpi';

type Props = {
  insights: QueueHealthInsight[];
};

export function QueueHealthInsights({ insights }: Props) {
  const critical = insights.filter(i => i.severity === 'critical');
  const warnings = insights.filter(i => i.severity === 'warning');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Cuadro de Toma de Decisiones</h3>
        <p className="text-sm text-slate-400 mt-1">
          Análisis automático y recomendaciones de acciones
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Todas las métricas en objetivo</p>
            <p className="text-sm text-emerald-700 mt-1">
              Las colas están funcionando correctamente sin necesidad de intervención inmediata.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {critical.length > 0 && (
            <div>
              <p className="text-xs uppercase font-bold text-red-700 mb-3 tracking-wide">
                🔴 Alertas Críticas ({critical.length})
              </p>
              <div className="space-y-3">
                {critical.map((insight, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
                  >
                    <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-red-900">{insight.message}</p>
                      <div className="text-xs text-red-700 mt-2 space-y-1">
                        <p>
                          <strong>Métrica:</strong> {insight.metric}
                        </p>
                        <p>
                          <strong>Valor actual:</strong> {insight.value}
                        </p>
                        <p>
                          <strong>Umbral:</strong> {insight.threshold}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div>
              <p className="text-xs uppercase font-bold text-amber-700 mb-3 tracking-wide">
                ⚠️ Advertencias ({warnings.length})
              </p>
              <div className="space-y-3">
                {warnings.map((insight, idx) => (
                  <div
                    key={idx}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
                  >
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-amber-900">{insight.message}</p>
                      <div className="text-xs text-amber-700 mt-2 space-y-1">
                        <p>
                          <strong>Métrica:</strong> {insight.metric}
                        </p>
                        <p>
                          <strong>Valor actual:</strong> {insight.value}
                        </p>
                        <p>
                          <strong>Umbral:</strong> {insight.threshold}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
