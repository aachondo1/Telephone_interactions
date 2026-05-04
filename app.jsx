// Telefono2 — main app (BICE Hipotecaria brand)
const { RECORDS: ALL_RECORDS, QUEUES: ALL_QUEUES, EXECUTIVES: ALL_EXECS,
  computeKPIs, computeHourlyVolume, computeQueueStats, computeExecutiveStats } = window.TELEFONO_DATA;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "cyan",
  "density": "balanced",
  "navyHeader": true,
  "showBarsMotif": true
}/*EDITMODE-END*/;

function applyAccent(name) {
  // All variants stay within BICE brand discipline
  const map = {
    cyan:  { accent: '#00ABC8', accent2: '#5cc9dd', accentBg: '#e6f7fa' }, // Pantone 3125 — primary brand cyan
    navy:  { accent: '#003A70', accent2: '#0a5396', accentBg: '#e8f0f8' }, // Pantone 654 — primary brand navy
    blend: { accent: '#0a5396', accent2: '#00ABC8', accentBg: '#e8f0f8' }, // mixed
  };
  const c = map[name] || map.cyan;
  document.documentElement.style.setProperty('--accent', c.accent);
  document.documentElement.style.setProperty('--accent-2', c.accent2);
  document.documentElement.style.setProperty('--accent-bg', c.accentBg);
}

function App() {
  const [section, setSection] = React.useState('resumen');
  const [filters, setFilters] = React.useState({ range: '5d', direction: 'all', dept: null });
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.body.dataset.density = tweaks.density;
    applyAccent(tweaks.accent);
    document.body.dataset.bars = tweaks.showBarsMotif ? 'on' : 'off';
    document.body.dataset.navy = tweaks.navyHeader ? 'on' : 'off';
  }, [tweaks]);

  const filteredRecords = React.useMemo(() => {
    return ALL_RECORDS.filter(r => {
      if (filters.direction === 'inbound' && r.call_direction !== 'inbound') return false;
      if (filters.direction === 'outbound' && r.call_direction !== 'outbound') return false;
      if (filters.dept && r.dept !== filters.dept) return false;
      return true;
    });
  }, [filters]);

  const kpis = React.useMemo(() => computeKPIs(filteredRecords), [filteredRecords]);
  const hourly = React.useMemo(() => computeHourlyVolume(filteredRecords), [filteredRecords]);
  const queueStats = React.useMemo(() => computeQueueStats(filteredRecords), [filteredRecords]);
  const execStats = React.useMemo(() => computeExecutiveStats(filteredRecords), [filteredRecords]);

  const dateRange = '23 abr — 27 abr 2026';

  const filtersWithMatch = { ...filters, matchCount: filteredRecords.length };

  return (
    <div className="app" data-screen-label={section}>
      <Sidebar section={section} onSection={setSection} recordCount={ALL_RECORDS.length} dateRange={dateRange} />

      <div className="main">
        <Topbar section={section} recordCount={filteredRecords.length} dateRange={dateRange} />
        <FilterBar filters={filtersWithMatch} setFilters={setFilters} queues={ALL_QUEUES} executives={ALL_EXECS} />

        {section === 'resumen' && <ResumenView records={filteredRecords} kpis={kpis} hourly={hourly} queueStats={queueStats} execStats={execStats} />}
        {section === 'colas' && <ColasView records={filteredRecords} queueStats={queueStats} />}
        {section === 'ejecutivos' && <EjecutivosView execStats={execStats} />}
        {section === 'planificacion' && <PlanificacionView hourly={hourly} kpis={kpis} />}
        {section === 'conectividad' && <ConectividadView execStats={execStats} />}
        {section === 'auditoria' && <AuditoriaView records={filteredRecords} />}
      </div>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Marca BICE">
          <window.TweakRadio
            label="Acento"
            value={tweaks.accent}
            onChange={v => setTweak('accent', v)}
            options={[
              { value: 'cyan', label: 'Cian 3125' },
              { value: 'navy', label: 'Navy 654' },
              { value: 'blend', label: 'Mixto' },
            ]}
          />
          <window.TweakToggle
            label="Sidebar en navy corporativo"
            value={tweaks.navyHeader}
            onChange={v => setTweak('navyHeader', v)}
          />
          <window.TweakToggle
            label="Motivo de barras del isotipo"
            value={tweaks.showBarsMotif}
            onChange={v => setTweak('showBarsMotif', v)}
          />
        </window.TweakSection>
        <window.TweakSection title="Layout">
          <window.TweakRadio
            label="Densidad"
            value={tweaks.density}
            onChange={v => setTweak('density', v)}
            options={[
              { value: 'sparse', label: 'Amplia' },
              { value: 'balanced', label: 'Balanceada' },
              { value: 'dense', label: 'Densa' },
            ]}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
