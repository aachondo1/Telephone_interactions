import { useState } from 'react';
import { Phone, Filter } from 'lucide-react';
import type { TopCallerEntry } from '../lib/kpi';
import { calculateTopCallers } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

function Badge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
      <span className="opacity-70">×{count}</span>
    </span>
  );
}

const QUEUE_COLORS: Record<string, string> = {
  'BiceHipotecaria - SAC': 'bg-sky-50 text-sky-700',
  'BiceHipotecaria CallCenter': 'bg-sky-50 text-sky-700',
  'BiceHipotecaria - Mora Ordinaria': 'bg-amber-50 text-amber-700',
  'BiceHipotecaria - Cobranza Judicial': 'bg-red-50 text-red-700',
  'CN - SAC': 'bg-violet-50 text-violet-700',
  'CN - Mora Ordinaria': 'bg-orange-50 text-orange-700',
  'CN - Cobranza judicial': 'bg-rose-50 text-rose-700',
  'Saliente': 'bg-slate-100 text-slate-600',
};

function queueColor(queue: string): string {
  return QUEUE_COLORS[queue] ?? 'bg-slate-100 text-slate-600';
}

export function TopCallersTable({ records }: Props) {
  const [mobileOnly, setMobileOnly] = useState(false);
  const [inboundOnly, setInboundOnly] = useState(false);

  const data: TopCallerEntry[] = calculateTopCallers(records, 10, mobileOnly, inboundOnly);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-700">Top 10 números con más llamadas</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInboundOnly(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              inboundOnly
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Filter size={12} />
            Solo entrantes
          </button>
          <button
            type="button"
            onClick={() => setMobileOnly(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              mobileOnly
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Filter size={12} />
            Solo celulares
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-slate-400">
          No hay datos disponibles
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-medium">
                <th className="px-4 py-3 text-center w-10">#</th>
                <th className="px-4 py-3 text-left">Teléfono</th>
                <th className="px-4 py-3 text-center">Llamadas</th>
                <th className="px-4 py-3 text-center">Atendidas</th>
                <th className="px-4 py-3 text-center">No atendidas</th>
                <th className="px-4 py-3 text-left">Cola(s)</th>
                <th className="px-4 py-3 text-left">Atendido por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((caller, i) => (
                <tr key={caller.aniMasked + i} className="hover:bg-slate-50 transition-colors align-top">
                  {/* Rank */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-slate-100 text-slate-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'text-slate-400'
                    }`}>
                      {i + 1}
                    </span>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {caller.aniMasked || '—'}
                    </code>
                  </td>

                  {/* Total calls */}
                  <td className="px-4 py-3 text-center font-bold text-slate-800">
                    {caller.callCount}
                  </td>

                  {/* Attended */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-emerald-600 font-semibold">{caller.attendedCount}</span>
                    <span className="text-slate-300 text-xs ml-1">
                      ({Math.round((caller.attendedCount / caller.callCount) * 100)}%)
                    </span>
                  </td>

                  {/* Unattended */}
                  <td className="px-4 py-3 text-center">
                    {caller.unattendedCount > 0 ? (
                      <span className="text-red-500 font-semibold">{caller.unattendedCount}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Queues */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {caller.queues.slice(0, 3).map(q => (
                        <Badge
                          key={q.queue}
                          label={q.queue || 'Sin cola'}
                          count={q.count}
                          color={queueColor(q.queue)}
                        />
                      ))}
                      {caller.queues.length > 3 && (
                        <span className="text-xs text-slate-400">+{caller.queues.length - 3}</span>
                      )}
                    </div>
                  </td>

                  {/* Executives */}
                  <td className="px-4 py-3">
                    {caller.executives.length === 0 ? (
                      <span className="text-xs text-slate-300">Sin atender</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {caller.executives.slice(0, 2).map(e => (
                          <Badge
                            key={e.executive}
                            label={e.executive}
                            count={e.count}
                            color="bg-emerald-50 text-emerald-700"
                          />
                        ))}
                        {caller.executives.length > 2 && (
                          <span className="text-xs text-slate-400">+{caller.executives.length - 2}</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-6 py-3 border-t border-slate-50 text-xs text-slate-400">
        Los números están parcialmente anonimizados (últimos 4 dígitos visibles).
        {inboundOnly && ' Filtrando solo llamadas entrantes.'}
        {mobileOnly && ' Filtrando solo números de 11 dígitos (celulares).'}
      </div>
    </div>
  );
}
