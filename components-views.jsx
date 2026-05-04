// Telefono2 — view components: Resumen, Colas (telescope), Ejecutivos, Planificación, Conectividad, Auditoría
const { fmtDuration: fd, fmtPct: fp, fmtNum: fn } = window.TELEFONO_DATA;

// =================== Resumen ===================
function ResumenView({ records, kpis, hourly, queueStats, execStats }) {
  return (
    <div className="section section-stack section-enter">
      <KPIStrip kpis={kpis} />
      <ErlangHero hourly={hourly} />

      <div className="grid-2">
        <HourlyChart hourly={hourly} />
        <div className="card">
          <div className="card-title">
            <div>
              <div className="tiny" style={{ marginBottom: 4 }}>Top colas</div>
              <div className="h">Por volumen</div>
            </div>
          </div>
          <table className="tbl">
            <thead><tr>
              <th>Cola</th><th className="r">Llamadas</th><th className="r">SL</th><th>Reparto</th>
            </tr></thead>
            <tbody>
              {queueStats.slice(0, 6).map(q => (
                <tr key={q.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{q.label}</div>
                    <div className="tiny" style={{ marginTop: 2 }}>{q.dept}</div>
                  </td>
                  <td className="r num">{fn(q.total)}</td>
                  <td className="r num">
                    <span className={`badge ${q.sl >= 0.8 ? 'good' : q.sl >= 0.6 ? 'warn' : 'alert'}`}>
                      {fp(q.sl, 0)}
                    </span>
                  </td>
                  <td style={{ width: 140 }}>
                    <div className="bar-wrap">
                      <div className="bar-track">
                        <div className="bar-fill ink" style={{ width: `${(q.total / queueStats[0].total) * 100}%` }}></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-3">
        <DirectionStat records={records} />
        <AbandonBreakdown records={records} />
        <BounceStat execStats={execStats} />
      </div>
    </div>
  );
}

function DirectionStat({ records }) {
  const inbound = records.filter(r => r.call_direction === 'inbound').length;
  const outbound = records.length - inbound;
  const inP = inbound / records.length;
  return (
    <div className="card">
      <div className="tiny">Dirección</div>
      <div className="h" style={{ fontSize: 22, marginTop: 4, marginBottom: 14 }}>Inbound vs outbound</div>
      <div style={{ display: 'flex', height: 8, borderRadius: 100, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${inP * 100}%`, background: 'var(--bice-blue)' }}></div>
        <div style={{ width: `${(1 - inP) * 100}%`, background: 'var(--bice-cyan)' }}></div>
      </div>
      <div className="row between"><span><span style={{ width: 8, height: 8, background: 'var(--bice-blue)', display: 'inline-block', borderRadius: 2, marginRight: 6 }}></span>Entrantes</span><span className="num">{fn(inbound)} · {fp(inP, 0)}</span></div>
      <div className="row between" style={{ marginTop: 6 }}><span><span style={{ width: 8, height: 8, background: 'var(--bice-cyan)', display: 'inline-block', borderRadius: 2, marginRight: 6 }}></span>Salientes</span><span className="num">{fn(outbound)} · {fp(1 - inP, 0)}</span></div>
    </div>
  );
}

function AbandonBreakdown({ records }) {
  const ab = records.filter(r => r.abandoned);
  const types = ['IVR', 'COLA', 'ALERTA'];
  const counts = types.map(t => ({ t, n: ab.filter(r => r.abandon_type === t).length }));
  const total = Math.max(1, counts.reduce((a, c) => a + c.n, 0));
  return (
    <div className="card">
      <div className="tiny">Abandono</div>
      <div className="h" style={{ fontSize: 22, marginTop: 4, marginBottom: 14 }}>Por etapa</div>
      {counts.map(c => (
        <div key={c.t} style={{ marginBottom: 10 }}>
          <div className="row between small" style={{ marginBottom: 4 }}>
            <span>{c.t}</span><span className="num muted">{fn(c.n)} · {fp(c.n / total, 0)}</span>
          </div>
          <div className="bar-track"><div className="bar-fill alert" style={{ width: `${(c.n / total) * 100}%` }}></div></div>
        </div>
      ))}
    </div>
  );
}

function BounceStat({ execStats }) {
  const top = [...execStats].sort((a, b) => b.bounceRate - a.bounceRate).slice(0, 5);
  return (
    <div className="card">
      <div className="tiny">Rebote</div>
      <div className="h" style={{ fontSize: 22, marginTop: 4, marginBottom: 14 }}>Mayores rebotes</div>
      {top.map(e => (
        <div key={e.name} style={{ marginBottom: 8 }}>
          <div className="row between small" style={{ marginBottom: 3 }}>
            <span>{e.name}</span><span className="num muted">{fp(e.bounceRate, 1)}</span>
          </div>
          <div className="bar-track"><div className="bar-fill warn" style={{ width: `${Math.min(1, e.bounceRate * 6) * 100}%` }}></div></div>
        </div>
      ))}
    </div>
  );
}

// =================== Colas — Telescope drilldown ===================
function ColasView({ records, queueStats }) {
  const [queueId, setQueueId] = React.useState(queueStats[0]?.id);
  const [hour, setHour] = React.useState(null);

  const hourBreakdown = React.useMemo(() => {
    if (!queueId) return [];
    const buckets = {};
    for (let h = 8; h < 19; h++) buckets[h] = { hour: h, total: 0, attended: 0, abandoned: 0, calls: [] };
    for (const r of records) {
      if (r.queue !== queueId) continue;
      const b = buckets[r.call_hour];
      if (!b) continue;
      b.total++;
      if (r.attended) b.attended++;
      if (r.abandoned) b.abandoned++;
      b.calls.push(r);
    }
    return Object.values(buckets);
  }, [queueId, records]);

  const calls = React.useMemo(() => {
    if (hour === null) return [];
    const b = hourBreakdown.find(h => h.hour === hour);
    return b ? b.calls.slice(0, 50) : [];
  }, [hour, hourBreakdown]);

  React.useEffect(() => { setHour(null); }, [queueId]);

  const selectedQueue = queueStats.find(q => q.id === queueId);

  return (
    <div className="section section-stack section-enter">
      <div>
        <div className="tiny" style={{ marginBottom: 6 }}>Telescopio</div>
        <h2  style={{ fontSize: 30, fontStyle: 'italic', margin: 0, letterSpacing: '-0.02em' }}>
          Cola → Hora → Llamada
        </h2>
        <p className="muted small" style={{ maxWidth: 620, marginTop: 4 }}>
          Selecciona una cola para abrir su distribución horaria. Selecciona una hora para inspeccionar las llamadas individuales.
        </p>
      </div>

      <div className="telescope">
        {/* Pane 1: Queues */}
        <div className="telescope-pane">
          <h3>Colas</h3>
          <div className="scope">{queueStats.length} activas · ordenadas por volumen</div>
          <div className="telescope-list">
            {queueStats.map(q => (
              <div key={q.id} className={`row ${queueId === q.id ? 'active' : ''}`}
                onClick={() => setQueueId(q.id)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{q.label}</div>
                  <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                    {q.dept} · SL {fp(q.sl, 0)}
                  </div>
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>{fn(q.total)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pane 2: Hours */}
        <div className="telescope-pane">
          <h3>Horario</h3>
          <div className="scope">
            {selectedQueue ? `${selectedQueue.label} · ${fn(selectedQueue.total)} llamadas` : '—'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {hourBreakdown.map(b => {
              const max = Math.max(...hourBreakdown.map(x => x.total), 1);
              return (
                <div key={b.hour}
                  onClick={() => b.total && setHour(b.hour)}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 60px',
                    alignItems: 'center', gap: 10,
                    padding: '6px 8px', borderRadius: 'var(--r)', cursor: b.total ? 'pointer' : 'default',
                    background: hour === b.hour ? 'var(--bice-blue)' : 'transparent',
                    color: hour === b.hour ? 'var(--bg)' : 'var(--ink)',
                  }}>
                  <span className="num" style={{ fontSize: 12, color: hour === b.hour ? 'var(--bg)' : 'var(--ink-3)' }}>
                    {String(b.hour).padStart(2, '0')}h
                  </span>
                  <div style={{ display: 'flex', height: 14, borderRadius: 2, overflow: 'hidden', background: hour === b.hour ? 'rgba(255,255,255,0.18)' : 'var(--bg-3)' }}>
                    <div style={{ width: `${(b.attended / max) * 100}%`, background: hour === b.hour ? 'var(--bice-cyan)' : 'var(--bice-blue)' }}></div>
                    <div style={{ width: `${(b.abandoned / max) * 100}%`, background: 'var(--alert)' }}></div>
                  </div>
                  <span className="num" style={{ fontSize: 11, textAlign: 'right' }}>{b.total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pane 3: Calls */}
        <div className="telescope-pane">
          <h3>Llamadas</h3>
          <div className="scope">
            {hour !== null
              ? `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00 · ${calls.length} mostradas`
              : 'Selecciona una hora'}
          </div>
          {hour === null ? (
            <div className="empty-pane">
              <span className="bice-bars xl" style={{ color: 'var(--bg-4)' }}><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span><div>Selecciona una hora<br/>para ver el detalle</div>
            </div>
          ) : (
            <div className="telescope-list" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
              {calls.map(c => (
                <div key={c.id} className="row" style={{ padding: '6px 8px' }}>
                  <div>
                    <div style={{ color: 'var(--ink)' }}>
                      <span style={{ color: 'var(--ink-3)' }}>{c.call_time}</span>{' '}
                      {c.ani_masked}
                    </div>
                    <div style={{ color: 'var(--ink-3)', fontSize: 10, marginTop: 2 }}>
                      {c.executive} · {c.attended ? 'atendida' : `aband. ${c.abandon_type}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ color: 'var(--ink)' }}>{fd(c.duration_seconds)}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>espera {c.queue_time_seconds}s</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <QueueHeatmap records={records} queueStats={queueStats} onPick={(q, h) => { setQueueId(q); setHour(h); }} />
    </div>
  );
}

function QueueHeatmap({ records, queueStats, onPick }) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const matrix = React.useMemo(() => {
    const m = {};
    for (const q of queueStats) {
      m[q.id] = {};
      for (const h of hours) m[q.id][h] = { total: 0, attended: 0 };
    }
    for (const r of records) {
      if (!m[r.queue] || !m[r.queue][r.call_hour]) continue;
      m[r.queue][r.call_hour].total++;
      if (r.attended) m[r.queue][r.call_hour].attended++;
    }
    return m;
  }, [records, queueStats]);

  const cellColor = (sl, total) => {
    if (!total) return '#f5f7fa';
    // sl 0..1 → red→amber→teal
    if (sl >= 0.85) return `rgba(0, 171, 200, ${0.18 + (sl - 0.85) * 4})`;
    if (sl >= 0.6) return `rgba(184, 118, 27, ${0.12 + (sl - 0.6) * 0.4})`;
    return `rgba(192, 57, 43, ${0.14 + (1 - sl) * 0.4})`;
  };

  return (
    <div className="card">
      <div className="card-title">
        <div>
          <div className="tiny" style={{ marginBottom: 4 }}>Heatmap</div>
          <div className="h">Atención por cola y hora</div>
        </div>
        <div className="row small muted" style={{ gap: 8 }}>
          <span>SL bajo</span>
          <span style={{ width: 90, height: 10, background: 'linear-gradient(90deg, rgba(192,57,43,0.45), rgba(184,118,27,0.45), rgba(0,171,200,0.65))' }}></span>
          <span>alto</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(${hours.length}, 1fr)`, gap: 2 }}>
        <div></div>
        {hours.map(h => (
          <div key={h} className="hm-axis-x">{String(h).padStart(2, '0')}</div>
        ))}
        {queueStats.map(q => (
          <React.Fragment key={q.id}>
            <div className="hm-axis-y" style={{ justifyContent: 'flex-start', paddingRight: 8, fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>
              {q.label}
            </div>
            {hours.map(h => {
              const cell = matrix[q.id][h];
              const sl = cell.total ? cell.attended / cell.total : 0;
              return (
                <div key={h} className="hm-cell"
                  onClick={() => cell.total && onPick(q.id, h)}
                  style={{ background: cellColor(sl, cell.total), aspectRatio: 'auto', height: 32 }}
                  title={`${q.label} · ${h}h · ${cell.total} llamadas · SL ${(sl*100).toFixed(0)}%`}>
                  {cell.total > 0 && cell.total}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// =================== Ejecutivos ===================
function EjecutivosView({ execStats }) {
  const [sortBy, setSortBy] = React.useState('attended');
  const sorted = [...execStats].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="section section-stack section-enter">
      <div className="grid-3">
        <div className="card">
          <div className="tiny">Ejecutivos activos</div>
          <div className="num" style={{ fontSize: 36, letterSpacing: '-0.02em', marginTop: 6 }}>{execStats.length}</div>
          <div className="small muted">en los últimos 5 días</div>
        </div>
        <div className="card">
          <div className="tiny">AHT promedio</div>
          <div className="num" style={{ fontSize: 36, letterSpacing: '-0.02em', marginTop: 6 }}>
            {fd(execStats.reduce((a, e) => a + e.aht * e.attended, 0) / Math.max(1, execStats.reduce((a, e) => a + e.attended, 0)))}
          </div>
          <div className="small muted">por llamada atendida</div>
        </div>
        <div className="card">
          <div className="tiny">Ocupación promedio</div>
          <div className="num" style={{ fontSize: 36, letterSpacing: '-0.02em', marginTop: 6 }}>
            {fp(execStats.reduce((a, e) => a + e.occupancy, 0) / execStats.length, 0)}
          </div>
          <div className="small muted">tiempo en llamada / turno</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <div>
            <div className="tiny" style={{ marginBottom: 4 }}>Detalle</div>
            <div className="h">Rendimiento por ejecutivo</div>
          </div>
          <div className="row small muted">
            Ordenar:
            {['attended', 'aht', 'occupancy', 'bounceRate'].map(k => (
              <button key={k}
                className={`filter-chip ${sortBy === k ? 'active' : ''}`}
                onClick={() => setSortBy(k)}>
                {k === 'attended' ? 'Atendidas' : k === 'aht' ? 'AHT' : k === 'occupancy' ? 'Ocupación' : 'Rebote'}
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>Ejecutivo</th>
            <th className="r">Atendidas</th>
            <th className="r">AHT</th>
            <th>Ocupación</th>
            <th className="r">Rebote</th>
          </tr></thead>
          <tbody>
            {sorted.map(e => (
              <tr key={e.name}>
                <td style={{ fontWeight: 500 }}>{e.name}</td>
                <td className="r num">{fn(e.attended)}</td>
                <td className="r num">{fd(e.aht)}</td>
                <td style={{ width: 220 }}>
                  <div className="bar-wrap">
                    <div className="bar-track"><div className="bar-fill ink" style={{ width: `${e.occupancy * 100}%` }}></div></div>
                    <span className="num" style={{ minWidth: 38, textAlign: 'right', fontSize: 11 }}>{fp(e.occupancy, 0)}</span>
                  </div>
                </td>
                <td className="r num">
                  <span className={`badge ${e.bounceRate > 0.06 ? 'warn' : ''}`}>{fp(e.bounceRate, 1)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================== Planificación ===================
function PlanificacionView({ hourly, kpis }) {
  const [agents, setAgents] = React.useState(12);
  // Demand vs supply
  return (
    <div className="section section-stack section-enter">
      <div className="card card-pad-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <div>
            <div className="tiny">Erlang-C · dimensionamiento</div>
            <div className="h" style={{ fontSize: 26 }}>Demanda vs. dotación</div>
            <div className="small muted" style={{ maxWidth: 540, marginTop: 4 }}>
              Mueve el control para simular la dotación asignada y verificar en qué franjas el equipo queda corto o holgado.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny">Dotación simulada</div>
            <div className="num" style={{ fontSize: 32, letterSpacing: '-0.02em', color: 'var(--bice-cyan)' }}>{agents}</div>
            <input type="range" min="4" max="24" value={agents} onChange={e => setAgents(+e.target.value)}
              style={{ width: 220, accentColor: 'var(--bice-cyan)' }} />
          </div>
        </div>
        <DemandChart hourly={hourly} agents={agents} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="tiny">Impacto de intervención</div>
          <div className="h" style={{ fontSize: 22, marginTop: 4, marginBottom: 12 }}>Si subes la dotación en hora pico</div>
          {[
            { label: '+1 agente · 11h', delta: '+4.1pp SL', tone: 'good' },
            { label: '+2 agentes · 11h', delta: '+8.7pp SL', tone: 'good' },
            { label: '+1 agente · 16h', delta: '+3.6pp SL', tone: 'good' },
            { label: '+1 agente · todo el día', delta: '+1.9pp SL', tone: 'accent' },
          ].map(it => (
            <div key={it.label} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{it.label}</span>
              <span className={`badge ${it.tone}`}>{it.delta}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="tiny">Carga total</div>
          <div className="h" style={{ fontSize: 22, marginTop: 4, marginBottom: 12 }}>En la ventana 5 días</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Stat label="Tiempo total en llamada" value={fd(kpis.totalHandle)} />
            <Stat label="Erlang promedio" value={kpis.erlangs.toFixed(2) + ' erl'} />
            <Stat label="Pico de erlangs" value={Math.max(...hourly.map(h => h.erlangs)).toFixed(1) + ' erl'} />
            <Stat label="Hora más cargada" value={hourly.reduce((a, h) => h.erlangs > a.erlangs ? h : a).hour + ':00'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
      <span className="muted small">{label}</span>
      <span className="num" style={{ fontSize: 16 }}>{value}</span>
    </div>
  );
}

function DemandChart({ hourly, agents }) {
  const w = 1000, h = 220, pad = { l: 50, r: 16, t: 16, b: 30 };
  const demand = hourly.map(d => d.erlangs * 1.35 + 1);
  const max = Math.max(...demand, agents) * 1.15;
  const x = i => pad.l + (i / (hourly.length - 1)) * (w - pad.l - pad.r);
  const y = v => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* supply line */}
      <line x1={pad.l} x2={w - pad.r} y1={y(agents)} y2={y(agents)}
        stroke="#00ABC8" strokeWidth="1.6" strokeDasharray="4 4" />
      <text x={w - pad.r} y={y(agents) - 4} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="#00ABC8">
        dotación = {agents}
      </text>
      {/* deficit/surplus bars */}
      {hourly.map((d, i) => {
        const dem = demand[i];
        const isDeficit = dem > agents;
        const cy = isDeficit ? y(dem) : y(agents);
        const ch = Math.abs(y(dem) - y(agents));
        const cw = (w - pad.l - pad.r) / hourly.length * 0.75;
        return (
          <rect key={i} x={x(i) - cw / 2} y={cy} width={cw} height={ch}
            fill={isDeficit ? '#fbe7e3' : '#e3f4ee'}
            opacity="0.7" />
        );
      })}
      {/* demand line */}
      <path d={hourly.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(demand[i])}`).join(' ')}
        fill="none" stroke="#003A70" strokeWidth="2.2" />
      {hourly.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(demand[i])} r="3" fill="var(--bg)" stroke="#003A70" strokeWidth="1.5" />
          <text x={x(i)} y={h - pad.b + 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#5b6b7d">
            {String(d.hour).padStart(2, '0')}
          </text>
        </g>
      ))}
    </svg>
  );
}

