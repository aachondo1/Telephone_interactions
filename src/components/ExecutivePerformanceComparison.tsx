import { Trophy, TrendingDown } from 'lucide-react';
import type { ExecutiveStat } from '../lib/kpi';
import { calculateExecutivePerformanceScore, formatDuration } from '../lib/kpi';

type Props = {
  stats: ExecutiveStat[];
};

export function ExecutivePerformanceComparison({ stats }: Props) {
  const scored = calculateExecutivePerformanceScore(stats);
  const sorted = [...scored].sort((a, b) => b.performanceScore - a.performanceScore);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();

  const renderRow = (e: ExecutiveStat & { performanceScore: number }, rank: number, isTop: boolean) => (
    <tr key={e.executive} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: isTop ? `hsl(140, 70%, ${50 - rank * 5}%)` : `hsl(0, 70%, ${50 + rank * 5}%)` }}>
            {rank}
          </div>
          <span className="font-medium text-slate-700 truncate">{e.executive}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${isTop ? 'bg-emerald-400' : 'bg-red-400'}`}
              style={{ width: `${(e.performanceScore / 100) * 100}%` }}
            />
          </div>
          <span className="font-bold text-slate-800 w-8 text-right">{e.performanceScore}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-600">
        {e.count.toLocaleString('es-CL')}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-600 font-mono">
        {e.avgDurationFormatted}
      </td>
      <td className="px-4 py-3 text-right text-sm">
        <span className="text-rose-600 font-medium">{e.bounceRate}%</span>
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-600 font-mono">
        {formatDuration(e.avgHandleTimeSeconds)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-600 font-mono">
        {formatDuration(e.avgQueueTimeSeconds)}
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Top performers */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50 flex items-center gap-2">
          <Trophy size={18} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-900">Top 5 Mejores Ejecutivos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-left px-4 py-3 font-medium">Ejecutivo</th>
                <th className="text-right px-4 py-3 font-medium">Score</th>
                <th className="text-right px-4 py-3 font-medium">Llamadas</th>
                <th className="text-right px-4 py-3 font-medium">Dur. Prom.</th>
                <th className="text-right px-4 py-3 font-medium">% Rebotes</th>
                <th className="text-right px-4 py-3 font-medium">Manejo</th>
                <th className="text-right px-4 py-3 font-medium">Espera</th>
              </tr>
            </thead>
            <tbody>
              {top5.length > 0 ? (
                top5.map((e, i) => renderRow(e, i + 1, true))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin datos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom performers */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-red-50 flex items-center gap-2">
          <TrendingDown size={18} className="text-red-600" />
          <h3 className="text-sm font-semibold text-red-900">Top 5 Ejecutivos a Mejorar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-left px-4 py-3 font-medium">Ejecutivo</th>
                <th className="text-right px-4 py-3 font-medium">Score</th>
                <th className="text-right px-4 py-3 font-medium">Llamadas</th>
                <th className="text-right px-4 py-3 font-medium">Dur. Prom.</th>
                <th className="text-right px-4 py-3 font-medium">% Rebotes</th>
                <th className="text-right px-4 py-3 font-medium">Manejo</th>
                <th className="text-right px-4 py-3 font-medium">Espera</th>
              </tr>
            </thead>
            <tbody>
              {bottom5.length > 0 ? (
                bottom5.map((e, i) => renderRow(e, i + 1, false))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin datos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
