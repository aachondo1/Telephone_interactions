import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuditTab() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('import_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        setAuditLogs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading audit logs');
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <p className="text-slate-500">Cargando registros de auditoría...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4">
        <p className="text-red-700 font-semibold">Error al cargar auditoría</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 font-semibold">Sin registros de auditoría</p>
        <p className="text-sm text-slate-400 mt-1">Aún no se han detectado anomalías en las importaciones</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {auditLogs.map(log => (
        <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-slate-800">Importación {log.upload_id?.substring(0, 8)}...</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(log.created_at).toLocaleDateString('es-CL', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </p>
            </div>
            <div className="flex gap-2">
              {log.critical_count > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  🔴 {log.critical_count} críticas
                </span>
              )}
              {log.warning_count > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  ⚠️ {log.warning_count} advertencias
                </span>
              )}
            </div>
          </div>

          {log.total_anomalies > 0 && (
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">Total anomalías: {log.total_anomalies}</p>
              {log.anomaly_breakdown && (
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-500">
                  {Object.entries(log.anomaly_breakdown as Record<string, number>).map(([key, count]) => (
                    <li key={key}>{key}: {count}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
