// Synthetic dataset modeled after the real Genesys CallRecord schema.
// Deterministic — seeded RNG so the dashboard is stable across reloads.

const QUEUES = [
  { id: 'CN_HIPOTECARIA', label: 'CN · Hipotecaria', dept: 'CASANUESTRA' },
  { id: 'CN_VENTA', label: 'CN · Venta Nueva', dept: 'CASANUESTRA' },
  { id: 'CN_POSTVENTA', label: 'CN · Post-venta', dept: 'CASANUESTRA' },
  { id: 'BICEHIPOTECARIA_RENEGOC', label: 'BiceHipotecaria · Renegoc.', dept: 'BICEHIPOTECARIA' },
  { id: 'BICEHIPOTECARIA_COBRANZA', label: 'BiceHipotecaria · Cobranza', dept: 'BICEHIPOTECARIA' },
  { id: 'CN_RECEPCION', label: 'CN · Recepción', dept: 'CASANUESTRA' },
];

const EXECUTIVES = [
  'Ana Pérez', 'Camila Soto', 'Diego Rojas', 'Fernanda Lillo',
  'Gabriela Muñoz', 'Hernán Vidal', 'Isidora Castro', 'Javiera León',
  'Karla Vergara', 'Luis Fuentes', 'Marcela Ortiz', 'Natalia Reyes',
  'Pablo Tapia', 'Rocío Bravo', 'Sofía Carvajal', 'Tomás Morales',
];

