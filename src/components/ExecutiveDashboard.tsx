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
import type { FilterState } from './FilterBar';
import { getDateRangeForRelative } from './FilterBar';
import { getMondayKey, weekLabel, monthLabel, isInbound } from '../lib/kpi/shared';
import { isCorruptedTechnicalCall } from '../lib/kpi/calidad';
import { SectionHeader } from './SectionHeader';

const BICE_BLUE = '#326295';
const BICE_GREEN = '#84BD00';
const BICE_GRAY = '#94a3b8';

type Granularity = 'hour' | 'day' | 'week' | 'month';

function isBusinessHours(r: CallRecord): boolean {
  if (!r.call_date || r.call_hour === null || r.call_hour === undefined) return true;
  const day = new Date(r.call_date + 'T00:00:00').getDay();
  if (day === 0 || day === 6) return false;
  if (day >= 1 && day <= 4) return r.call_hour >= 8 && r.call_hour < 19;
  if (day === 5) return r.call_hour >= 8 && r.call_hour < 15;
  return false;
}

function filterRecordsByDateRange(records: CallRecord[], start: string, end: string): CallRecord[] {
  return records.filter(r => {
    if (!isBusinessHours(r)) return false;
    if (r.call_date && r.call_date < start) return false;
    if (r.call_date && r.call_date > end) return false;
    return true;
  });
}

function getPreviousDateRange(current: { start: string; end: string }): { start: string; end: string } {
  const currentStart = new Date(current.start + 'T00:00:00');
  const currentEnd = new Date(current.end + 'T23:59:59');
  const days = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  return { start: formatDate(prevStart), end: formatDate(prevEnd) };
}

function getGranularity(days: number): Granularity {
  if (days <= 7) return 'hour';
  if (days <= 60) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

function getTickInterval(granularity: Granularity, length: number): number {
  switch (granularity) {
    case 'hour':
      return Math.max(0, Math.floor(length / 6) - 1);
    case 'day':
      return Math.max(0, Math.floor(length / 10) - 1);
    case 'week':
      return Math.max(0, Math.floor(length / 8) - 1);
    case 'month':
      return length > 12 ? Math.floor(length / 6) : 0;
  }
}


function fmtSecs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type HalfPeriodMetrics = {
  totalInbound: number;
  queueCalls: number;
  executiveCalls: number;
  attendedCalls: number;
  abandonedCalls: number;
  avgQueueTimeSec: number;
  avgAHTSec: number;
  avgConversationSec: number;
};

// Mismos criterios que calculateKPIs: isInbound de shared.ts, excluye cortes técnicos, usa r.attended
function countHalfPeriodMetrics(records: CallRecord[]): HalfPeriodMetrics {
  const inbound = records.filter(r => isInbound(r.call_direction));
  const valid = inbound.filter(r => !isCorruptedTechnicalCall(r));
  const ivrAbandons = valid.filter(r => r.abandon_type === 'ivr').length;
  const queueAbandons = valid.filter(r => r.abandon_type === 'queue').length;
  const alertAbandons = valid.filter(r => r.abandon_type === 'alert').length;
  const attended = valid.filter(r => r.attended);

  const queueBase = valid.filter(r => r.flow_exit !== false && (r.queue_time_seconds ?? 0) >= 1);
  const avgQueueTime = queueBase.length > 0
    ? queueBase.reduce((s, r) => s + (r.queue_time_seconds ?? 0), 0) / queueBase.length : 0;
  const avgAHT = attended.length > 0
    ? attended.reduce((s, r) => s + (r.handle_time_seconds ?? 0), 0) / attended.length : 0;
  const avgConversation = attended.length > 0
    ? attended.reduce((s, r) => s + (r.conversation_total_seconds ?? 0), 0) / attended.length : 0;

  return {
    totalInbound: valid.length,
    queueCalls: valid.length - ivrAbandons,
    executiveCalls: valid.length - ivrAbandons - queueAbandons,
    attendedCalls: attended.length,
    abandonedCalls: queueAbandons + alertAbandons,
    avgQueueTimeSec: Math.round(avgQueueTime),
    avgAHTSec: Math.round(avgAHT),
    avgConversationSec: Math.round(avgConversation),
  };
}

type FunnelPoint = { date: string; label: string; entrantes: number; aCola: number; contestadas: number };

function calcFunnelByGranularity(records: CallRecord[], granularity: Granularity): FunnelPoint[] {
  const map = new Map<string, { key: string; label: string; entrantes: number; aCola: number; contestadas: number }>();

  for (const r of records) {
    if (!isInbound(r.call_direction) || !r.call_date) continue;
    if (isCorruptedTechnicalCall(r)) continue;

    let key = '';
    let label = '';

    if (granularity === 'hour') {
      const hour = r.call_hour ?? 0;
      key = `${r.call_date}:${hour}`;
      const dateStr = new Date(r.call_date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      label = `${dateStr} ${String(hour).padStart(2, '0')}:00`;
    } else if (granularity === 'day') {
      key = r.call_date;
      label = new Date(r.call_date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    } else if (granularity === 'week') {
      key = getMondayKey(r.call_date);
      label = weekLabel(key);
    } else {
      const [year, month] = r.call_date.split('-');
      key = `${year}-${month}`;
      label = monthLabel(key);
    }

    if (!map.has(key)) {
      map.set(key, { key, label, entrantes: 0, aCola: 0, contestadas: 0 });
    }
    const d = map.get(key)!;
    d.entrantes++;
    if (r.flow_exit !== false && (r.queue_time_seconds ?? 0) >= 1) d.aCola++;
    if (r.attended) d.contestadas++;
  }

  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, label, entrantes, aCola, contestadas }) => ({
      date: key,
      label,
      entrantes,
      aCola,
      contestadas,
    }));
}

