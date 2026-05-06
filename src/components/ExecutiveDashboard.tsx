import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Phone, Clock, Layers, Users, Target, ArrowRight,
  PhoneIncoming, PhoneOutgoing, TrendingUp,
} from 'lucide-react';
import type { KPISummary } from '../lib/kpi';
import { calcChangePercent } from '../lib/periodComparison';
import { KPICardWithComparison } from './KPICardWithComparison';

type TrafficLight = 'green' | 'yellow' | 'red';

type Props = {
  kpis: KPISummary;
  previousKpis?: KPISummary | null;
  onNavigate?: (tab: string) => void;
};

const LIGHT_BORDER: Record<TrafficLight, string> = {
  green: 'border-l-emerald-400',
  yellow: 'border-l-amber-400',
  red: 'border-l-red-400',
};
const LIGHT_BADGE: Record<TrafficLight, { bg: string; text: string; label: string }> = {
  green:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Óptimo'  },
  yellow: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Atención' },
  red:    { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Crítico'  },
};

function attendanceLight(pct: number): TrafficLight {
  if (pct >= 90) return 'green';
  if (pct >= 80) return 'yellow';
  return 'red';
}
const fmtAxisDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-slate-700">{label ? fmtAxisDate(label) : ''}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-slate-700">{p.value.toLocaleString('es-CL')}</span>
        </div>
      ))}
      <div className="border-t border-slate-100 pt-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
        <span className="text-slate-500">Total:</span>
        <span className="font-semibold text-slate-700">{total.toLocaleString('es-CL')}</span>
      </div>
    </div>
  );
}

