// Telefono2 components — sidebar, filter bar, KPIs, hourly chart
const { useState, useMemo, useEffect, useRef } = React;
const { fmtDuration, fmtPct, fmtNum } = window.TELEFONO_DATA;

// =================== Sidebar ===================
function Sidebar({ section, onSection, recordCount, dateRange }) {
  const groups = [
    {
      label: 'Análisis',
      items: [
        { id: 'resumen', label: 'Resumen general' },
        { id: 'colas', label: 'Colas' },
        { id: 'ejecutivos', label: 'Ejecutivos' },
      ],
    },
    {
      label: 'Operación',
      items: [
        { id: 'planificacion', label: 'Planificación' },
        { id: 'conectividad', label: 'Conectividad' },
        { id: 'auditoria', label: 'Auditoría' },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="bice-bars lg" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </span>
        <div className="brand-text">
          <span className="brand-bice">BICE</span>
          <span className="brand-product">hipotecaria</span>
          <span className="brand-tag">Teléfono · Analytics</span>
        </div>
      </div>

      {groups.map(g => (
        <div className="nav-group" key={g.label}>
          <div className="nav-group-label">{g.label}</div>
          {g.items.map(it => (
            <button
              key={it.id}
              className={`nav-item ${section === it.id ? 'active' : ''}`}
              onClick={() => onSection(it.id)}
            >
              <span className="dot"></span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      ))}

      <div className="nav-spacer"></div>

      <div className="sidebar-foot">
        <div className="row"><span>Registros</span><strong className="num">{fmtNum(recordCount)}</strong></div>
        <div className="row"><span>Rango</span><strong>{dateRange}</strong></div>
        <div className="row"><span>Origen</span><strong>genesys.csv</strong></div>
      </div>
    </aside>
  );
}

// =================== Topbar ===================
function Topbar({ section, recordCount, dateRange }) {
  const titles = {
    resumen: 'Resumen general',
    colas: 'Análisis de colas',
    ejecutivos: 'Ejecutivos',
    planificacion: 'Planificación',
    conectividad: 'Conectividad de agentes',
    auditoria: 'Auditoría de datos',
  };
  const subs = {
    resumen: 'Service level, demanda y carga de red',
    colas: 'Telescopio: cola → hora → llamada',
    ejecutivos: 'Ocupación, AHT y rebote por agente',
    planificacion: 'Demanda Erlang-C e impacto de intervención',
    conectividad: 'Estado de agentes en tiempo de turno',
    auditoria: 'Calidad e integridad del dataset',
  };
  return (
    <div className="topbar">
      <div className="topbar-title">
        <div>
          <div className="crumb">{subs[section]}</div>
          <div className="h">{titles[section]}</div>
        </div>
      </div>
      <div className="dataset-bar">
        <div><strong>{fmtNum(recordCount)}</strong> registros</div>
        <div>·</div>
        <div>{dateRange}</div>
        <div>·</div>
        <div className="pill"><span className="dot"></span>Datos íntegros</div>
      </div>
    </div>
  );
}

// =================== Filter Bar ===================
function FilterBar({ filters, setFilters, queues, executives }) {
  const ranges = [
    { id: '5d', label: 'Últimos 5 días' },
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mes' },
    { id: 'custom', label: 'Personalizado' },
  ];
  const directions = [
    { id: 'all', label: 'Todas' },
    { id: 'inbound', label: 'Entrantes' },
    { id: 'outbound', label: 'Salientes' },
  ];
  return (
    <div className="filterbar">
      <span className="tiny" style={{ marginRight: 6 }}>Filtros</span>
      {ranges.map(r => (
        <button key={r.id}
          className={`filter-chip ${filters.range === r.id ? 'active' : ''}`}
          onClick={() => setFilters({ ...filters, range: r.id })}>
          {r.label}
        </button>
      ))}
      <div className="filter-divider"></div>
      {directions.map(d => (
        <button key={d.id}
          className={`filter-chip ${filters.direction === d.id ? 'active' : ''}`}
          onClick={() => setFilters({ ...filters, direction: d.id })}>
          {d.label}
        </button>
      ))}
      <div className="filter-divider"></div>
      <button className={`filter-chip ${filters.dept === 'CASANUESTRA' ? 'active' : ''}`}
        onClick={() => setFilters({ ...filters, dept: filters.dept === 'CASANUESTRA' ? null : 'CASANUESTRA' })}>
        CN <span className="label num">·</span> <span className="num">{queues.filter(q => q.dept === 'CASANUESTRA').length}</span>
      </button>
      <button className={`filter-chip ${filters.dept === 'BICEHIPOTECARIA' ? 'active' : ''}`}
        onClick={() => setFilters({ ...filters, dept: filters.dept === 'BICEHIPOTECARIA' ? null : 'BICEHIPOTECARIA' })}>
        BiceHipotecaria <span className="num">·</span> <span className="num">{queues.filter(q => q.dept === 'BICEHIPOTECARIA').length}</span>
      </button>
      <div style={{ flex: 1 }}></div>
      <span className="small muted">{fmtNum(filters.matchCount || 0)} coincidencias</span>
    </div>
  );
}

// =================== KPI Strip ===================
function KPIStrip({ kpis }) {
  const items = [
    { label: 'Service Level', value: fmtPct(kpis.sl, 1), sub: '≤ 20s · entrantes', delta: '+2.1pp', deltaPos: true },
    { label: 'Carga de red', value: kpis.erlangs.toFixed(1), unit: 'erl', sub: 'promedio horario', delta: '−0.4', deltaPos: true },
    { label: 'AHT', value: fmtDuration(kpis.aht), sub: 'duration + ACW + hold', delta: '+12s', deltaPos: false },
    { label: 'Tasa abandono', value: fmtPct(kpis.abandoned / Math.max(1, kpis.total), 1), sub: 'IVR · cola · alerta', delta: '+0.8pp', deltaPos: false },
  ];
  return (
    <div className="kpi-strip">
      {items.map(it => (
        <div key={it.label}>
          <div className="k-label">{it.label}</div>
          <div className="k-value">{it.value}{it.unit && <span className="k-unit">{it.unit}</span>}</div>
          <div className={`k-delta ${it.deltaPos ? 'pos' : 'neg'}`}>
            <span>{it.deltaPos ? '▲' : '▼'}</span>
            <span>{it.delta}</span>
            <span className="muted" style={{ color: 'var(--ink-3)' }}>vs. semana ant.</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// =================== Erlang Hero — tide chart ===================
function ErlangHero({ hourly }) {
  const w = 1100, h = 280, pad = { l: 56, r: 24, t: 30, b: 36 };
  const max = Math.max(...hourly.map(d => d.erlangs), 1) * 1.15;
  const xScale = i => pad.l + (i / (hourly.length - 1)) * (w - pad.l - pad.r);
  const yScale = v => pad.t + (1 - v / max) * (h - pad.t - pad.b);

  // Smooth path
  const points = hourly.map((d, i) => [xScale(i), yScale(d.erlangs)]);
  const linePath = points.reduce((acc, p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `${acc} L ${p[0]} ${p[1]}`, '');
  const fillPath = `${linePath} L ${pad.l + (w - pad.l - pad.r)} ${h - pad.b} L ${pad.l} ${h - pad.b} Z`;

  // Demand staffing curve (Erlang-C approx — agents needed for SL≥80%/20s)
  // Simple: agents = ceil(erlangs * 1.35 + 1)
  const staffPoints = hourly.map((d, i) => [xScale(i), yScale(d.erlangs * 1.35 + 1)]);
  const staffPath = staffPoints.reduce((acc, p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `${acc} L ${p[0]} ${p[1]}`, '');

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (i / ticks) * max);

  return (
    <div className="erlang-hero">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div>
          <div className="tiny" style={{ marginBottom: 6, color: 'var(--bice-cyan)' }}>Carga de red · Erlang-C</div>
          <h2>Demanda y dotación <em>por hora</em></h2>
          <div className="lead">
            Cada hora expresada en <strong style={{ color: 'var(--bice-blue)' }}>erlangs</strong> — el equivalente en agentes
            simultáneos necesarios para sostener el volumen de conversación. Línea sólida: carga observada.
            Línea punteada: dotación recomendada para nivel de servicio ≥ 80% en 20s.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
          <div>
            <div className="tiny">Pico</div>
            <div className="num" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{Math.max(...hourly.map(d => d.erlangs)).toFixed(1)}<span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-3)', marginLeft: 4 }}>erl</span></div>
          </div>
          <div>
            <div className="tiny">Promedio</div>
            <div className="num" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{(hourly.reduce((a, d) => a + d.erlangs, 0) / hourly.length).toFixed(1)}</div>
          </div>
          <div>
            <div className="tiny">Dotación max</div>
            <div className="num" style={{ fontSize: 24, letterSpacing: '-0.02em', color: 'var(--bice-cyan)' }}>{Math.ceil(Math.max(...hourly.map(d => d.erlangs * 1.35 + 1)))}<span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-3)', marginLeft: 4 }}>agentes</span></div>
          </div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="tide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#003A70" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#003A70" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={yScale(v)} x2={w - pad.r} y2={yScale(v)}
              stroke="#dde3eb" strokeDasharray={i === 0 ? '' : '2 4'} />
            <text x={pad.l - 10} y={yScale(v) + 3} textAnchor="end"
              fontFamily="var(--mono)" fontSize="10" fill="#5b6b7d">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {hourly.map((d, i) => (
          <text key={i} x={xScale(i)} y={h - pad.b + 16} textAnchor="middle"
            fontFamily="var(--mono)" fontSize="10" fill="#5b6b7d">
            {String(d.hour).padStart(2, '0')}h
          </text>
        ))}
        <path d={fillPath} fill="url(#tide)" />
        <path d={staffPath} fill="none" stroke="#00ABC8" strokeWidth="1.6" strokeDasharray="4 3" />
        <path d={linePath} fill="none" stroke="#003A70" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#ffffff" stroke="#003A70" strokeWidth="1.5" />
        ))}
        <text x={w - pad.r} y={pad.t - 8} textAnchor="end"
          fontFamily="var(--mono)" fontSize="10" fill="#5b6b7d">
          erlangs / hora
        </text>
      </svg>

      <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 2, background: 'var(--bice-blue)' }}></span> Carga observada
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 0, borderTop: '1.6px dashed var(--bice-cyan)' }}></span> Dotación recomendada
        </span>
      </div>
    </div>
  );
}

// =================== Hourly volume chart ===================
function HourlyChart({ hourly }) {
  const max = Math.max(...hourly.map(d => d.total));
  return (
    <div className="card">
      <div className="card-title">
        <div>
          <div className="tiny" style={{ marginBottom: 4 }}>Volumen horario</div>
          <div className="h">Distribución del día</div>
        </div>
        <div className="row small muted">
          <span className="row" style={{ gap: 4 }}>
            <span style={{ width: 10, height: 10, background: 'var(--bice-blue)', borderRadius: 2 }}></span> Atendidas
          </span>
          <span className="row" style={{ gap: 4 }}>
            <span style={{ width: 10, height: 10, background: 'var(--alert)', borderRadius: 2 }}></span> Abandono
          </span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hourly.length}, 1fr)`, gap: 4, alignItems: 'flex-end', height: 180 }}>
        {hourly.map(d => {
          const att = (d.attended / max) * 160;
          const ab = (d.abandoned / max) * 160;
          return (
            <div key={d.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 160 }}>
                {ab > 0 && <div style={{ height: ab, background: 'var(--alert)', borderTopLeftRadius: 2, borderTopRightRadius: 2 }}></div>}
                <div style={{ height: att, background: 'var(--bice-blue)', marginTop: 1 }}></div>
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 6 }}>
                {String(d.hour).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, FilterBar, KPIStrip, ErlangHero, HourlyChart });