type OutboundDay = { date: string; label: string; efectivos: number; fallidos: number };

function calcOutboundByGranularity(records: CallRecord[], granularity: Granularity): OutboundDay[] {
  const map = new Map<string, { key: string; label: string; efectivos: number; fallidos: number }>();

  for (const r of records) {
    if (isInbound(r.call_direction) || !r.call_date) continue;

    let key = '';
    let label = '';

    if (granularity === 'hour') {
      const hour = r.call_hour ?? 0;
      key = `${r.call_date}:${hour}`;
      const dateStr = new Date(r.call_date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      label = `${dateStr} ${String(hour).padStart(2, '0')}:00`;
    } else if (granularity === 'day') {
      key = r.call_date;
      label = new Date(r.call_date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    } else if (granularity === 'week') {
      key = getMondayKey(r.call_date);
      label = weekLabel(key);
    } else {
      const [year, month] = r.call_date.split('-');
      key = `${year}-${month}`;
      label = monthLabel(key);
    }

    if (!map.has(key)) {
      map.set(key, { key, label, efectivos: 0, fallidos: 0 });
    }
    const d = map.get(key)!;
    if ((r.conversation_total_seconds ?? 0) > 10) d.efectivos++;
    else d.fallidos++;
  }

  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, label, efectivos, fallidos }) => ({
      date: key,
      label,
      efectivos,
      fallidos,
    }));
}


function changePct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

function countQueueCalls(records: CallRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of records) {
    if (!isInbound(r.call_direction) || r.flow_exit === false || (r.queue_time_seconds ?? 0) < 1) continue;
    const queue = r.queue || 'Sin cola';
    map.set(queue, (map.get(queue) ?? 0) + 1);
  }
  return map;
}

type QueueWithVariation = { queue: string; count: number; variation: number | null };