export function ExecutiveDashboard({ kpis, previousKpis, onNavigate }: Props) {
  const attendedPercent = useMemo(
    () => kpis.totalCalls > 0
      ? Math.round(((kpis.totalCalls - kpis.unattendedCount) / kpis.totalCalls) * 100)
      : 0,
    [kpis],
  );

  const previousAttendedPercent = useMemo(
    () => previousKpis && previousKpis.totalCalls > 0
      ? Math.round(((previousKpis.totalCalls - previousKpis.unattendedCount) / previousKpis.totalCalls) * 100)
      : undefined,
    [previousKpis],
  );

  const globalBounceRate = useMemo(
    () => {
      const execs = kpis.executiveStats.filter(e => e.executive !== 'SIN ATENDER');
      if (execs.length === 0) return 0;
      const total = execs.reduce((sum, e) => sum + e.bounceRate, 0);
      return Math.round(total / execs.length);
    },
    [kpis],
  );

  const previousGlobalBounceRate = useMemo(
    () => {
      if (!previousKpis) return undefined;
      const execs = previousKpis.executiveStats.filter(e => e.executive !== 'SIN ATENDER');
      if (execs.length === 0) return undefined;
      const total = execs.reduce((sum, e) => sum + e.bounceRate, 0);
      return Math.round(total / execs.length);
    },
    [previousKpis],
  );

  const activeQueues     = kpis.queueStats.filter(q => q.queue !== 'Sin cola').length;
  const activeExecutives = kpis.executiveStats.filter(e => e.executive !== 'SIN ATENDER').length;

  const topQueues      = kpis.queueStats.filter(q => q.queue !== 'Sin cola').slice(0, 5);
  const maxQueueCount  = topQueues[0]?.count ?? 1;

  const topExecutives  = kpis.executiveStats.filter(e => e.executive !== 'SIN ATENDER').slice(0, 5);
  const maxExecCount   = topExecutives[0]?.count ?? 1;

  const inbound  = kpis.directionStats.find(d => ['inbound',  'entrante'].includes(d.direction.toLowerCase()));
  const outbound = kpis.directionStats.find(d => ['outbound', 'saliente'].includes(d.direction.toLowerCase()));

  const trendData    = kpis.dailyAttendedVsUnattended;
  const tickInterval = Math.max(0, Math.floor(trendData.length / 10) - 1);

  const attLight  = attendanceLight(attendedPercent);

  const topExec = kpis.executiveStats.find(e => e.executive !== 'SIN ATENDER');

  // Previous period values for comparison
  const prev = previousKpis;

  return (
    <div className="space-y-6">

      {/* ── 7 KPI cards (prioritarios) ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* 1. Total llamadas */}
        <KPICardWithComparison
          title="Total llamadas"
          currentValue={kpis.totalCalls.toLocaleString('es-CL')}
          previousValue={prev ? prev.totalCalls.toLocaleString('es-CL') : undefined}
          changePercent={calcChangePercent(kpis.totalCalls, prev?.totalCalls)}
          subtitle="Registros en el período"
          icon={<Phone size={20} className="text-sky-600" />}
          accent="bg-sky-50"
        />

        {/* 2. Tasa de atención */}
        <KPICardWithComparison
          title="Tasa de atención"
          currentValue={`${attendedPercent}%`}
          previousValue={previousAttendedPercent !== undefined ? `${previousAttendedPercent}%` : undefined}
          changePercent={calcChangePercent(attendedPercent, previousAttendedPercent)}
          subtitle="Llamadas atendidas"
          rightContent={
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${LIGHT_BADGE[attLight].bg} ${LIGHT_BADGE[attLight].text}`}>
              {LIGHT_BADGE[attLight].label}
            </span>
          }
          className={`border-l-4 ${LIGHT_BORDER[attLight]}`}
        />

        {/* 3. Duración promedio */}
        <KPICardWithComparison
          title="Duración promedio"
          currentValue={kpis.avgDurationFormatted}
          previousValue={prev ? prev.avgDurationFormatted : undefined}
          changePercent={prev ? calcChangePercent(kpis.avgDurationSeconds, prev.avgDurationSeconds) : undefined}
          isNeutral
          subtitle="Por llamada"
          icon={<Clock size={20} className="text-emerald-600" />}
          accent="bg-emerald-50"
        />

        {/* 4. Tasa de rebotes */}
        <KPICardWithComparison
          title="Tasa de rebotes"
          currentValue={`${globalBounceRate}%`}
          previousValue={previousGlobalBounceRate !== undefined ? `${previousGlobalBounceRate}%` : undefined}
          changePercent={calcChangePercent(globalBounceRate, previousGlobalBounceRate)}
          isLowerBetter
          subtitle="Promedio de ejecutivos"
          icon={<TrendingUp size={20} className="text-rose-600" />}
          accent="bg-rose-50"
        />

        {/* 5. Service Level */}
        <KPICardWithComparison
          title="Service Level"
          currentValue={`${kpis.serviceLevel.overallSL}%`}
          previousValue={prev ? `${prev.serviceLevel.overallSL}%` : undefined}
          changePercent={calcChangePercent(kpis.serviceLevel.overallSL, prev?.serviceLevel.overallSL)}
          subtitle="Atendidas en ≤20s"
          icon={<Target size={20} className="text-indigo-600" />}
          accent="bg-indigo-50"
        />

        {/* 6. Espera promedio */}
        <KPICardWithComparison
          title="Espera promedio"
          currentValue={kpis.avgQueueTimeFormatted}
          previousValue={prev ? prev.avgQueueTimeFormatted : undefined}
          changePercent={prev ? calcChangePercent(kpis.avgQueueTimeSeconds, prev.avgQueueTimeSeconds) : undefined}
          isLowerBetter
          subtitle="En cola"
          icon={<Clock size={20} className="text-orange-600" />}
          accent="bg-orange-50"
        />

        {/* 7. Tiempo de manejo */}
        <KPICardWithComparison
          title="Tiempo de manejo"
          currentValue={kpis.avgHandleTimeFormatted}
          previousValue={prev ? prev.avgHandleTimeFormatted : undefined}
          changePercent={prev ? calcChangePercent(kpis.avgHandleTimeSeconds, prev.avgHandleTimeSeconds) : undefined}
          isNeutral
          subtitle="Duración total promedio"
          icon={<Clock size={20} className="text-purple-600" />}
          accent="bg-purple-50"
        />

      </div>

      {/* ── Evolución diaria ─────────────────────────────────────── */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">
            Evolución diaria de llamadas
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradAtt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gradUnatt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtAxisDate}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<TrendTooltip />} />
              <Area
                type="monotone"
                dataKey="attended"
                name="Atendidas"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#gradAtt)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="unattended"
                name="Sin atender"
                stroke="#f87171"
                strokeWidth={2}
                fill="url(#gradUnatt)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-3 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-sky-400 rounded" />
              <span className="text-xs text-slate-500">Atendidas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-400 rounded" />
              <span className="text-xs text-slate-500">Sin atender</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Colas top + Tipo + Ejecutivos ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 5 colas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">
            Top colas por volumen
          </h3>
          {topQueues.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-4">
              {topQueues.map((q, i) => (
                <div key={q.queue}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-300 w-4 flex-shrink-0">{i + 1}</span>
                      <span className="text-slate-700 font-medium truncate">{q.queue}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <span className="text-xs text-slate-400">{q.unattendedPercent}% perdidas</span>
                      <span className="font-bold text-slate-800">{q.count.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${(q.count / maxQueueCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tipo de llamada + Top ejecutivos */}
        <div className="space-y-4">

          {/* Tipo de llamada */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
              Tipo de llamada
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {inbound ? (
                <div className="bg-sky-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneIncoming size={13} className="text-sky-600" />
                    <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Entrantes</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{inbound.count.toLocaleString('es-CL')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{inbound.percentage}% del total</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-xs text-slate-400">Sin datos</p>
                </div>
              )}
              {outbound ? (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneOutgoing size={13} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Salientes</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{outbound.count.toLocaleString('es-CL')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{outbound.percentage}% del total</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-xs text-slate-400">Sin datos</p>
                </div>
              )}
            </div>
          </div>

          {/* Top ejecutivos */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Top ejecutivos</h3>
              <span className="text-xs text-slate-400">{activeExecutives} activos</span>
            </div>
            {topExecutives.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {topExecutives.map((e, i) => (
                  <div key={e.executive} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300 w-4 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-700 font-medium truncate">{e.executive}</span>
                        <span className="text-xs font-bold text-slate-800 ml-2 flex-shrink-0">
                          {e.count.toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-400 transition-all duration-500"
                          style={{ width: `${(e.count / maxExecCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Tarjetas de navegación ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <button
          type="button"
          onClick={() => onNavigate?.('colas')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-left hover:border-sky-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
              <Layers size={20} className="text-sky-600" />
            </div>
            <ArrowRight size={15} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-semibold text-slate-800 mb-1">Análisis de Colas</h4>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            Rendimiento por cola, heatmaps de carga y evolución de la tasa de atención.
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400">Colas activas</p>
              <p className="font-bold text-slate-700">{activeQueues}</p>
            </div>
            {kpis.queueStats.find(q => q.queue !== 'Sin cola') && (
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Mayor volumen</p>
                <p className="font-bold text-slate-700 truncate">
                  {kpis.queueStats.find(q => q.queue !== 'Sin cola')?.queue}
                </p>
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('ejecutivos')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-left hover:border-violet-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-violet-600" />
            </div>
            <ArrowRight size={15} className="text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-semibold text-slate-800 mb-1">Rendimiento de Ejecutivos</h4>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            Volumen, tiempos de atención y distribución horaria individual por ejecutivo.
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400">Ejecutivos activos</p>
              <p className="font-bold text-slate-700">{activeExecutives}</p>
            </div>
            {topExec && (
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Top ejecutivo</p>
                <p className="font-bold text-slate-700 truncate">{topExec.executive}</p>
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('planificacion')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-left hover:border-emerald-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Target size={20} className="text-emerald-600" />
            </div>
            <ArrowRight size={15} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-semibold text-slate-800 mb-1">Planificación de Personal</h4>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            Ocupación telefónica y demanda en Erlangs para dimensionamiento de turnos.
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400">Pico de demanda</p>
              <p className="font-bold text-slate-700">{kpis.hourlyDemand.peakErlangs.toFixed(1)} Erl</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Ejecutivos activos</p>
              <p className="font-bold text-slate-700">{activeExecutives}</p>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
}
