import { TrendingUp, TrendingDown, Minus, Trophy, AlertCircle } from 'lucide-react';
import type { TopBottomExecutive, TopBottomQueue } from '../lib/kpi';

type Props = {
  topExecutives: TopBottomExecutive[];
  bottomExecutives: TopBottomExecutive[];
  topQueues: TopBottomQueue[];
  bottomQueues: TopBottomQueue[];
  teamAverage: number;
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-emerald-500" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-slate-400" />;
}

function getAttendanceColor(rate: number, teamAvg: number): { badge: string; bgClass: string } {
  if (rate >= teamAvg + 10) return { badge: 'text-emerald-600 bg-emerald-50', bgClass: 'bg-emerald-100 text-emerald-700' };
  if (rate >= teamAvg) return { badge: 'text-sky-600 bg-sky-50', bgClass: 'bg-sky-100 text-sky-700' };
  if (rate >= teamAvg - 10) return { badge: 'text-amber-600 bg-amber-50', bgClass: 'bg-amber-100 text-amber-700' };
  return { badge: 'text-red-600 bg-red-50', bgClass: 'bg-red-100 text-red-700' };
}

export function TopBottomRankings({ topExecutives, bottomExecutives, topQueues, bottomQueues, teamAverage }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ejecutivos */}
      <div className="space-y-4">
        {/* Top Ejecutivos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-50/0 border-b border-emerald-100 flex items-center gap-2">
            <Trophy size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-900">Top 5 Ejecutivos</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {topExecutives.map((exec, idx) => {
              const colors = getAttendanceColor(exec.attendanceRate, teamAverage);
              return (
                <div key={exec.executive} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{idx + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{exec.executive}</p>
                      <p className="text-xs text-slate-400">{exec.callCount} llamadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${colors.badge}`}>
                      {exec.attendanceRate}%
                    </div>
                    <TrendIcon trend={exec.trend} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Ejecutivos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-red-50/0 border-b border-red-100 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <h3 className="text-sm font-bold text-red-900">Bottom 5 Ejecutivos</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {bottomExecutives.map((exec) => {
              const colors = getAttendanceColor(exec.attendanceRate, teamAverage);
              return (
                <div key={exec.executive} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-300 to-red-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{exec.rank}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{exec.executive}</p>
                      <p className="text-xs text-slate-400">{exec.callCount} llamadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${colors.badge}`}>
                      {exec.attendanceRate}%
                    </div>
                    <TrendIcon trend={exec.trend} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Average */}
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border border-sky-100 px-6 py-4">
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">Promedio del Equipo</p>
          <p className="text-3xl font-bold text-sky-900">{teamAverage}%</p>
          <p className="text-xs text-sky-600 mt-1">Tasa de atención global</p>
        </div>
      </div>

      {/* Colas */}
      <div className="space-y-4">
        {/* Top Colas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-50/0 border-b border-emerald-100 flex items-center gap-2">
            <Trophy size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-900">Top 5 Colas</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {topQueues.map((queue, idx) => {
              const colors = getAttendanceColor(queue.attendanceRate, teamAverage);
              return (
                <div key={queue.queue} className="px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">{idx + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{queue.queue}</p>
                        <p className="text-xs text-slate-400">{queue.callCount} llamadas</p>
                      </div>
                    </div>
                    <TrendIcon trend={queue.trend} />
                  </div>
                  <div className="flex items-center justify-between text-xs ml-10">
                    <span className="text-slate-500">Espera:</span>
                    <span className="font-medium text-slate-700">{queue.avgQueueTime}s</span>
                  </div>
                  <div className="flex items-center justify-between text-xs ml-10">
                    <span className={`inline-block px-2 py-0.5 rounded font-medium ${colors.bgClass}`}>
                      {queue.attendanceRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Colas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-red-50/0 border-b border-red-100 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <h3 className="text-sm font-bold text-red-900">Bottom 5 Colas</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {bottomQueues.map((queue) => {
              const colors = getAttendanceColor(queue.attendanceRate, teamAverage);
              return (
                <div key={queue.queue} className="px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-300 to-red-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">{queue.rank}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{queue.queue}</p>
                        <p className="text-xs text-slate-400">{queue.callCount} llamadas</p>
                      </div>
                    </div>
                    <TrendIcon trend={queue.trend} />
                  </div>
                  <div className="flex items-center justify-between text-xs ml-10">
                    <span className="text-slate-500">Espera:</span>
                    <span className="font-medium text-slate-700">{queue.avgQueueTime}s</span>
                  </div>
                  <div className="flex items-center justify-between text-xs ml-10">
                    <span className={`inline-block px-2 py-0.5 rounded font-medium ${colors.bgClass}`}>
                      {queue.attendanceRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
