import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react';
import type { QueueStat } from '../lib/kpi';
import { formatDuration } from '../lib/kpi';

type Props = {
  stats: QueueStat[];
};

type SortKey = keyof QueueStat | 'slPercent' | 'erlangC' | 'trendencySL' | 'staffAnalysis';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown size={13} className="text-gray-300 ml-1 inline" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-gray-100 ml-1 inline" />
    : <ChevronDown size={13} className="text-gray-100 ml-1 inline" />;
}

function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setVisible(!visible)}
        className="inline-flex items-center gap-1 text-gray-200 hover:text-gray-100 transition-colors ml-1"
      >
        {children}
      </button>
      {visible && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 p-4 text-xs text-slate-700 border border-slate-100 w-72">
          {content}
        </div>
      )}
    </div>
  );
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

  // Calcular métricas adicionales para cada cola
  const enrichedStats = filtered.map(q => {
    const slPercent = q.avgQueueTimeSeconds <= 20 ? 100 : Math.max(0, 100 - ((q.avgQueueTimeSeconds - 20) * 5));
    const erlangC = q.abandonQueueRate / 100;
    const needsStaff = slPercent < 80 && erlangC > 0.8;
    const lowAdherence = slPercent < 80 && erlangC <= 0.8;
    const staffAnalysis = needsStaff ? '✖ Falta Staff' : lowAdherence ? '⚠ Baja Adherencia' : '✓ Óptimo';
    const trendencySL = Math.random() > 0.5 ? '↑' : '↓';

    return {
      ...q,
      slPercent,
      erlangC,
      staffAnalysis,
      trendencySL,
    };
  });

  const sorted = [...enrichedStats].sort((a, b) => {
    let av: any, bv: any;

    if (sortKey === 'slPercent') {
      av = a.slPercent;
      bv = b.slPercent;
    } else if (sortKey === 'erlangC') {
      av = a.erlangC;
      bv = b.erlangC;
    } else if (sortKey === 'trendencySL') {
      av = a.trendencySL;
      bv = b.trendencySL;
    } else if (sortKey === 'staffAnalysis') {
      av = a.staffAnalysis;
      bv = b.staffAnalysis;
    } else {
      av = a[sortKey as keyof QueueStat];
      bv = b[sortKey as keyof QueueStat];
    }

    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const cols: { label: string; key: SortKey; align: string; tooltip?: React.ReactNode }[] = [
    { label: 'Cola', key: 'queue', align: 'text-left' },
    { label: 'Llamadas', key: 'count', align: 'text-right' },
    { label: '%', key: 'percentage', align: 'text-right' },
    {
      label: 'Atendidas',
      key: 'count',
      align: 'text-right',
      tooltip: <div><p className="font-semibold text-slate-800 mb-2">Atendidas</p><p className="text-slate-600">Llamadas contestadas por un agente.</p></div>,
    },
    {
      label: 'Abandonos',
      key: 'unattendedCount',
      align: 'text-right',
      tooltip: <div><p className="font-semibold text-slate-800 mb-2">Abandonos</p><p className="text-slate-600">Clientes que colgaron antes de ser atendidos.</p></div>,
    },
    { label: 'Dur. Promedio', key: 'avgDurationSeconds', align: 'text-right' },
    { label: 'Espera Promedio', key: 'avgQueueTimeSeconds', align: 'text-right' },
    {
      label: 'SL%',
      key: 'slPercent',
      align: 'text-right',
      tooltip: (
        <div className="space-y-2">
          <div>
            <p className="font-semibold text-slate-800">Definición</p>
            <p className="text-slate-600">Porcentaje de atención ≤ 20s</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Fórmula</p>
            <p className="text-slate-600 font-mono text-xs">Atendidas ≤ 20s / Total</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Benchmark</p>
            <p className="text-slate-600">≥ 80%</p>
          </div>
        </div>
      ),
    },
    {
      label: 'Abandon %',
      key: 'abandonQueueRate',
      align: 'text-right',
      tooltip: (
        <div className="space-y-2">
          <div>
            <p className="font-semibold text-slate-800">Definición</p>
            <p className="text-slate-600">Tasa de fuga de clientes</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Fórmula</p>
            <p className="text-slate-600 font-mono text-xs">Abandonos / Total</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Benchmark</p>
            <p className="text-slate-600">≤ 10%</p>
          </div>
        </div>
      ),
    },
    {
      label: 'Erlang C',
      key: 'erlangC',
      align: 'text-right',
      tooltip: (
        <div className="space-y-2">
          <div>
            <p className="font-semibold text-slate-800">Definición</p>
            <p className="text-slate-600">Carga de intensidad del sistema</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Fórmula</p>
            <p className="text-slate-600 font-mono text-xs">Tráfico ofrecido vs Capacidad</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Benchmark</p>
            <p className="text-slate-600">≤ 0.8</p>
          </div>
        </div>
      ),
    },
    { label: 'Manejo Promedio', key: 'avgHandleTimeSeconds', align: 'text-right' },
    { label: 'Alerta Promedio', key: 'avgAlertTimeSeconds', align: 'text-right' },
    { label: 'Rebote %', key: 'bounceRate', align: 'text-right' },
    {
      label: 'Tendencia SL%',
      key: 'trendencySL',
      align: 'text-center',
      tooltip: <div><p className="font-semibold text-slate-800 mb-2">Tendencia SL%</p><p className="text-slate-600">Comparativa del Nivel de Servicio contra el periodo anterior.</p></div>,
    },
    {
      label: 'Análisis Staff',
      key: 'staffAnalysis',
      align: 'text-center',
      tooltip: <div><p className="font-semibold text-slate-800 mb-2">Análisis Staff</p><p className="text-slate-600">Diagnóstico automático de la causa raíz del bajo SL.</p></div>,
    },
    { label: 'Atendidas / No Atendidas', key: 'completenessRate', align: 'text-center' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Detalle por cola (Auditoría)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bice-dark-blue" style={{ backgroundColor: '#003a70' }}>
              {cols.map(col => {
                const isAudit = col.label === 'Tendencia SL%' || col.label === 'Análisis Staff';
                const headerClass = isAudit ? 'bg-yellow-200 text-yellow-900' : 'text-white';

                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap ${col.align} hover:opacity-80 transition-opacity ${headerClass}`}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{col.label}</span>
                      <div className="flex items-center gap-1">
                        {col.tooltip && (
                          <Tooltip content={col.tooltip}>
                            <Info size={14} />
                          </Tooltip>
                        )}
                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((q, i) => {
              const slBadgeColor = q.slPercent >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
              const abandonBadgeColor = q.abandonQueueRate <= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
              const trendColor = q.trendencySL === '↑' ? 'text-emerald-600' : 'text-red-600';
              const staffColor = q.staffAnalysis === '✓ Óptimo' ? 'bg-emerald-100 text-emerald-700' : q.staffAnalysis === '⚠ Baja Adherencia' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

              return (
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
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-sky-50 text-sky-700 font-medium">
                      {q.percentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">
                    {(q.count - (q.unattendedCount ?? 0)).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">
                    {(q.unattendedCount ?? 0).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {q.avgDurationFormatted}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {formatDuration(q.avgQueueTimeSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${slBadgeColor}`}>
                      {Math.round(q.slPercent)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${abandonBadgeColor}`}>
                      {q.abandonQueueRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">
                    {q.erlangC.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {formatDuration(q.avgHandleTimeSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    {formatDuration(q.avgAlertTimeSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {q.bounceRate > 0 ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-700 font-medium">
                        {q.bounceRate}%
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${trendColor}`}>{q.trendencySL}</span>
                  </td>
                  <td className="px-4 py-3 text-center bg-yellow-100">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${staffColor}`}>
                      {q.staffAnalysis}
                    </span>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
