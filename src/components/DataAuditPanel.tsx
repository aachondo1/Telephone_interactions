import { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { auditCallData, sampleDataValidation } from '../lib/dataAudit';
import type { AuditResult } from '../lib/dataAudit';

export function DataAuditPanel() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditCallData();
      setAuditResult(result);

      // Also get sample data
      const samples = await sampleDataValidation(10);
      setSampleData(samples);
    } catch (err: any) {
      setError(err.message || 'Error running audit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Auditoría de Datos Genesys</h2>
            <p className="text-sm text-slate-500 mt-1">Valida que los datos se calcularon correctamente según especificaciones técnicas</p>
          </div>
          <button
            onClick={handleRunAudit}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:bg-slate-400 flex items-center gap-2"
          >
            {loading && <Loader size={16} className="animate-spin" />}
            {loading ? 'Ejecutando...' : 'Ejecutar Auditoría'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {auditResult && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Total de Registros</p>
              <p className="text-2xl font-bold text-slate-800">{auditResult.totalRecords.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Casos con Múltiples Ejecutivos</p>
              <p className="text-2xl font-bold text-amber-600">{auditResult.uniqueExecutiveListCases}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Total Rebotes</p>
              <p className="text-2xl font-bold text-orange-600">{auditResult.bounceStats.totalBounces}</p>
              <p className="text-xs text-slate-400 mt-1">{auditResult.bounceStats.bounceRate}%</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Abandonos Totales</p>
              <p className="text-2xl font-bold text-red-600">{auditResult.abandonStats.total}</p>
              <p className="text-xs text-slate-400 mt-1">{Math.round((auditResult.abandonStats.total / auditResult.totalRecords) * 100)}%</p>
            </div>
          </div>

          {/* Abandon Type Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm">Clasificación de Abandonos</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{auditResult.abandonStats.queue}</p>
                <p className="text-xs text-slate-500 mt-1">En Cola</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{auditResult.abandonStats.alert}</p>
                <p className="text-xs text-slate-500 mt-1">En Alerta</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{auditResult.abandonStats.ivr}</p>
                <p className="text-xs text-slate-500 mt-1">En IVR</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-400">{auditResult.abandonStats.null}</p>
                <p className="text-xs text-slate-500 mt-1">Sin Clasificar</p>
              </div>
            </div>
          </div>

          {/* Hold Time Validation */}
          <div className={`rounded-2xl p-6 shadow-sm border ${
            auditResult.holdTimeStats.actualAgreement >= 95
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              {auditResult.holdTimeStats.actualAgreement >= 95 ? (
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${
                  auditResult.holdTimeStats.actualAgreement >= 95 ? 'text-green-800' : 'text-amber-800'
                }`}>
                  Validación de Hold Time
                </h3>
                <p className="text-sm mb-2">
                  <strong>Fórmula esperada:</strong> {auditResult.holdTimeStats.formula}
                </p>
                <p className={`text-sm font-semibold ${
                  auditResult.holdTimeStats.actualAgreement >= 95 ? 'text-green-700' : 'text-amber-700'
                }`}>
                  Concordancia: {auditResult.holdTimeStats.actualAgreement}% ({auditResult.holdTimeStats.validCases}/{auditResult.totalRecords})
                </p>
                {auditResult.holdTimeStats.discrepancies.length > 0 && (
                  <div className="mt-3 text-xs">
                    <p className="font-semibold mb-1">Discrepancias encontradas:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {auditResult.holdTimeStats.discrepancies.slice(0, 3).map(d => (
                        <div key={d.id} className="text-slate-600">
                          {d.id}: esperado {d.expected}s, actual {d.actual}s
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sample Data Validation */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm">Muestra de Registros (primeros 10)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-600">Fecha</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-600">Ejecutivo</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-600">Atendida</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-600">Hold Time ✓</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-600">Bounce ✓</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-600">Abandon ✓</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map(row => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3">{row.callDate}</td>
                      <td className="py-2 px-3 truncate">{row.executive}</td>
                      <td className="py-2 px-3 text-center">
                        {row.attended ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {row.verification.holdTimeIsCorrect ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {row.verification.bounceLogicCorrect ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {row.verification.abandonTypeCorrect ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
