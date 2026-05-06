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

  // Try aggregated format first (Conectado, En la cola, Fuera de la cola)
  const colAgentId   = findCol(headers, ['id del agente', 'agent id', 'agentid', 'id agente']);
  const colAgentName = findCol(headers, ['nombre del agente', 'agent name', 'nombre agente', 'agente', 'nombre']);
  const colStart     = findCol(headers, ['inicio del intervalo', 'start', 'inicio', 'inicio intervalo']);
  const colEnd       = findCol(headers, ['fin del intervalo', 'end', 'fin', 'fin intervalo']);
  const colConnected = findCol(headers, ['conectado', 'connected']);
  const colInQueue   = findCol(headers, ['en la cola', 'in queue', 'inqueue', 'en cola', 'encola']);
  const colOutQueue  = findCol(headers, ['fuera de la cola', 'out of queue', 'out queue', 'fuera de cola', 'fuerador cola']);

  // Check if this is timeline format (Hora de inicio, Hora de finalización, Estado principal)
  const colTimelineStart  = findCol(headers, ['hora de inicio', 'start time', 'start_time']);
  const colTimelineEnd    = findCol(headers, ['hora de finalización', 'hora finalizacion', 'end time', 'end_time']);
  const colStatus         = findCol(headers, ['estado principal', 'primary status', 'status']);

  // If timeline format is detected, process it differently
  if (colTimelineStart && colTimelineEnd && colStatus) {
    return parseTimelineFormat(rows, headers, colAgentId, colAgentName, colTimelineStart, colTimelineEnd, colStatus);
  }

  // Otherwise, expect aggregated format
  const missing: string[] = [];
  if (!colAgentName) missing.push('Nombre del agente');
  if (!colConnected) missing.push('Conectado');
  if (!colInQueue)   missing.push('En la cola');
  if (!colOutQueue)  missing.push('Fuera de la cola');

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`No se encontraron columnas requeridas: ${missing.join(', ')}. Columnas detectadas: ${headers.join(', ')}.

Nota: Se detectó que podría ser un reporte de timeline (Hora de inicio/finalización).
Para esos archivos, por favor usa: Importar → Conectividad de Agentes (Timeline).`],
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

// Parse timeline format (Hora de inicio, Hora de finalización, Estado principal)
function parseTimelineFormat(
  rows: Record<string, string>[],
  headers: string[],
  colAgentId: string | null,
  colAgentName: string | null,
  colStart: string,
  colEnd: string,
  colStatus: string
): AgentStatusParseResult {
  const result: AgentStatusRow[] = [];

  // Group by agent and accumulate time by status
  const agentMap = new Map<string, {
    name: string;
    id: string;
    inQueueSeconds: number;
    connectedSeconds: number;
    minDate: string | null;
    maxDate: string | null;
  }>();

  for (const row of rows) {
    const agentName = colAgentName ? (row[colAgentName] ?? '').trim() : '';
    const agentId = colAgentId ? (row[colAgentId] ?? '').trim() : agentName;
    const status = (row[colStatus] ?? '').trim();
    const startStr = (row[colStart] ?? '').trim();
    const endStr = (row[colEnd] ?? '').trim();

    if (!agentName || !startStr || !endStr) continue;

    // Skip "Desconectado" status
    if (status === 'Desconectado') continue;

    const startTime = parseTimelineDateTime(startStr);
    const endTime = parseTimelineDateTime(endStr);

    if (!startTime || !endTime) continue;

    const durationSeconds = Math.max(0, (endTime.getTime() - startTime.getTime()) / 1000);
    if (durationSeconds === 0) continue;

    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, {
        name: agentName,
        id: agentId,
        inQueueSeconds: 0,
        connectedSeconds: 0,
        minDate: null,
        maxDate: null,
      });
    }

    const agent = agentMap.get(agentId)!;
    const startDate = startTime.toISOString().split('T')[0];
    const endDate = endTime.toISOString().split('T')[0];

    if (!agent.minDate || startDate < agent.minDate) agent.minDate = startDate;
    if (!agent.maxDate || endDate > agent.maxDate) agent.maxDate = endDate;

    // Count time in "En la cola" or "En queue" as inQueue, rest as connected
    if (status.toLowerCase().includes('cola') || status.toLowerCase().includes('queue')) {
      agent.inQueueSeconds += durationSeconds;
    } else if (status.toLowerCase().includes('disponible')) {
      agent.connectedSeconds += durationSeconds;
    } else {
      // Other statuses (Comida, etc) count as connected but not in queue
      agent.connectedSeconds += durationSeconds;
    }
  }

  for (const agent of agentMap.values()) {
    if (agent.connectedSeconds === 0 && agent.inQueueSeconds === 0) continue;

    result.push({
      agentId: agent.id,
      agentName: agent.name,
      dateRangeStart: agent.minDate,
      dateRangeEnd: agent.maxDate,
      connectedSeconds: agent.connectedSeconds + agent.inQueueSeconds,
      inQueueSeconds: agent.inQueueSeconds,
      outOfQueueSeconds: agent.connectedSeconds,
    });
  }

  if (result.length === 0) {
    return {
      rows: [],
      errors: ['No se encontraron agentes con tiempo de presencia en el reporte de timeline.'],
    };
  }

  return { rows: result, errors: [] };
}

// Parse timeline datetime format (DD-MM-YYYY HH:MM or HH:MM)
function parseTimelineDateTime(dateStr: string): Date | null {
  if (!dateStr) return null;

  const s = dateStr.trim();

  // Try DD-MM-YYYY HH:MM format
  let match = s.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`);
  }

  // Try HH:MM:SS format (assume today)
  match = s.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, hour, minute, second] = match;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                    parseInt(hour), parseInt(minute), parseInt(second || '0'));
  }

  return null;
}
