import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Phone, PhoneIncoming, PhoneOff, Clock, Users, TrendingUp, TrendingDown,
  Minus, LayoutDashboard,
} from 'lucide-react';
import type { KPISummary } from '../lib/kpi';
import type { CallRecord } from '../lib/supabase';
import { SectionHeader } from './SectionHeader';

const BICE_BLUE = '#326295';
const BICE_GREEN = '#84BD00';
const BICE_GRAY = '#94a3b8';

function isInboundDir(dir: string): boolean {
  const d = (dir || '').toLowerCase();
  return d === 'inbound' || d === 'entrante';
}

function fmtSecs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type DirectorKPIs = {
  totalInbound: number;
  queueCalls: number;
  executiveCalls: number;
  attendedCalls: number;
  abandonedCalls: number;
  avgQueueTimeSec: number;
  avgAHTSec: number;
  avgConversationSec: number;
};

function calcDirectorKPIs(records: CallRecord[]): DirectorKPIs {
  const inbound = records.filter(r => isInboundDir(r.call_direction));
  const queueBase = inbound.filter(r => r.flow_exit !== false && (r.queue_time_seconds ?? 0) >= 1);
  const executiveCalls = inbound.filter(r => r.alerted_users !== null && r.alerted_users !== '').length;
  const attended = inbound.filter(r => (r.conversation_total_seconds ?? 0) > 0);
  const abandoned = queueBase.filter(r => !((r.conversation_total_seconds ?? 0) > 0));

  const avgQueueTime = queueBase.length > 0
    ? queueBase.reduce((s, r) => s + (r.queue_time_seconds ?? 0), 0) / queueBase.length
    : 0;

  const avgAHT = attended.length > 0
    ? attended.reduce((s, r) => s + (r.handle_time_seconds ?? 0), 0) / attended.length
    : 0;

  const avgConversation = attended.length > 0
    ? attended.reduce((s, r) => s + (r.conversation_total_seconds ?? 0), 0) / attended.length
    : 0;

  return {
    totalInbound: inbound.length,
    queueCalls: queueBase.length,
    executiveCalls,
    attendedCalls: attended.length,
    abandonedCalls: abandoned.length,
    avgQueueTimeSec: Math.round(avgQueueTime),
    avgAHTSec: Math.round(avgAHT),
    avgConversationSec: Math.round(avgConversation),
  };
}

type FunnelDay = { date: string; label: string; entrantes: number; aCola: number; contestadas: number };

function calcDailyFunnel(records: CallRecord[]): FunnelDay[] {
  const map = new Map<string, { entrantes: number; aCola: number; contestadas: number }>();
  for (const r of records) {
    if (!isInboundDir(r.call_direction) || !r.call_date) continue;
    if (!map.has(r.call_date)) map.set(r.call_date, { entrantes: 0, aCola: 0, contestadas: 0 });
    const d = map.get(r.call_date)!;
    d.entrantes++;
    if (r.flow_exit !== false && (r.queue_time_seconds ?? 0) >= 1) d.aCola++;
    if ((r.conversation_total_seconds ?? 0) > 0) d.contestadas++;
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
      ...counts,
    }));
}

type OutboundDay = { date: string; label: string; efectivos: number; fallidos: number };

function calcDailyOutbound(records: CallRecord[]): OutboundDay[] {
  const map = new Map<string, { efectivos: number; fallidos: number }>();
  for (const r of records) {
    if (isInboundDir(r.call_direction) || !r.call_date) continue;
    if (!map.has(r.call_date)) map.set(r.call_date, { efectivos: 0, fallidos: 0 });
    const d = map.get(r.call_date)!;
    if ((r.conversation_total_seconds ?? 0) > 10) d.efectivos++;
    else d.fallidos++;
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
      ...counts,
    }));
}

function splitHalves(records: CallRecord[]): [CallRecord[], CallRecord[]] {
  const dates = [...new Set(records.map(r => r.call_date).filter(Boolean) as string[])].sort();
  if (dates.length < 2) return [records, []];
  const midIdx = Math.floor(dates.length / 2);
  const midDate = dates[midIdx];
  return [
    records.filter(r => r.call_date && r.call_date >= midDate),
    records.filter(r => r.call_date && r.call_date < midDate),
  ];
}

function changePct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

function ChangeBadge({ pct, inverted = false }: { pct: number | null; inverted?: boolean }) {
  if (pct === null) return null;
  const isPositive = inverted ? pct < 0 : pct > 0;
  const isNeutral = pct === 0;
  if (isNeutral) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
      <Minus size={10} /> 0%
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(pct)}%
    </span>
  );
}

type KPICardProps = {
  label: string;
  value: string;
  change: number | null;
  invertedChange?: boolean;
  iconColor: string;
  iconBg: string;
  icon: React.ElementType;
};

function KPICard({ label, value, change, invertedChange = false, iconColor, iconBg, icon: Icon }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <div className="mt-1.5 h-4">
        <ChangeBadge pct={change} inverted={invertedChange} />
      </div>
    </div>
  );
}

function FunnelTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; color: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-slate-700">{p.value.toLocaleString('es-CL')}</span>
        </div>
      ))}
    </div>
  );
}

type Props = {
  kpis: KPISummary;
  records: CallRecord[];
  onNavigate?: (tab: string) => void;
};

