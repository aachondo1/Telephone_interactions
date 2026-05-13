export type FunnelPoint = {
  label: string;
  entrantes: number;
  aCola: number;
  contestadas: number;
};

export type OutboundPoint = {
  label: string;
  efectivos: number;
  fallidos: number;
};

export type PresentationData = {
  periodoLabel: string;
  periodoAntLabel: string;
  fechaGen: string;

  totIn: number;
  cola: number;
  ejec: number;
  atend: number;
  aban: number;

  tColaSec: number;
  ahtSec: number;
  tConvSec: number;

  totInD: number | null;
  colaD: number | null;
  ejecD: number | null;
  atendD: number | null;
  abanD: number | null;
  tColaD: number | null;
  ahtD: number | null;
  tConvD: number | null;

  topQueues: { nom: string; cnt: number }[];
  top10Execs: { nom: string; cnt: number; tCola: string }[];

  funnelData: FunnelPoint[];
  outboundData: OutboundPoint[];
};

function fmtSecs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDelta(d: number | null): string {
  if (d === null) return '';
  if (d === 0) return '— 0%';
  return d > 0 ? `▲ ${d}%` : `▼ ${Math.abs(d)}%`;
}

function deltaClass(d: number | null, inverted = false): string {
  if (d === null || d === 0) return 'neu';
  const positive = inverted ? d < 0 : d > 0;
  return positive ? 'pos' : 'neg';
}

function buildTextReplacements(data: PresentationData): Map<string, string> {
  return new Map<string, string>([
    ['{{PERIODO}}',     data.periodoLabel],
    ['{{PERIODO_ANT}}', data.periodoAntLabel],
    ['{{FECHA_GEN}}',   data.fechaGen],

    ['{{TOT_IN}}', data.totIn.toLocaleString('es-CL')],
    ['{{COLA}}',   data.cola.toLocaleString('es-CL')],
    ['{{EJEC}}',   data.ejec.toLocaleString('es-CL')],
    ['{{ATEND}}',  data.atend.toLocaleString('es-CL')],
    ['{{ABAN}}',   data.aban.toLocaleString('es-CL')],
    ['{{T_COLA}}', fmtSecs(data.tColaSec)],
    ['{{AHT}}',    fmtSecs(data.ahtSec)],
    ['{{T_CONV}}', fmtSecs(data.tConvSec)],

    ['{{TOT_IN_D}}', fmtDelta(data.totInD)],
    ['{{COLA_D}}',   fmtDelta(data.colaD)],
    ['{{EJEC_D}}',   fmtDelta(data.ejecD)],
    ['{{ATEND_D}}',  fmtDelta(data.atendD)],
    ['{{ABAN_D}}',   fmtDelta(data.abanD)],
    ['{{T_COLA_D}}', fmtDelta(data.tColaD)],
    ['{{AHT_D}}',    fmtDelta(data.ahtD)],
    ['{{T_CONV_D}}', fmtDelta(data.tConvD)],

    ...(Array.from({ length: 6 }, (_, i) => [
      [`{{Q${i + 1}_NOM}}`, data.topQueues[i]?.nom ?? ''],
      [`{{Q${i + 1}_CNT}}`, data.topQueues[i]
        ? data.topQueues[i].cnt.toLocaleString('es-CL') : ''],
    ]).flat() as [string, string][]),

    ...(Array.from({ length: 10 }, (_, i) => [
      [`{{E${i + 1}_NOM}}`, data.top10Execs[i]?.nom ?? ''],
      [`{{E${i + 1}_CNT}}`, data.top10Execs[i]
        ? data.top10Execs[i].cnt.toLocaleString('es-CL') : ''],
      [`{{E${i + 1}_TMO}}`, data.top10Execs[i]?.tCola ?? ''],
    ]).flat() as [string, string][]),
  ]);
}

