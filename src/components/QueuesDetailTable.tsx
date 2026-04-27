import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { QueueStat } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
};

type SortKey = keyof QueueStat;

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown size={13} className="text-slate-300 ml-1 inline" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-sky-500 ml-1 inline" />
    : <ChevronDown size={13} className="text-sky-500 ml-1 inline" />;
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

  const sorted = [...stats].sort((a, b) => {
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
    { label: 'Dur. Total', key: 'totalDurationSeconds', align: 'text-right' },
    { label: 'Sin atender', key: 'unattendedCount', align: 'text-right' },
    { label: 'Completitud', key: 'completenessRate', align: 'text-right' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Detalle por cola</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              {cols.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-slate-500 cursor-pointer select-none whitespace-nowrap ${col.align} hover:text-slate-700 transition-colors`}
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
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
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
                  {q.totalDurationFormatted}
                </td>
                <td className="px-4 py-3 text-right">
                  {q.unattendedCount > 0 ? (
                    <span className="text-red-500 font-semibold">{q.unattendedCount.toLocaleString('es-CL')}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${q.completenessRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{q.completenessRate}%</span>
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