function ChangeBadge({ pct, inverted = false, compareLabel }: { pct: number | null; inverted?: boolean; compareLabel?: string }) {
  if (pct === null) return null;
  const isPositive = inverted ? pct < 0 : pct > 0;
  const isNeutral = pct === 0;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {isNeutral ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
          <Minus size={10} /> 0%
        </span>
      ) : (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(pct)}%
        </span>
      )}
      {compareLabel && (
        <span className="text-[10px] text-slate-400">{compareLabel}</span>
      )}
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
  compareLabel?: string;
};

function KPICard({ label, value, change, invertedChange = false, iconColor, iconBg, icon: Icon, compareLabel }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <div className="mt-1.5 min-h-4">
        <ChangeBadge pct={change} inverted={invertedChange} compareLabel={compareLabel} />
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
  filters: FilterState;
  onNavigate?: (tab: string) => void;
};

export function ExecutiveDashboard({ kpis, records, filters, onNavigate: _onNavigate }: Props) {
  // Valores de display: derivados de kpis (fuente única = calculateKPIs(currentRecords))
  // Garantiza consistencia con todas las demás pestañas del dashboard
  // Calcular período actual y anterior basado en filtros
  const dateRanges = useMemo(() => {
    let start = filters.dateStart;
    let end = filters.dateEnd;
    if (!start || !end) {
      const resolved = getDateRangeForRelative(filters.dateRange);
      start = resolved.start;
      end = resolved.end;
    }
    const currentRange = { start: start || '2024-01-01', end: end || '2024-01-31' };
    const prevRange = getPreviousDateRange(currentRange);
    return { current: currentRange, previous: prevRange };
  }, [filters.dateStart, filters.dateEnd, filters.dateRange]);

  // Filtrar records para período actual y anterior (aplicando horario laboral)
  const currentRecords = useMemo(() =>
    filterRecordsByDateRange(records, dateRanges.current.start, dateRanges.current.end),
    [records, dateRanges.current]
  );
  const prevRecords = useMemo(() =>
    filterRecordsByDateRange(records, dateRanges.previous.start, dateRanges.previous.end),
    [records, dateRanges.previous]
  );

  const curr = useMemo(() => countHalfPeriodMetrics(currentRecords), [currentRecords]);
  const prev = useMemo(() => countHalfPeriodMetrics(prevRecords), [prevRecords]);

  const fullPeriod = useMemo(() => {
    const inbound = currentRecords.filter(r => isInbound(r.call_direction));
    const valid = inbound.filter(r => !isCorruptedTechnicalCall(r));
    const attended = valid.filter(r => r.attended);
    const avgConversationSec = attended.length > 0
      ? Math.round(attended.reduce((s, r) => s + (r.conversation_total_seconds ?? 0), 0) / attended.length)
      : 0;
    return {
      totalInbound:   kpis.totalCalls,
      queueCalls:     kpis.totalCalls - kpis.abandonStats.abandonedInIVR,
      executiveCalls: kpis.totalCalls - kpis.abandonStats.abandonedInIVR - kpis.abandonStats.abandonedInQueue,
      attendedCalls:  kpis.totalCalls - kpis.unattendedCount,
      abandonedCalls: kpis.abandonStats.abandonedInQueue + kpis.abandonStats.abandonedInAlert,
      avgQueueTimeSec:    Math.round(kpis.avgQueueTimeSeconds),
      avgAHTSec:          Math.round(kpis.avgHandleTimeSeconds),
      avgConversationSec,
    };
  }, [kpis, currentRecords]);

  const granularity = useMemo(() => {
    const startDate = new Date(dateRanges.current.start + 'T00:00:00');
    const endDate = new Date(dateRanges.current.end + 'T23:59:59');
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return getGranularity(Math.max(1, days));
  }, [dateRanges.current]);

  const compareLabel = useMemo(() => {
    const { start, end } = dateRanges.previous;
    const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    if (start === end) return `vs ${fmt(start)}`;
    const sDate = new Date(start + 'T00:00:00');
    const eDate = new Date(end + 'T00:00:00');
    if (sDate.getMonth() === eDate.getMonth()) {
      return `vs ${sDate.getDate()}-${fmt(end)}`;
    }
    return `vs ${fmt(start)} – ${fmt(end)}`;
  }, [dateRanges.previous]);

  const funnelData = useMemo(() => calcFunnelByGranularity(currentRecords, granularity), [currentRecords, granularity]);
  const outboundData = useMemo(() => calcOutboundByGranularity(currentRecords, granularity), [currentRecords, granularity]);

  const topQueues = useMemo(() => {
    const currQueueCounts = countQueueCalls(currentRecords);
    const prevQueueCounts = countQueueCalls(prevRecords);
    const hasPrevData = prevRecords.length > 0;
    return kpis.queueStats
      .filter(q => q.queue !== 'Sin cola')
      .slice(0, 8)
      .map(q => ({
        queue: q.queue,
        count: q.count,
        variation: hasPrevData
          ? changePct(currQueueCounts.get(q.queue) ?? 0, prevQueueCounts.get(q.queue) ?? 0)
          : null,
      }));
  }, [kpis.queueStats, currentRecords, prevRecords]);
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

  const tickInterval = getTickInterval(granularity, funnelData.length);
  const outboundTickInterval = getTickInterval(granularity, outboundData.length);

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
          value={fullPeriod.totalInbound.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.totalInbound, prev.totalInbound) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
          icon={Phone}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="Llamadas a Cola"
          value={fullPeriod.queueCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.queueCalls, prev.queueCalls) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
          icon={PhoneIncoming}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="Llamadas a Ejecutivo"
          value={fullPeriod.executiveCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.executiveCalls, prev.executiveCalls) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
          icon={Users}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="Llamadas Atendidas"
          value={fullPeriod.attendedCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.attendedCalls, prev.attendedCalls) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
          icon={Phone}
          iconColor={BICE_GREEN}
          iconBg="bg-green-50"
        />
        <KPICard
          label="Llamadas Abandonadas"
          value={fullPeriod.abandonedCalls.toLocaleString('es-CL')}
          change={hasPrev ? changePct(curr.abandonedCalls, prev.abandonedCalls) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
          invertedChange
          icon={PhoneOff}
          iconColor="#ef4444"
          iconBg="bg-red-50"
        />
        <KPICard
          label="Tiempo Cola Prom."
          value={fmtSecs(fullPeriod.avgQueueTimeSec)}
          change={hasPrev ? changePct(curr.avgQueueTimeSec, prev.avgQueueTimeSec) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
          invertedChange
          icon={Clock}
          iconColor={BICE_BLUE}
          iconBg="bg-blue-50"
        />
        <KPICard
          label="AHT Promedio"
          value={fmtSecs(fullPeriod.avgAHTSec)}
          change={hasPrev ? changePct(curr.avgAHTSec, prev.avgAHTSec) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
          invertedChange
          icon={Clock}
          iconColor="#7c3aed"
          iconBg="bg-purple-50"
        />
        <KPICard
          label="Tiempo Conversación Prom."
          value={fmtSecs(fullPeriod.avgConversationSec)}
          change={hasPrev ? changePct(curr.avgConversationSec, prev.avgConversationSec) : null}
          compareLabel={hasPrev ? compareLabel : undefined}
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
              <Bar dataKey="efectivos" name="Contactos Efectivos" fill={BICE_GREEN} stackId="outbound" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fallidos" name="Intentos Fallidos" fill={BICE_GRAY} stackId="outbound" radius={[3, 3, 0, 0]} />
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
          <p className="text-xs text-slate-400 mb-5">Volumen de demanda entrante que llegó a cada cola</p>
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
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className="font-bold text-slate-800">
                        {q.count.toLocaleString('es-CL')}
                      </span>
                      <ChangeBadge pct={q.variation} />
                    </div>
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
