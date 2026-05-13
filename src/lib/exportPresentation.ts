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
  top10Execs: { nom: string; cnt: number; tmo: string }[];

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
      [`{{E${i + 1}_TMO}}`, data.top10Execs[i]?.tmo ?? ''],
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

  return `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" preserveAspectRatio="none">
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

  return `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" preserveAspectRatio="none">
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

export async function exportPPTX(html: string, periodoLabel: string): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    position: fixed; left: -9999px; top: -9999px;
    width: 1920px; height: 1080px;
    border: none; background: white;
  `;
  document.body.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.onload = () => {
      setTimeout(resolve, 800);
    };
    iframe.srcdoc = html;
  });

  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc) throw new Error('No se pudo acceder al iframe');

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(iframeDoc.body, {
    backgroundColor: '#ffffff',
    width: 1920,
    height: 1080,
    scale: 1,
    useCORS: false,
    logging: false,
    windowWidth: 1920,
    windowHeight: 1080,
  });

  document.body.removeChild(iframe);

  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';

  const slide = pres.addSlide();
  slide.addImage({
    data: canvas.toDataURL('image/png'),
    x: 0, y: 0,
    w: '100%', h: '100%',
  });

  const fileName = `BiceHipotecaria_${periodoLabel.replace(/[\s–/]/g, '_')}.pptx`;
  await pres.writeFile({ fileName });
}
