import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
};

type SortKey = keyof QueueStat;

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown size={13} className="text-gray-300 ml-1 inline" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-gray-100 ml-1 inline" />
    : <ChevronDown size={13} className="text-gray-100 ml-1 inline" />;
}

export function QueuesDetailTable({ stats }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = stats.filter(q => {
    const attended = q.count - (q.unattendedCount ?? 0);
    return attended > 0 || q.count > 0;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const cols: { label: string; key: SortKey; align: string }[] = [
    { label: 'Cola', key: 'queue', align: 'text-left' },
    { label: 'Llamadas', key: 'count', align: 'text-right' },
    { label: '%', key: 'percentage', align: 'text-right' },
    { label: 'Dur. Promedio', key: 'avgDurationSeconds', align: 'text-right' },
    { label: 'Espera Promedio', key: 'avgQueueTimeSeconds', align: 'text-right' },
    { label: 'Manejo Promedio', key: 'avgHandleTimeSeconds', align: 'text-right' },
    { label: 'Alerta Promedio', key: 'avgAlertTimeSeconds', align: 'text-right' },
    { label: 'Rebote %', key: 'bounceRate', align: 'text-right' },
    { label: 'Abandono Cola %', key: 'abandonQueueRate', align: 'text-right' },
    { label: 'Sin atender', key: 'unattendedCount', align: 'text-right' },
    { label: 'Atendidas / No Atendidas', key: 'completenessRate', align: 'text-center' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Detalle por cola</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bice-dark-blue" style={{ backgroundColor: '#003a70' }}>
              {cols.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-white cursor-pointer select-none whitespace-nowrap ${col.align} hover:text-gray-200 transition-colors`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((q, i) => (
              <tr key={q.queue} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: i < 10 ? `hsl(${200 + i * 15}, 80%, ${50 + i * 3}%)` : '#cbd5e1' }}
                    />
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{q.queue}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                  {q.count.toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-sky-50 text-sky-700 font-medium">
                    {q.percentage}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                  {q.avgDurationFormatted}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                  {formatDuration(q.avgQueueTimeSeconds)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                  {formatDuration(q.avgHandleTimeSeconds)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                  {formatDuration(q.avgAlertTimeSeconds)}
                </td>
                <td className="px-4 py-3 text-right">
                  {q.bounceRate > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 font-medium">
                      {q.bounceRate}%
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {q.abandonQueueRate > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 font-medium">
                      {q.abandonQueueRate}%
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {q.unattendedCount > 0 ? (
                    <span className="text-red-500 font-semibold">{q.unattendedCount.toLocaleString('es-CL')}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-end gap-0.5 h-8 min-w-24">
                      <div
                        className="flex-1 bg-emerald-500 rounded-t-sm transition-all"
                        style={{ height: `${Math.max((((q.count - q.unattendedCount) / q.count) * 100), 5)}%` }}
                        title={`Atendidas: ${(q.count - q.unattendedCount).toLocaleString('es-CL')} (${Math.round(((q.count - q.unattendedCount) / q.count) * 100)}%)`}
                      />
                      <div
                        className="flex-1 bg-red-500 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(((q.unattendedCount / q.count) * 100), 5)}%` }}
                        title={`No atendidas: ${q.unattendedCount.toLocaleString('es-CL')} (${Math.round((q.unattendedCount / q.count) * 100)}%)`}
                      />
                    </div>
                    <div className="text-xs text-slate-600 min-w-20">
                      <div>{Math.round(((q.count - q.unattendedCount) / q.count) * 100)}% ✓</div>
                      <div className="text-red-600">{Math.round((q.unattendedCount / q.count) * 100)}% ✗</div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
