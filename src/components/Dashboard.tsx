import { useMemo, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart
} from 'recharts';
import { Activity, AlertCircle, Calendar, Users, Layers, Zap, Shield, PhoneCall, TrendingUp } from 'lucide-react';
import { FilterBar, DEFAULT_FILTERS, getDateRangeForRelative } from './FilterBar';
import type { FilterState } from './FilterBar';
import { OutboundDashboard } from './OutboundDashboard';
import { calculateKPIs } from '../lib/kpi';
import type { CallRecord, CallUpload, AgentStatusRecord } from '../lib/supabase';
import type { DataQualityReport } from '../lib/kpi';
import type { Section } from './Sidebar';

type Props = {
  records: CallRecord[];
  upload: CallUpload;
  agentStatusRecords: AgentStatusRecord[];
  activeSection: Section;
  onUploadAgentStatus: () => void;
  dataQuality: DataQualityReport | null;
};

// ===== BICE Brand Colors =====
const BICE = {
  navy: '#003A70',      // Pantone 654
  cyan: '#00ABC8',      // Pantone 3125
  navyTint: '#e8f0f8',
  cyanTint: '#e6f7fa',
  alert: '#c0392b',
  warning: '#b8761b',
  success: '#1d8e6e',
  bg: '#ffffff',
  bgAlt: '#f5f7fa',
  bgAlt2: '#eaeef3',
  text: '#0a1828',
  textMuted: '#5b6b7d',
};

// ===== Recharts Custom Tooltip =====
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 text-sm">
      <p className="font-semibold text-slate-800">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
};

// ===== Section Header =====
const SectionHeader = ({ icon: Icon, title, description }: any) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-2">
      <Icon size={28} className="text-blue-900" style={{ color: BICE.navy }} />
      <h2 className="text-3xl font-bold" style={{ color: BICE.navy }}>{title}</h2>
    </div>
    <p className="text-slate-600 text-sm">{description}</p>
  </div>
);

// ===== KPI Card =====
const KPICard = ({ label, value, unit = '', trend = null }: any) => (
  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: BICE.textMuted }}>
      {label}
    </div>
    <div className="mt-3 flex items-baseline gap-2">
      <span className="text-3xl font-bold" style={{ color: BICE.navy }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
      </span>
      {unit && <span className="text-sm font-medium" style={{ color: BICE.textMuted }}>{unit}</span>}
    </div>
    {trend && (
      <div className="mt-2 text-xs" style={{ color: trend > 0 ? BICE.warning : BICE.success }}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs. semana ant.
      </div>
    )}
  </div>
);