// seeded RNG
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260427);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randint = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const gauss = (mean, sd) => {
  const u = 1 - rand(); const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// Generate ~5 business days × hourly volume curve
function dayVolumeCurve(hour) {
  // 8-19h business hours, peak ~10-12 and ~15-17
  if (hour < 8 || hour >= 19) return 0;
  const base = 18;
  const morning = Math.exp(-Math.pow((hour - 11) / 2.0, 2)) * 50;
  const afternoon = Math.exp(-Math.pow((hour - 16) / 2.2, 2)) * 38;
  return Math.max(0, base + morning + afternoon + gauss(0, 4));
}

function genRecords() {
  const records = [];
  const today = new Date('2026-04-27T00:00:00');
  const days = 5;
  let id = 1;

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // weekday-only

    for (let h = 8; h < 19; h++) {
      const volume = Math.round(dayVolumeCurve(h));
      for (let i = 0; i < volume; i++) {
        const queue = pick(QUEUES);
        const exec = pick(EXECUTIVES);
        const queue_time = Math.max(0, Math.round(gauss(18, 22)));
        const isAbandoned = rand() < (queue_time > 30 ? 0.22 : 0.06);
        const duration = isAbandoned ? 0 : Math.max(20, Math.round(gauss(180, 90)));
        const hold = isAbandoned ? 0 : Math.round(rand() * 30);
        const acw = isAbandoned ? 0 : 45;
        const handle_time = duration + hold + acw;
        const isInbound = rand() < 0.85;
        const minute = randint(0, 59);
        const second = randint(0, 59);
        records.push({
          id: id++,
          call_date: dateStr,
          call_time: `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
          call_hour: h,
          executive: exec,
          ani_masked: `+56 9 ${randint(1000, 9999)} ****`,
          call_direction: isInbound ? 'inbound' : 'outbound',
          queue: queue.id,
          queue_label: queue.label,
          dept: queue.dept,
          duration_seconds: duration,
          attended: !isAbandoned,
          abandoned: isAbandoned,
          queue_time_seconds: queue_time,
          handle_time_seconds: handle_time,
          alert_time_seconds: isAbandoned ? Math.round(rand() * 25) : Math.round(rand() * 12),
          hold_time_seconds: hold,
          acw_seconds: acw,
          is_bounce: !isAbandoned && rand() < 0.08,
          abandon_type: isAbandoned ? (queue_time < 5 ? 'IVR' : queue_time < 30 ? 'COLA' : 'ALERTA') : null,
        });
      }
    }
  }
  return records;
}

const RECORDS = genRecords();

// Aggregations
function computeKPIs(records) {
  const inbound = records.filter(r => r.call_direction === 'inbound');
  const total = records.length;
  const attended = records.filter(r => r.attended).length;
  const abandoned = records.filter(r => r.abandoned).length;
  const aht = records.filter(r => r.attended).reduce((a, r) => a + r.handle_time_seconds, 0)
              / Math.max(1, attended);
  const slCount = inbound.filter(r => r.attended && r.queue_time_seconds <= 20).length;
  const sl = inbound.length ? slCount / inbound.length : 0;
  const totalHandle = records.reduce((a, r) => a + r.handle_time_seconds, 0);
  // Erlang network load (call-seconds / hour-seconds, summed across business hours)
  const businessSeconds = 11 * 3600 * 5; // 11h × 5 days
  const erlangs = totalHandle / businessSeconds;
  const bounceRate = attended ? records.filter(r => r.is_bounce).length / attended : 0;
  return { total, attended, abandoned, aht, sl, erlangs, bounceRate, totalHandle };
}

function computeHourlyVolume(records) {
  const buckets = {};
  for (let h = 8; h < 19; h++) buckets[h] = { hour: h, total: 0, attended: 0, abandoned: 0, sl: 0, slDenom: 0, handle: 0 };
  for (const r of records) {
    const b = buckets[r.call_hour];
    if (!b) continue;
    b.total++;
    if (r.attended) b.attended++;
    if (r.abandoned) b.abandoned++;
    if (r.call_direction === 'inbound') {
      b.slDenom++;
      if (r.attended && r.queue_time_seconds <= 20) b.sl++;
    }
    b.handle += r.handle_time_seconds;
  }
  return Object.values(buckets).map(b => ({
    ...b,
    sl: b.slDenom ? b.sl / b.slDenom : 0,
    erlangs: b.handle / 3600,
  }));
}

function computeQueueStats(records) {
  const map = {};
  for (const r of records) {
    if (!map[r.queue]) {
      const qDef = QUEUES.find(q => q.id === r.queue);
      map[r.queue] = {
        id: r.queue,
        label: qDef?.label || r.queue,
        dept: qDef?.dept || '',
        total: 0, attended: 0, abandoned: 0,
        avgWait: 0, avgHandle: 0, sl: 0, slDenom: 0,
        waitSum: 0, handleSum: 0,
      };
    }
    const q = map[r.queue];
    q.total++;
    if (r.attended) { q.attended++; q.handleSum += r.handle_time_seconds; }
    if (r.abandoned) q.abandoned++;
    q.waitSum += r.queue_time_seconds;
    if (r.call_direction === 'inbound') {
      q.slDenom++;
      if (r.attended && r.queue_time_seconds <= 20) q.sl++;
    }
  }
  return Object.values(map).map(q => ({
    ...q,
    avgWait: q.total ? q.waitSum / q.total : 0,
    avgHandle: q.attended ? q.handleSum / q.attended : 0,
    sl: q.slDenom ? q.sl / q.slDenom : 0,
    abandonRate: q.total ? q.abandoned / q.total : 0,
  })).sort((a, b) => b.total - a.total);
}

function computeExecutiveStats(records) {
  const map = {};
  for (const r of records) {
    if (!map[r.executive]) {
      map[r.executive] = {
        name: r.executive, total: 0, attended: 0, bounce: 0,
        handleSum: 0, holdSum: 0, durationSum: 0,
      };
    }
    const e = map[r.executive];
    e.total++;
    if (r.attended) {
      e.attended++;
      e.handleSum += r.handle_time_seconds;
      e.holdSum += r.hold_time_seconds;
      e.durationSum += r.duration_seconds;
    }
    if (r.is_bounce) e.bounce++;
  }
  // shift assumed 8h = 28800s
  return Object.values(map).map(e => ({
    ...e,
    aht: e.attended ? e.handleSum / e.attended : 0,
    occupancy: Math.min(1, e.handleSum / (28800 * 5)), // across 5 days
    bounceRate: e.attended ? e.bounce / e.attended : 0,
  })).sort((a, b) => b.attended - a.attended);
}

function computeQueueHourMatrix(records) {
  // queue × hour heatmap (attendance %)
  const matrix = {};
  for (const r of records) {
    if (!matrix[r.queue]) matrix[r.queue] = {};
    if (!matrix[r.queue][r.call_hour]) matrix[r.queue][r.call_hour] = { total: 0, attended: 0, calls: [] };
    matrix[r.queue][r.call_hour].total++;
    if (r.attended) matrix[r.queue][r.call_hour].attended++;
    matrix[r.queue][r.call_hour].calls.push(r);
  }
  return matrix;
}

function fmtDuration(s) {
  if (!s) return '0s';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60); const sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

function fmtPct(n, d = 1) { return `${(n * 100).toFixed(d)}%`; }
function fmtNum(n) { return n.toLocaleString('es-CL'); }

window.TELEFONO_DATA = {
  RECORDS, QUEUES, EXECUTIVES,
  computeKPIs, computeHourlyVolume, computeQueueStats, computeExecutiveStats, computeQueueHourMatrix,
  fmtDuration, fmtPct, fmtNum,
};