function applyDeltaClasses(html: string, data: PresentationData): string {
  const deltaMap: [string, number | null, boolean][] = [
    ['TOT_IN_D', data.totInD,  false],
    ['COLA_D',   data.colaD,   false],
    ['EJEC_D',   data.ejecD,   false],
    ['ATEND_D',  data.atendD,  false],
    ['ABAN_D',   data.abanD,   true],
    ['T_COLA_D', data.tColaD,  true],
    ['AHT_D',    data.ahtD,    true],
    ['T_CONV_D', data.tConvD,  false],
  ];

  let result = html;
  for (const [key, value, inverted] of deltaMap) {
    const cls = deltaClass(value, inverted);
    result = result.replace(
      new RegExp(`(class="delta )(?:pos|neg|neu)(">[^<]*\\{\\{${key}\\}\\})`, 'g'),
      `$1${cls}$2`,
    );
  }
  return result;
}

const SVG_W = 800;
const SVG_H = 220;
const CHART_LEFT = 40;
const CHART_RIGHT = 790;
const CHART_TOP = 20;
const CHART_BOTTOM = 180;

function buildFunnelSvg(data: FunnelPoint[]): string {
  if (data.length === 0) return '';

  const chartW = CHART_RIGHT - CHART_LEFT;
  const chartH = CHART_BOTTOM - CHART_TOP;

  const maxVal = Math.max(
    ...data.flatMap(d => [d.entrantes, d.aCola, d.contestadas]),
  );
  if (maxVal === 0) return '';

  const nTicks = 4;
  const tickStep = Math.ceil(maxVal / nTicks / 50) * 50 || 1;
  const yMax = tickStep * nTicks;

  const yScale = (val: number) => CHART_BOTTOM - (val / yMax) * chartH;
  const xScale = (i: number) =>
    CHART_LEFT + (i / Math.max(data.length - 1, 1)) * chartW;

  const toPoints = (vals: number[]) =>
    vals.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');

  const xLabelCount = Math.min(7, data.length);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / Math.max(xLabelCount - 1, 1)) * (data.length - 1)),
  );
  const xLabels = xLabelIndices.map(i =>
    `<text x="${xScale(i).toFixed(1)}" y="200" text-anchor="middle">${data[i].label}</text>`,
  ).join('\n');

  const yLabels = Array.from({ length: nTicks + 1 }, (_, i) => {
    const val = tickStep * (nTicks - i);
    const y = yScale(val);
    return `<text x="34" y="${(y + 4).toFixed(1)}" text-anchor="end">${val}</text>`;
  }).join('\n');

  const gridlines = Array.from({ length: nTicks + 1 }, (_, i) => {
    const val = tickStep * (nTicks - i);
    const y = yScale(val);
    return `<line x1="${CHART_LEFT}" y1="${y.toFixed(1)}" x2="${CHART_RIGHT}" y2="${y.toFixed(1)}"/>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" preserveAspectRatio="none">
  <g stroke="#E2E8F0" stroke-width="1">${gridlines}</g>
  <g font-family="Consolas, monospace" font-size="10" fill="#94A3B8">${yLabels}</g>
  <g font-family="Consolas, monospace" font-size="9" fill="#94A3B8">${xLabels}</g>
  <polyline fill="none" stroke="#003A70" stroke-width="2" points="${toPoints(data.map(d => d.entrantes))}"/>
  <polyline fill="none" stroke="#888787" stroke-width="2" points="${toPoints(data.map(d => d.aCola))}"/>
  <polyline fill="none" stroke="#84BD00" stroke-width="2" points="${toPoints(data.map(d => d.contestadas))}"/>
</svg>`;
}

const BAR_W = 14;

function buildOutboundSvg(data: OutboundPoint[]): string {
  if (data.length === 0) return '';

  const chartW = CHART_RIGHT - CHART_LEFT;
  const chartH = CHART_BOTTOM - CHART_TOP;

  const maxVal = Math.max(...data.map(d => d.efectivos + d.fallidos));
  if (maxVal === 0) return '';

  const nTicks = 4;
  const tickStep = Math.ceil(maxVal / nTicks / 10) * 10 || 1;
  const yMax = tickStep * nTicks;

  const yScale = (val: number) => CHART_BOTTOM - (val / yMax) * chartH;
  const xScale = (i: number) => {
    const spacing = chartW / data.length;
    return CHART_LEFT + i * spacing + (spacing - BAR_W) / 2;
  };

  const xLabelCount = Math.min(7, data.length);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / Math.max(xLabelCount - 1, 1)) * (data.length - 1)),
  );
  const xLabels = xLabelIndices.map(i =>
    `<text x="${(xScale(i) + BAR_W / 2).toFixed(1)}" y="200" text-anchor="middle">${data[i].label}</text>`,
  ).join('\n');

  const yLabels = Array.from({ length: nTicks + 1 }, (_, i) => {
    const val = tickStep * (nTicks - i);
    const y = yScale(val);
    return `<text x="34" y="${(y + 4).toFixed(1)}" text-anchor="end">${val}</text>`;
  }).join('\n');

  const gridlines = Array.from({ length: nTicks + 1 }, (_, i) => {
    const val = tickStep * (nTicks - i);
    const y = yScale(val);
    return `<line x1="${CHART_LEFT}" y1="${y.toFixed(1)}" x2="${CHART_RIGHT}" y2="${y.toFixed(1)}"/>`;
  }).join('\n');

  const bars = data.map((d, i) => {
    const x = xScale(i).toFixed(1);
    const totalH = ((d.efectivos + d.fallidos) / yMax) * chartH;
    const efectivosH = (d.efectivos / yMax) * chartH;
    const fallidosH = totalH - efectivosH;

    const yEfectivos = (CHART_BOTTOM - efectivosH).toFixed(1);
    const yFallidos  = (CHART_BOTTOM - totalH).toFixed(1);

    return `
      <rect x="${x}" y="${yEfectivos}" width="${BAR_W}" height="${efectivosH.toFixed(1)}" fill="#84BD00"/>
      <rect x="${x}" y="${yFallidos}"  width="${BAR_W}" height="${fallidosH.toFixed(1)}"  fill="#888787" rx="2" ry="2"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" preserveAspectRatio="none">
  <g stroke="#E2E8F0" stroke-width="1">${gridlines}</g>
  <g font-family="Consolas, monospace" font-size="10" fill="#94A3B8">${yLabels}</g>
  <g font-family="Consolas, monospace" font-size="9" fill="#94A3B8">${xLabels}</g>
  <g>${bars}</g>
</svg>`;
}

function replaceSvgInChartCard(html: string, cardHint: string, newSvg: string): string {
  const hintIdx = html.indexOf(cardHint);
  if (hintIdx === -1 || !newSvg) return html;

  const svgStart = html.indexOf('<svg', hintIdx);
  if (svgStart === -1) return html;

  const svgEnd = html.indexOf('</svg>', svgStart) + '</svg>'.length;
  if (svgEnd < '</svg>'.length) return html;

  return html.slice(0, svgStart) + newSvg + html.slice(svgEnd);
}

export async function buildHtml(data: PresentationData): Promise<string> {
  const response = await fetch('/Resumen_Operacional.html');
  if (!response.ok) {
    throw new Error('No se encontró public/Resumen_Operacional.html');
  }
  let html = await response.text();

  // Vite SPA serves index.html with 200 for unknown paths — detect the fallback.
  if (!html.includes('{{PERIODO}}')) {
    throw new Error(
      'El archivo Resumen_Operacional.html no está disponible en public/. ' +
      'Solicítalo al equipo de diseño y colócalo en la carpeta public/.',
    );
  }

  html = applyDeltaClasses(html, data);

  const replacements = buildTextReplacements(data);
  for (const [ph, val] of replacements) {
    html = html.split(ph).join(val);
  }

  if (data.funnelData.length > 1) {
    html = replaceSvgInChartCard(html, 'CHART_FUNNEL', buildFunnelSvg(data.funnelData));
  }
  if (data.outboundData.length > 1) {
    html = replaceSvgInChartCard(html, 'CHART_OUTBOUND', buildOutboundSvg(data.outboundData));
  }

  return html;
}

export function openPresentation(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export async function exportPPTX(data: PresentationData): Promise<void> {
  const NAVY      = '003A70';
  const GREEN     = '84BD00';
  const GREEN_TXT = '3B6D11';
  const RED_TXT   = 'A32D2D';
  const SLATE     = '64748B';
  const GRAY_L    = '94A3B8';
  const CARD_BG   = 'F1F5F9';
  const BORDER    = 'E2E8F0';
  const ROW_ALT   = 'F8FAFC';
  const WHITE     = 'FFFFFF';
  const DARK      = '1E293B';
  const GRAY_MID  = '888787';

  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';

  const W      = 13.33;
  const H      = 7.5;
  const HDR_H  = 0.78;
  const FTR_H  = 0.31;
  const PAD    = 0.42;
  const INNER_W = W - PAD * 2;

  const slide = pres.addSlide();

  // ── Banda superior ───────────────────────────────────────────────────────
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: HDR_H,
    fill: { color: NAVY }, line: { color: NAVY },
  });
  slide.addText('Resumen Operacional — Contact Center', {
    x: PAD, y: 0, w: 7, h: HDR_H,
    fontSize: 20, bold: true, color: WHITE,
    fontFace: 'Helvetica Neue', valign: 'middle',
  });
  slide.addText(data.periodoLabel, {
    x: W - PAD - 3.2, y: 0, w: 3.2, h: HDR_H,
    fontSize: 14, color: 'C8D8EA', fontFace: 'Consolas',
    align: 'right', valign: 'middle',
  });

  // ── KPI Row — 8 cards ────────────────────────────────────────────────────
  const KPI_Y   = HDR_H + 0.22;
  const KPI_H   = 1.22;
  const KPI_GAP = 0.10;
  const KPI_W   = (INNER_W - KPI_GAP * 7) / 8;

  type KpiDef = {
    label: string; value: string; delta: number | null;
    inverted?: boolean; accent: string; valuColor: string;
  };

  const kpis: KpiDef[] = [
    { label: 'Llamadas Totales',  value: data.totIn.toLocaleString('es-CL'),  delta: data.totInD,  accent: NAVY,      valuColor: NAVY },
    { label: 'En Cola',           value: data.cola.toLocaleString('es-CL'),   delta: data.colaD,   accent: NAVY,      valuColor: NAVY },
    { label: 'A Ejecutivo',       value: data.ejec.toLocaleString('es-CL'),   delta: data.ejecD,   accent: NAVY,      valuColor: NAVY },
    { label: 'Atendidas',         value: data.atend.toLocaleString('es-CL'),  delta: data.atendD,  accent: GREEN,     valuColor: GREEN_TXT },
    { label: 'Abandonadas',       value: data.aban.toLocaleString('es-CL'),   delta: data.abanD,   inverted: true, accent: 'C0392B', valuColor: RED_TXT },
    { label: 'T. Cola Prom.',     value: fmtSecs(data.tColaSec),              delta: data.tColaD,  inverted: true, accent: NAVY,  valuColor: NAVY },
    { label: 'AHT Prom.',         value: fmtSecs(data.ahtSec),               delta: data.ahtD,    inverted: true, accent: NAVY,  valuColor: NAVY },
    { label: 'T. Conversación',   value: fmtSecs(data.tConvSec),             delta: data.tConvD,  accent: NAVY,      valuColor: NAVY },
  ];

  kpis.forEach((kpi, i) => {
    const x = PAD + i * (KPI_W + KPI_GAP);
    slide.addShape('rect', {
      x, y: KPI_Y, w: KPI_W, h: KPI_H,
      fill: { color: CARD_BG }, line: { color: BORDER, pt: 0.5 },
    });
    slide.addShape('rect', {
      x, y: KPI_Y, w: 0.05, h: KPI_H,
      fill: { color: kpi.accent }, line: { color: kpi.accent },
    });
    slide.addText(kpi.value, {
      x: x + 0.1, y: KPI_Y + 0.08, w: KPI_W - 0.12, h: 0.52,
      fontSize: 22, bold: true, color: kpi.valuColor,
      fontFace: 'Consolas', valign: 'middle',
    });
    slide.addText(kpi.label, {
      x: x + 0.1, y: KPI_Y + 0.6, w: KPI_W - 0.12, h: 0.22,
      fontSize: 8, color: SLATE, fontFace: 'Helvetica Neue',
      bold: true, charSpacing: 0.5,
    });
    if (kpi.delta !== null) {
      const isNeutral  = kpi.delta === 0;
      const isPositive = kpi.inverted ? kpi.delta < 0 : kpi.delta > 0;
      const deltaColor = isNeutral ? GRAY_L : isPositive ? GREEN_TXT : RED_TXT;
      slide.addText(fmtDelta(kpi.delta), {
        x: x + 0.1, y: KPI_Y + 0.82, w: KPI_W - 0.12, h: 0.18,
        fontSize: 9, bold: true, color: deltaColor, fontFace: 'Consolas',
      });
      if (data.periodoAntLabel) {
        slide.addText(data.periodoAntLabel, {
          x: x + 0.1, y: KPI_Y + 0.99, w: KPI_W - 0.12, h: 0.16,
          fontSize: 7.5, color: GRAY_L, fontFace: 'Consolas',
        });
      }
    }
  });

  // ── Charts Row ───────────────────────────────────────────────────────────
  const CHT_Y = KPI_Y + KPI_H + 0.16;
  const CHT_H = 2.1;
  const CHT_W = (INNER_W - 0.18) / 2;

  const svgToPng = (svgStr: string, w: number, h: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No canvas context')); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render error')); };
      img.src = url;
    });

  const addChartCard = (x: number, title: string, sub: string) => {
    slide.addShape('rect', {
      x, y: CHT_Y, w: CHT_W, h: CHT_H,
      fill: { color: WHITE }, line: { color: BORDER, pt: 0.5 },
    });
    slide.addText(title, {
      x: x + 0.14, y: CHT_Y + 0.1, w: CHT_W - 0.28, h: 0.22,
      fontSize: 9, bold: true, color: NAVY,
      fontFace: 'Helvetica Neue', charSpacing: 0.5,
    });
    slide.addText(sub, {
      x: x + 0.14, y: CHT_Y + 0.3, w: CHT_W - 0.28, h: 0.16,
      fontSize: 7.5, color: SLATE, fontFace: 'Helvetica Neue',
    });
  };

  const funnelX   = PAD;
  const outboundX = PAD + CHT_W + 0.18;

  addChartCard(funnelX,   'FUNNEL DE DEMANDA ENTRANTE',    'Llamadas por período · Entrantes → Cola → Contestadas');
  addChartCard(outboundX, 'VOLUMEN DE GESTIÓN SALIENTE',   'Llamadas outbound por período · Efectivos + Fallidos');

  if (data.funnelData.length > 1) {
    const svg = buildFunnelSvg(data.funnelData);
    if (svg) slide.addImage({ data: await svgToPng(svg, 800, 220), x: funnelX + 0.1, y: CHT_Y + 0.5, w: CHT_W - 0.2, h: CHT_H - 0.65 });
  }
  if (data.outboundData.length > 1) {
    const svg = buildOutboundSvg(data.outboundData);
    if (svg) slide.addImage({ data: await svgToPng(svg, 800, 220), x: outboundX + 0.1, y: CHT_Y + 0.5, w: CHT_W - 0.2, h: CHT_H - 0.65 });
  }

  // ── Rankings Row ─────────────────────────────────────────────────────────
  const RNK_Y = CHT_Y + CHT_H + 0.16;
  const RNK_H = H - FTR_H - RNK_Y - 0.06;
  const Q_W   = INNER_W * 0.43;
  const E_W   = INNER_W - Q_W - 0.18;
  const queueX = PAD;
  const execX  = PAD + Q_W + 0.18;

  // Colas
  slide.addShape('rect', { x: queueX, y: RNK_Y, w: Q_W, h: RNK_H, fill: { color: WHITE }, line: { color: BORDER, pt: 0.5 } });
  slide.addShape('rect', { x: queueX, y: RNK_Y, w: Q_W, h: 0.3,   fill: { color: NAVY },  line: { color: NAVY } });
  slide.addText('RANKING DE COLAS', { x: queueX + 0.12, y: RNK_Y, w: Q_W - 0.24, h: 0.3, fontSize: 9, bold: true, color: WHITE, fontFace: 'Helvetica Neue', valign: 'middle', charSpacing: 0.5 });

  const Q_COL_RANK = 0.3;
  const Q_COL_CNT  = 0.9;
  const Q_COL_NOM  = Q_W - Q_COL_RANK - Q_COL_CNT;
  const Q_ROW_H    = (RNK_H - 0.3) / 7;

  [['#', Q_COL_RANK, 0], ['Cola', Q_COL_NOM, Q_COL_RANK], ['Llamadas', Q_COL_CNT, Q_COL_RANK + Q_COL_NOM]].forEach(([hdr, w, ox]) => {
    slide.addShape('rect', { x: queueX + (ox as number), y: RNK_Y + 0.3, w: w as number, h: Q_ROW_H, fill: { color: 'E8EFF6' }, line: { color: BORDER, pt: 0.3 } });
    slide.addText(hdr as string, { x: queueX + (ox as number) + 0.05, y: RNK_Y + 0.3, w: (w as number) - 0.1, h: Q_ROW_H, fontSize: 8, bold: true, color: NAVY, fontFace: 'Helvetica Neue', valign: 'middle', align: hdr === 'Llamadas' ? 'right' : 'left' });
  });

  data.topQueues.slice(0, 6).forEach((q, ri) => {
    const ry   = RNK_Y + 0.3 + (ri + 1) * Q_ROW_H;
    const fill = ri % 2 === 1 ? ROW_ALT : WHITE;
    [[Q_COL_RANK, 0], [Q_COL_NOM, Q_COL_RANK], [Q_COL_CNT, Q_COL_RANK + Q_COL_NOM]].forEach(([w, ox]) => {
      slide.addShape('rect', { x: queueX + (ox as number), y: ry, w: w as number, h: Q_ROW_H, fill: { color: fill }, line: { color: BORDER, pt: 0.3 } });
    });
    slide.addText(String(ri + 1).padStart(2, '0'), { x: queueX + 0.05,                           y: ry, w: Q_COL_RANK - 0.1, h: Q_ROW_H, fontSize: 9, color: GRAY_L,  fontFace: 'Consolas',      align: 'center', valign: 'middle' });
    slide.addText(q.nom,                           { x: queueX + Q_COL_RANK + 0.05,               y: ry, w: Q_COL_NOM - 0.1,  h: Q_ROW_H, fontSize: 9, color: DARK,    fontFace: 'Helvetica Neue', align: 'left',   valign: 'middle' });
    slide.addText(q.cnt.toLocaleString('es-CL'),   { x: queueX + Q_COL_RANK + Q_COL_NOM + 0.05,   y: ry, w: Q_COL_CNT - 0.1,  h: Q_ROW_H, fontSize: 9, color: DARK,    fontFace: 'Consolas',      align: 'right',  valign: 'middle' });
  });

  // Ejecutivos
  slide.addShape('rect', { x: execX, y: RNK_Y, w: E_W, h: RNK_H, fill: { color: WHITE }, line: { color: BORDER, pt: 0.5 } });
  slide.addShape('rect', { x: execX, y: RNK_Y, w: E_W, h: 0.3,   fill: { color: GREEN }, line: { color: GREEN } });
  slide.addText('TOP 10 EJECUTIVOS', { x: execX + 0.12, y: RNK_Y, w: E_W - 0.24, h: 0.3, fontSize: 9, bold: true, color: '1a2e00', fontFace: 'Helvetica Neue', valign: 'middle', charSpacing: 0.5 });

  const E_COL_RANK = 0.28;
  const E_COL_CNT  = 0.72;
  const E_COL_TMO  = 0.72;
  const E_COL_NOM  = E_W - E_COL_RANK - E_COL_CNT - E_COL_TMO;
  const E_ROW_H    = (RNK_H - 0.3) / 11;

  [
    ['#', E_COL_RANK, 0, 'left'],
    ['Ejecutivo', E_COL_NOM, E_COL_RANK, 'left'],
    ['Atendidas', E_COL_CNT, E_COL_RANK + E_COL_NOM, 'right'],
    ['T. Cola',   E_COL_TMO, E_COL_RANK + E_COL_NOM + E_COL_CNT, 'right'],
  ].forEach(([hdr, w, ox, align]) => {
    slide.addShape('rect', { x: execX + (ox as number), y: RNK_Y + 0.3, w: w as number, h: E_ROW_H, fill: { color: 'D4EDBA' }, line: { color: BORDER, pt: 0.3 } });
    slide.addText(hdr as string, { x: execX + (ox as number) + 0.04, y: RNK_Y + 0.3, w: (w as number) - 0.08, h: E_ROW_H, fontSize: 7.5, bold: true, color: GREEN_TXT, fontFace: 'Helvetica Neue', valign: 'middle', align: align as 'left' | 'right' });
  });

  data.top10Execs.forEach((e, ri) => {
    const ry   = RNK_Y + 0.3 + (ri + 1) * E_ROW_H;
    const fill = ri % 2 === 1 ? ROW_ALT : WHITE;
    [[E_COL_RANK, 0], [E_COL_NOM, E_COL_RANK], [E_COL_CNT, E_COL_RANK + E_COL_NOM], [E_COL_TMO, E_COL_RANK + E_COL_NOM + E_COL_CNT]].forEach(([w, ox]) => {
      slide.addShape('rect', { x: execX + (ox as number), y: ry, w: w as number, h: E_ROW_H, fill: { color: fill }, line: { color: BORDER, pt: 0.3 } });
    });
    slide.addText(String(ri + 1).padStart(2, '0'), { x: execX + 0.04,                                      y: ry, w: E_COL_RANK - 0.08, h: E_ROW_H, fontSize: 8.5, color: GRAY_L,   fontFace: 'Consolas',       align: 'center', valign: 'middle' });
    slide.addText(e.nom,                           { x: execX + E_COL_RANK + 0.04,                          y: ry, w: E_COL_NOM - 0.08,  h: E_ROW_H, fontSize: 8.5, color: DARK,     fontFace: 'Helvetica Neue',  align: 'left',   valign: 'middle' });
    slide.addText(e.cnt.toLocaleString('es-CL'),   { x: execX + E_COL_RANK + E_COL_NOM + 0.04,             y: ry, w: E_COL_CNT - 0.08,  h: E_ROW_H, fontSize: 8.5, color: DARK,     fontFace: 'Consolas',       align: 'right',  valign: 'middle' });
    slide.addText(e.tCola,                         { x: execX + E_COL_RANK + E_COL_NOM + E_COL_CNT + 0.04, y: ry, w: E_COL_TMO - 0.08,  h: E_ROW_H, fontSize: 8.5, color: GRAY_MID, fontFace: 'Consolas',       align: 'right',  valign: 'middle' });
  });

  // ── Pie de página ────────────────────────────────────────────────────────
  slide.addShape('rect', { x: 0, y: H - FTR_H, w: W, h: FTR_H, fill: { color: 'F8FAFC' }, line: { color: BORDER, pt: 0.5 } });
  slide.addText(`BICE Hipotecaria · Contact Center · ${data.fechaGen}`, {
    x: PAD, y: H - FTR_H, w: W - PAD * 2, h: FTR_H,
    fontSize: 8, color: GRAY_L, fontFace: 'Consolas', valign: 'middle',
  });

  const fileName = `BiceHipotecaria_${data.periodoLabel.replace(/[\s–/]/g, '_')}.pptx`;
  await pres.writeFile({ fileName });
}