// =================== Conectividad ===================
function ConectividadView({ execStats }) {
  return (
    <div className="section section-stack section-enter">
      <div className="card">
        <div className="card-title">
          <div>
            <div className="tiny">Conectividad</div>
            <div className="h">Estado de agentes en el turno</div>
          </div>
          <span className="badge accent"><span className="dot"></span>Datos sintéticos</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {execStats.slice(0, 12).map((e, i) => {
            const inQueue = 0.55 + (i % 7) * 0.04;
            const outQueue = 0.18 + (i % 5) * 0.03;
            const offline = 1 - inQueue - outQueue;
            const occupancy = e.occupancy;
            return (
              <div key={e.name} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px', gap: 16, alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</div>
                <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${inQueue * 100}%`, background: 'var(--bice-blue)', display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#ffffff', fontSize: 10, fontFamily: 'var(--mono)' }}>
                    en cola {fp(inQueue, 0)}
                  </div>
                  <div style={{ width: `${outQueue * 100}%`, background: 'var(--bice-cyan)', display: 'flex', alignItems: 'center', paddingLeft: 6, color: '#ffffff', fontSize: 10, fontFamily: 'var(--mono)' }}>
                    fuera {fp(outQueue, 0)}
                  </div>
                  <div style={{ width: `${offline * 100}%`, background: 'var(--bg-3)' }}></div>
                </div>
                <div className="num" style={{ textAlign: 'right', fontSize: 12 }}>
                  ocup {fp(occupancy, 0)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 18, fontSize: 11, color: 'var(--ink-3)', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: 'var(--bice-blue)' }}></span>En la cola — disponible para llamados</span>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: 'var(--bice-cyan)' }}></span>Fuera de la cola — otras gestiones</span>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: 'var(--bg-3)', border: '1px solid var(--line)' }}></span>Desconectado</span>
        </div>
      </div>
    </div>
  );
}

// =================== Auditoría ===================
function AuditoriaView({ records }) {
  const checks = [
    { label: 'Registros totales', value: fn(records.length), tone: 'good', detail: 'todos los registros del periodo' },
    { label: 'handle_time corrupto', value: '0', tone: 'good', detail: 'duration + ACW + hold consistente' },
    { label: 'Cortes técnicos (1–5s)', value: '14', tone: 'warn', detail: 'llamadas atendidas con duration < 5s' },
    { label: 'Salientes con queue_time', value: '2', tone: 'warn', detail: 'inconsistencia en clasificación' },
    { label: 'Llamadas superpuestas', value: '0', tone: 'good', detail: 'mismo agente, mismo timestamp' },
    { label: 'Abandonos sin clasificar', value: '0', tone: 'good', detail: 'tipo IVR / cola / alerta asignado' },
  ];
  return (
    <div className="section section-stack section-enter">
      <div className="card">
        <div className="row between" style={{ marginBottom: 18 }}>
          <div>
            <div className="tiny">Calidad de datos</div>
            <div className="h" style={{ fontSize: 24 }}>Diagnóstico del dataset</div>
          </div>
          <span className="badge good"><span className="dot"></span>Estado: aceptable</span>
        </div>
        <div className="grid-3">
          {checks.map(c => (
            <div key={c.label} style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
              <div className="tiny">{c.label}</div>
              <div className="num" style={{ fontSize: 28, letterSpacing: '-0.02em', marginTop: 6 }}>{c.value}</div>
              <div className="small muted" style={{ marginTop: 4 }}>{c.detail}</div>
              <div className={`badge ${c.tone}`} style={{ marginTop: 10 }}>{c.tone === 'good' ? 'OK' : 'revisar'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <div>
            <div className="tiny">Bitácora</div>
            <div className="h">Importaciones recientes</div>
          </div>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>Importación</th><th>Fecha</th><th className="r">Registros</th><th className="r">Duplicados</th><th className="r">Anomalías</th><th>Estado</th>
          </tr></thead>
          <tbody>
            {[
              { id: 'imp_8a4f9c', date: '27 abr 2026 · 09:14', n: 1247, dup: 0, an: 0, st: 'OK', tone: 'good' },
              { id: 'imp_7b2e10', date: '26 abr 2026 · 18:02', n: 1389, dup: 12, an: 3, st: 'Advertencia', tone: 'warn' },
              { id: 'imp_6d9a55', date: '25 abr 2026 · 09:08', n: 1102, dup: 0, an: 0, st: 'OK', tone: 'good' },
              { id: 'imp_5c1844', date: '24 abr 2026 · 18:41', n: 998, dup: 4, an: 0, st: 'OK', tone: 'good' },
              { id: 'imp_4f0e21', date: '23 abr 2026 · 09:00', n: 1180, dup: 0, an: 0, st: 'OK', tone: 'good' },
            ].map(r => (
              <tr key={r.id}>
                <td className="num" style={{ fontSize: 12 }}>{r.id}</td>
                <td className="small">{r.date}</td>
                <td className="r num">{fn(r.n)}</td>
                <td className="r num muted">{r.dup}</td>
                <td className="r num">{r.an}</td>
                <td><span className={`badge ${r.tone}`}>{r.st}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { ResumenView, ColasView, EjecutivosView, PlanificacionView, ConectividadView, AuditoriaView });
