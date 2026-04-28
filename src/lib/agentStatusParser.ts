import { parseCSVText } from './csvParser';

export type AgentStatusRow = {
  agentId: string;
  agentName: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  connectedSeconds: number;
  inQueueSeconds: number;
  outOfQueueSeconds: number;
};

// Parses "Xd Xh Xm Xs" — all parts optional, e.g. "3d 11h 57m 42s", "16h 41m 50s", "52m 20s"
export function parseAgentDuration(raw: string): number {
  if (!raw || raw.trim() === '') return 0;
  const s = raw.trim();
  let total = 0;
  const d = s.match(/(\d+)\s*d/);
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  const sec = s.match(/(\d+)\s*s/);
  if (d) total += parseInt(d[1]) * 86400;
  if (h) total += parseInt(h[1]) * 3600;
  if (m) total += parseInt(m[1]) * 60;
  if (sec) total += parseInt(sec[1]);
  return total;
}

// Parses "DD-MM-YYYY HH:MM" → "YYYY-MM-DD"
function parseAgentDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  const match = raw.trim().match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function findCol(headers: string[], candidates: string[]): string | null {
  const norm = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const normalized = c.toLowerCase().trim();
    const idx = norm.findIndex(h => h === normalized || h.includes(normalized));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export type AgentStatusParseResult = {
  rows: AgentStatusRow[];
  errors: string[];
};

export function parseAgentStatusCSV(text: string): AgentStatusParseResult {
  const { headers, rows } = parseCSVText(text);
  const errors: string[] = [];

  if (headers.length === 0) return { rows: [], errors: ['Archivo vacío.'] };

  const colAgentId   = findCol(headers, ['id del agente', 'agent id', 'agentid', 'id agente']);
  const colAgentName = findCol(headers, ['nombre del agente', 'agent name', 'nombre agente', 'agente', 'nombre']);
  const colStart     = findCol(headers, ['inicio del intervalo', 'start', 'inicio', 'inicio intervalo']);
  const colEnd       = findCol(headers, ['fin del intervalo', 'end', 'fin', 'fin intervalo']);
  const colConnected = findCol(headers, ['conectado', 'connected']);
  const colInQueue   = findCol(headers, ['en la cola', 'in queue', 'inqueue', 'en cola', 'encola']);
  const colOutQueue  = findCol(headers, ['fuera de la cola', 'out of queue', 'out queue', 'fuera de cola', 'fuerador cola']);

  const missing: string[] = [];
  if (!colAgentName) missing.push('Nombre del agente');
  if (!colConnected) missing.push('Conectado');
  if (!colInQueue)   missing.push('En la cola');
  if (!colOutQueue)  missing.push('Fuera de la cola');

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`No se encontraron columnas requeridas: ${missing.join(', ')}. Columnas detectadas: ${headers.join(', ')}`],
    };
  }

  const result: AgentStatusRow[] = [];

  for (const row of rows) {
    const agentName = colAgentName ? (row[colAgentName] ?? '').trim() : '';
    if (!agentName) continue;

    const connectedSeconds  = colConnected ? parseAgentDuration(row[colConnected] ?? '') : 0;
    const inQueueSeconds    = colInQueue   ? parseAgentDuration(row[colInQueue] ?? '')   : 0;
    const outOfQueueSeconds = colOutQueue  ? parseAgentDuration(row[colOutQueue] ?? '')  : 0;

    // Only include agents with actual connected time
    if (connectedSeconds === 0 && inQueueSeconds === 0 && outOfQueueSeconds === 0) continue;

    result.push({
      agentId:           colAgentId ? (row[colAgentId] ?? '').trim() : '',
      agentName,
      dateRangeStart:    colStart ? parseAgentDate(row[colStart] ?? '') : null,
      dateRangeEnd:      colEnd   ? parseAgentDate(row[colEnd] ?? '')   : null,
      connectedSeconds,
      inQueueSeconds,
      outOfQueueSeconds,
    });
  }

  if (result.length === 0) {
    errors.push('No se encontraron agentes con tiempo conectado.');
  }

  return { rows: result, errors };
}