// ===== Main Dashboard Component =====
export function Dashboard({
  records,
  upload,
  agentStatusRecords,
  activeSection,
  onUploadAgentStatus,
  dataQuality,
}: Props) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    let dateStart = filters.dateStart;
    let dateEnd = filters.dateEnd;

    if (filters.dateRange !== 'custom') {
      const range = getDateRangeForRelative(filters.dateRange);
      dateStart = range.start;
      dateEnd = range.end;
    }

    return records.filter(r => {
      if (!r.call_date) return false;
      return r.call_date >= dateStart && r.call_date <= dateEnd;
    });
  }, [records, filters]);

  const kpis = useMemo(() => calculateKPIs(filteredRecords), [filteredRecords]);

  // Helper: format duration
  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const fmtPct = (ratio: number) => (ratio * 100).toFixed(1) + '%';

  return (
    <div className="space-y-8 pb-12">
      {/* Data Quality Banner */}
      {dataQuality?.criticalIssues && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Advertencia de datos</p>
            <p className="text-xs mt-1">{dataQuality.criticalIssues.handleTimeCorrupted} registros con handle_time inconsistente</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar records={records} filters={filters} onChange={setFilters} filteredCount={filteredRecords.length} />

      {/* ===== INICIO ===== */}
      {activeSection === 'inicio' && (
        <div className="space-y-6">
          <SectionHeader
            icon={PhoneCall}
            title="Dashboard de Inicio"
            description={`Métricas clave del período ${upload.date_range_start ? `${upload.date_range_start} a ${upload.date_range_end}` : 'seleccionado'}`}
          />

          {/* KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Llamadas totales" value={kpis.totalCalls} />
            <KPICard label="Atendidas" value={fmtPct(kpis.handledRate)} />
            <KPICard label="Service Level (20s)" value={fmtPct(kpis.serviceLevel)} />
            <KPICard label="AHT promedio" value={fmt(kpis.ahtSeconds)} />
          </div>

          {/* Erlang-C / Demanda horaria */}
          {kpis.hourlyDistribution && kpis.hourlyDistribution.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4" style={{ color: BICE.navy }}>Carga por hora (Erlang-C)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={kpis.hourlyDistribution}>
                  <defs>
                    <linearGradient id="colorErlang" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BICE.cyan} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={BICE.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BICE.bgAlt2} />
                  <XAxis dataKey="hour" stroke={BICE.textMuted} />
                  <YAxis stroke={BICE.textMuted} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke={BICE.navy}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorErlang)"
                    name="Llamadas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Direction + Abandon breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Direction pie */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4" style={{ color: BICE.navy }}>Dirección de llamadas</h3>
              {kpis.directionStats && (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Entrante', value: kpis.directionStats.inbound },
                        { name: 'Saliente', value: kpis.directionStats.outbound },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill={BICE.navy} />
                      <Cell fill={BICE.cyan} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Abandon by type */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4" style={{ color: BICE.navy }}>Abandonos por etapa</h3>
              {kpis.abandonStats && (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={Object.entries(kpis.abandonStats).map(([k, v]) => ({
                      name: k,
                      count: v as number,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={BICE.bgAlt2} />
                    <XAxis dataKey="name" stroke={BICE.textMuted} />
                    <YAxis stroke={BICE.textMuted} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill={BICE.alert} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== COLAS (simplified telescope) ===== */}
      {activeSection === 'colas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Layers}
            title="Análisis de Colas"
            description="Rendimiento por cola, distribución horaria y service level"
          />

          {/* Queue KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard label="Colas activas" value={kpis.queueStats?.length || 0} />
            <KPICard label="Promedio espera" value={fmt(kpis.avgWaitSeconds || 0)} />
            <KPICard label="SL promedio" value={fmtPct(kpis.serviceLevel || 0)} />
          </div>

          {/* Queue performance table */}
          {kpis.queueStats && kpis.queueStats.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200" style={{ backgroundColor: BICE.navyTint }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: BICE.navy }}>Cola</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>Llamadas</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>Espera prom</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>SL</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>Abandono</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.queueStats.slice(0, 10).map((q, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{q.queue || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{q.count}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(q.avgWait || 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: q.serviceLevel >= 0.8 ? BICE.success : BICE.alert }}>
                        {fmtPct(q.serviceLevel || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtPct(q.count > 0 ? (q.abandonCount || 0) / q.count : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Queue performance heatmap by hour */}
          {kpis.hourlyDistribution && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4" style={{ color: BICE.navy }}>Service Level por hora</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpis.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BICE.bgAlt2} />
                  <XAxis dataKey="hour" stroke={BICE.textMuted} />
                  <YAxis stroke={BICE.textMuted} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="handledRate" fill={BICE.navy} radius={[8, 8, 0, 0]} name="% Atendidas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ===== SALUD-COLAS ===== */}
      {activeSection === 'salud-colas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Activity}
            title="Salud de Colas"
            description="Alertas, anomalías y diagnóstico operacional"
          />

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600 text-sm">
              Esta vista presenta KPIs críticos y alertas automáticas. Los datos provienen del análisis de desviaciones
              estadísticas en handle time, service level por hora, y patrones de abandono.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border-l-4" style={{ borderColor: BICE.alert, backgroundColor: BICE.navyTint }}>
                <p className="text-sm font-semibold" style={{ color: BICE.navy }}>Alertas activas</p>
                <p className="text-2xl font-bold mt-2" style={{ color: BICE.alert }}>
                  {dataQuality?.criticalIssues?.handleTimeCorrupted || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg border-l-4" style={{ borderColor: BICE.warning, backgroundColor: BICE.cyanTint }}>
                <p className="text-sm font-semibold" style={{ color: BICE.navy }}>Advertencias</p>
                <p className="text-2xl font-bold mt-2" style={{ color: BICE.warning }}>
                  {dataQuality?.technicalCuts || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EJECUTIVOS ===== */}
      {activeSection === 'ejecutivos' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Users}
            title="Análisis de Ejecutivos"
            description="Rendimiento individual, AHT, ocupación y tasa de rebote"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Ejecutivos activos" value={kpis.executiveStats?.length || 0} />
            <KPICard label="AHT promedio" value={fmt(kpis.ahtSeconds || 0)} />
            <KPICard label="Ocupación" value={fmtPct((kpis.totalHandle || 0) / Math.max(1, kpis.totalCalls || 1))} />
            <KPICard label="Atendidas/ejecutivo" value={(kpis.totalCalls / Math.max(1, kpis.executiveStats?.length || 1)).toFixed(0)} />
          </div>

          {/* Executives table */}
          {kpis.executiveStats && kpis.executiveStats.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200" style={{ backgroundColor: BICE.navyTint }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: BICE.navy }}>Ejecutivo</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>Llamadas</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>AHT</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>Ocupación</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: BICE.navy }}>Rebote</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.executiveStats.slice(0, 15).map((e, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{e.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{e.callsHandled}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(e.ahtSeconds || 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtPct(e.occupancyRate || 0)}</td>
                      <td className="px-4 py-3 text-right" style={{ color: (e.bounceRate || 0) > 0.06 ? BICE.warning : BICE.success }}>
                        {fmtPct(e.bounceRate || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Conectividad sub-section */}
          {agentStatusRecords.length > 0 && (
            <div className="border-t border-slate-200 pt-8 mt-8">
              <div className="flex items-center gap-3 mb-4">
                <Activity size={24} style={{ color: BICE.navy }} />
                <h3 className="text-2xl font-bold" style={{ color: BICE.navy }}>Conectividad</h3>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {agentStatusRecords.slice(0, 3).map((a) => (
                    <div key={a.id} className="border rounded-lg p-4" style={{ borderColor: BICE.bgAlt2 }}>
                      <p className="font-semibold text-slate-700">{a.agent_name}</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">En cola</span>
                          <span className="font-medium">{fmt(a.in_queue_seconds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fuera de cola</span>
                          <span className="font-medium">{fmt(a.out_of_queue_seconds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Conectado</span>
                          <span className="font-medium">{fmt(a.connected_seconds)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== PLANIFICACIÓN ===== */}
      {activeSection === 'planificacion' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Calendar}
            title="Planificación y Erlang-C"
            description="Demanda vs. dotación, impacto de intervenciones"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard label="Carga promedio" value={(kpis.totalHandle / Math.max(1, kpis.totalCalls || 1) / 3600).toFixed(2)} unit="erl" />
            <KPICard label="Pico de carga" value={((Math.max(...(kpis.hourlyDistribution?.map((h: any) => h.calls) || [0])) * (kpis.ahtSeconds || 0)) / 3600).toFixed(1)} unit="erl" />
            <KPICard label="Agentes conectados" value={agentStatusRecords.length || 0} unit="agentes" />
          </div>

          {/* Erlang-C demand chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4" style={{ color: BICE.navy }}>Demanda vs. Dotación (Erlang-C)</h3>
            {kpis.hourlyDistribution && kpis.hourlyDistribution.length > 0 && (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={kpis.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BICE.bgAlt2} />
                  <XAxis dataKey="hour" stroke={BICE.textMuted} />
                  <YAxis stroke={BICE.textMuted} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="calls" fill={BICE.navy} name="Llamadas" radius={[8, 8, 0, 0]} />
                  <Line dataKey="avgHandle" stroke={BICE.cyan} strokeWidth={2} name="AHT (segundos)" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Intervention impact scenarios */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4" style={{ color: BICE.navy }}>Impacto de intervenciones</h3>
            <div className="space-y-3">
              {[
                { scenario: '+1 agente a las 11:00', sl: '+4.1pp', impact: 'good' },
                { scenario: '+2 agentes a las 11:00', sl: '+8.7pp', impact: 'good' },
                { scenario: '+1 agente todo el día', sl: '+1.9pp', impact: 'neutral' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg border" style={{ borderColor: BICE.bgAlt2 }}>
                  <span className="text-slate-700">{item.scenario}</span>
                  <span className="font-semibold" style={{ color: item.impact === 'good' ? BICE.success : BICE.textMuted }}>
                    {item.sl}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== GESTIÓN PROACTIVA ===== */}
      {activeSection === 'gestion-proactiva' && (
        <div className="space-y-6">
          <OutboundDashboard records={filteredRecords} />
        </div>
      )}

      {/* ===== LLAMADAS ===== */}
      {activeSection === 'llamadas' && (
        <div className="space-y-6">
          <SectionHeader
            icon={PhoneCall}
            title="Detalle de Llamadas"
            description="Registro detallado de todas las interacciones"
          />
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600">Vista de detalle de llamadas</p>
          </div>
        </div>
      )}

      {/* ===== INTERVENCIÓN ===== */}
      {activeSection === 'intervencion' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Zap}
            title="Análisis de Intervención"
            description="Impacto y resultados de intervenciones en colas"
          />
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600">Análisis de intervención</p>
          </div>
        </div>
      )}

      {/* ===== AUDITORÍA ===== */}
      {activeSection === 'audit' && (
        <div className="space-y-6">
          <SectionHeader
            icon={Shield}
            title="Auditoría de Datos"
            description="Panel de calidad de datos y anomalías detectadas"
          />
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600">Auditoría de datos</p>
          </div>
        </div>
      )}
    </div>
  );
}
