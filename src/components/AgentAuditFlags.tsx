import { AlertTriangle, AlertCircle } from 'lucide-react';
import type { AgentAuditFlag } from '../lib/kpi';

type Props = {
  flags: AgentAuditFlag[];
};

export function AgentAuditFlags({ flags }: Props) {
  if (flags.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        No se detectaron problemas de conectividad
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flags.map((flag, idx) => (
        <div
          key={`${flag.agentId}-${idx}`}
          className={`flex items-start gap-3 p-3 rounded-lg border ${
            flag.severity === 'critical'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          {flag.severity === 'critical' ? (
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-slate-900">
              {flag.agentName}
              {flag.excessMinutes && ` (+${flag.excessMinutes} min)`}
            </div>
            <div className="text-xs text-slate-600 mt-1">{flag.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
