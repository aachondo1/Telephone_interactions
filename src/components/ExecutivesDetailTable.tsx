import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { ExecutiveStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  stats: ExecutiveStat[];
};

type SortKey = keyof ExecutiveStat;

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown size={13} className="text-slate-300 ml-1 inline" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-emerald-500 ml-1 inline" />
    : <ChevronDown size={13} className="text-emerald-500 ml-1 inline" />;
}

export function ExecutivesDetailTable({ stats }: Props) {
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
    { label: 'Ejecutivo', key: 'executive', align: 'text-left' },
    { label: 'Llamadas', key: 'count', align: 'text-right' },
    { label: '%', key: 'percentage', align: 'text-right' },
    { label: 'Dur. Promedio', key: 'avgDurationSeconds', align: 'text-right' },
    { label: 'Manejo Promedio', key: 'avgHandleTimeSeconds', align: 'text-right' },
    { label: 'Espera Promedio', key: 'avgQueueTimeSeconds', align: 'text-right' },
    { label: 'Alerta Promedio', key: 'avgAlertTimeSeconds', align: 'text-right' },
    { label: 'Seg. Alerta', key: 'avgAlertSegments', align: 'text-right' },
    { label: 'Rebotes', key: 'bounceCount', align: 'text-right' },
    { label: 'Entrantes', key: 'inboundCount', align: 'text-right' },
    { label: 'Salientes', key: 'outboundCount', align: 'text-right' },
    { label: 'Sin atender', key: 'unattendedCount', align: 'text-right' },
    { label: 'Completitud', key: 'completenessRate', align: 'text-right' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Detalle por ejecutivo</h3>
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
            {sorted.map((e, i) => {
              const isSinAtender = e.executive === 'SIN ATENDER';
              return (
                <tr key={e.executive} className={`hover:bg-slate-50 transition-colors ${isSinAtender ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{
                          background: isSinAtender
                            ? '#94a3b8'
                            : `hsl(${160 + i * 12}, 65%, ${42 + (i % 3) * 6}%)`,
                        }}
                      >
                        {isSinAtender ? '—' : e.executive.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-medium truncate max-w-[140px] ${isSinAtender ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                        {e.executive}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {e.count.toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-medium">
                      {e.percentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {e.avgDurationFormatted}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {formatDuration(e.avgHandleTimeSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {formatDuration(e.avgQueueTimeSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {formatDuration(e.avgAlertTimeSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-medium">
                    {e.avgAlertSegments.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.bounceCount > 0 ? (
                      <span className="text-amber-600 font-medium">{e.bounceCount.toLocaleString('es-CL')}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sky-600 font-medium">{e.inboundCount.toLocaleString('es-CL')}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-slate-500">{e.outboundCount.toLocaleString('es-CL')}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.unattendedCount > 0 ? (
                      <span className="text-red-500 font-semibold">{e.unattendedCount.toLocaleString('es-CL')}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${e.completenessRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{e.completenessRate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