export function ExecutiveDashboard({ kpis, records, onNavigate: _onNavigate }: Props) {
  const [currentRecords, prevRecords] = useMemo(() => splitHalves(records), [records]);

  const curr = useMemo(() => calcDirectorKPIs(currentRecords), [currentRecords]);
  const prev = useMemo(() => calcDirectorKPIs(prevRecords), [prevRecords]);

  const funnelData = useMemo(() => calcDailyFunnel(records), [records]);
  const outboundData = useMemo(() => calcDailyOutbound(records), [records]);

  const topQueues = useMemo(
    () => kpis.queueStats.filter(q => q.queue !== 'Sin cola').slice(0, 8),
    [kpis.queueStats],
  );
  const maxQueueCount = topQueues[0]?.count ?? 1;

  const top10Executives = useMemo(
    () => kpis.executiveStats
      .filter(e => e.executive !== 'SIN ATENDER')
      .slice(0, 10)
      .map(e => ({
        executive: e.executive,
        attended: e.inboundCount,
        tmo: fmtSecs(e.avgHandleTimeSeconds),
      })),
    [kpis.executiveStats],
  );

  const hasPrev = prevRecords.length > 0;

  const tickInterval = Math.max(0, Math.floor(funnelData.length / 10) - 1);
  const outboundTickInterval = Math.max(0, Math.floor(outboundData.length / 10) - 1);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={LayoutDashboard}
        title="Vista de Directorio"
        description="Volumen, eficiencia y rankings de productividad"
      />

      {/* ── 1. Fichas de KPIs Directos ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Llamadas Totales"
          value={curr.totalInbound.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.totalInbound, prev.totalInbound) : null}
          icon={Phone}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="Llamadas a Cola"
          value={curr.queueCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.queueCalls, prev.queueCalls) : null}
          icon={PhoneIncoming}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="Llamadas a Ejecutivo"
          value={curr.executiveCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.executiveCalls, prev.executiveCalls) : null}
          icon={Users}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="Llamadas Atendidas"
          value={curr.attendedCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.attendedCalls, prev.attendedCalls) : null}
          icon={Phone}
          iconColor={BICE_GREEN}
          iconBg="bg-green-50"
        />
        <KPICard
          label="Llamadas Abandonadas"
          value={curr.abandonedCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.abandonedCalls, prev.abandonedCalls) : null}
          invertedChange
          icon={PhoneOff}
          iconColor="#ef4444"
          iconBg="bg-red-50"
        />
        <KPICard
          label="Tiempo Cola Prom."
          value={fmtSecs(curr.avgQueueTimeSec)}
          change={hasPrev ? changePct(curr.avgQueueTimeSec, prev.avgQueueTimeSec) : null}
          invertedChange
          icon={Clock}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="AHT Promedio"
          value={fmtSecs(curr.avgAHTSec)}
          change={hasPrev ? changePct(curr.avgAHTSec, prev.avgAHTSec) : null}
          invertedChange
          icon={Clock}
          iconColor="#7c3aed"
          iconBg="bg-purple-50"
        />
        <KPICard
          label="Tiempo Conversación Prom."
          value={fmtSecs(curr.avgConversationSec)}
          change={hasPrev ? changePct(curr.avgConversationSec, prev.avgConversationSec) : null}
          icon={Clock}
          iconColor={BICE_GREEN}
          iconBg="bg-green-50"
        />
      </div>

      {/* ── 2. Panel de Gráficos Diarios ────────────────────────────── */}
      {funnelData.length > 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            Funnel de Demanda Entrante
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Evolución diaria: Entrantes → A Cola → Contestadas
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={funnelData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={38}
              />
              <Tooltip content={<FunnelTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                iconType="plainline"
              />
              <Line
                type="monotone"
                dataKey="entrantes"
                name="Llamadas Entrantes"
                stroke={BICE_BLUE}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="aCola"
                name="Asignadas a Cola"
                stroke={BICE_GRAY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="contestadas"
                name="Contestadas"
                stroke={BICE_GREEN}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {outboundData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            Volumen de Gestión Saliente (Outbound)
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Proactividad diaria: Contactos efectivos vs Intentos fallidos
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={outboundData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={outboundTickInterval}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={38}
              />
              <Tooltip content={<FunnelTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="efectivos" name="Contactos Efectivos" fill={BICE_GREEN} radius={[3, 3, 0, 0]} />
              <Bar dataKey="fallidos" name="Intentos Fallidos" fill={BICE_GRAY} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 3. Rankings ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ranking de Colas por Volumen */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            Ranking de Colas por Volumen
          </h3>
          <p className="text-xs text-slate-400 mb-5">Ordenadas por llamadas entrantes recibidas</p>
          {topQueues.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-4">
              {topQueues.map((q, i) => (
                <div key={q.queue}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-300 w-5 flex-shrink-0">{i + 1}</span>
                      <span className="text-slate-700 font-medium truncate">{q.queue}</span>
                    </div>
                    <span className="font-bold text-slate-800 ml-3 flex-shrink-0">
                      {q.count.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(q.count / maxQueueCount) * 100}%`,
                        backgroundColor: BICE_BLUE,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 10 Ejecutivos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            Top 10 Ejecutivos
          </h3>
          <p className="text-xs text-slate-400 mb-4">Mayor gestión entrante · con TMO</p>
          {top10Executives.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wide">
                    <th className="text-left pb-3 w-8">#</th>
                    <th className="text-left pb-3">Ejecutivo</th>
                    <th className="text-right pb-3">Atendidas</th>
                    <th className="text-right pb-3">TMO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {top10Executives.map((e, i) => (
                    <tr key={e.executive} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 text-xs font-bold text-slate-300">{i + 1}</td>
                      <td className="py-2.5 font-medium text-slate-700 truncate max-w-[160px]">{e.executive}</td>
                      <td className="py-2.5 text-right font-bold" style={{ color: BICE_GREEN }}>
                        {e.attended.toLocaleString('es-CL')}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 font-mono text-xs">{e.tmo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
