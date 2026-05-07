import { parseCSVText } from './csvParser';
import { getBusinessHoursOverlap } from './businessHours';

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
    // First try exact match
    let idx = norm.findIndex(h => h === normalized);
    if (idx !== -1) return headers[idx];

    // Then try substring match
    idx = norm.findIndex(h => h.includes(normalized));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export type AgentConnectivityRawRow = {
  agentId: string;
  agentName: string;
  startTime: string; // ISO timestamp string
  endTime: string;   // ISO timestamp string
  status: string;
  durationRaw: number; // seconds (unclipped, no BH filter)
};

export type AgentStatusParseResult = {
  rows: AgentStatusRow[];
  errors: string[];
  rawEvents?: AgentConnectivityRawRow[];
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
      agentId:           colAgentId ? (row[colAgentId] ?? '').trim() : agentName,
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
  const rawEvents: AgentConnectivityRawRow[] = [];

  console.log('[TimelineFormat] Detectadas columnas:', {
    colAgentId,
    colAgentName,
    colStart,
    colEnd,
    colStatus,
    totalRows: rows.length,
  });

  // Log first few raw date strings so we can diagnose format issues
  const sampleDates = rows.slice(0, 3).map(r => ({
    start: (r[colStart] ?? '').trim(),
    end:   (r[colEnd]   ?? '').trim(),
    status: (r[colStatus] ?? '').trim(),
  }));
  console.log('[TimelineFormat] Muestra de fechas del CSV (primeras 3 filas):', sampleDates);

  // Group by agent and accumulate time by status
  const agentMap = new Map<string, {
    name: string;
    id: string;
    inQueueSeconds: number;
    connectedSeconds: number;
    minDate: string | null;
    maxDate: string | null;
  }>();

  let processedCount = 0;
  let skippedMissingData = 0;
  let skippedDesconectado = 0;
  let skippedInvalidDates = 0;
  let skippedZeroDuration = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const agentName = colAgentName ? (row[colAgentName] ?? '').trim() : '';
    const agentId = colAgentId ? (row[colAgentId] ?? '').trim() : agentName;
    const status = (row[colStatus] ?? '').trim();
    const startStr = (row[colStart] ?? '').trim();
    const endStr = (row[colEnd] ?? '').trim();

    if (!agentName || !startStr || !endStr) {
      skippedMissingData++;
      if (i < 3) {
        console.log(`[TimelineFormat] Fila ${i} - Datos faltantes:`, { agentName, startStr, endStr });
      }
      continue;
    }

    // Skip "Desconectado" status — not stored per schema design
    if (status === 'Desconectado') {
      skippedDesconectado++;
      continue;
    }

    const startTime = parseTimelineDateTime(startStr);
    const endTime = parseTimelineDateTime(endStr);

    const startInvalid = !startTime || isNaN(startTime.getTime());
    const endInvalid   = !endTime   || isNaN(endTime.getTime());

    if (startInvalid || endInvalid) {
      skippedInvalidDates++;
      if (i < 5) {
        console.log(`[TimelineFormat] Fila ${i} - Fechas inválidas:`, {
          startStr,
          endStr,
          startTimeParsed: startTime && !isNaN(startTime.getTime()) ? startTime.toISOString() : 'invalid',
          endTimeParsed:   endTime   && !isNaN(endTime.getTime())   ? endTime.toISOString()   : 'invalid',
          note: 'Verifica que el formato sea: DD-MM-YYYY HH:MM o M/DD/YY HH:MM:SS'
        });
      }
      continue;
    }

    const totalDurationSeconds = Math.max(0, (endTime.getTime() - startTime.getTime()) / 1000);
    if (totalDurationSeconds === 0) {
      skippedZeroDuration++;
      if (i < 3) {
        console.log(`[TimelineFormat] Fila ${i} - Duración cero:`, { startStr, endStr });
      }
      continue;
    }

    // Collect raw event with full timestamps (no BH filter) for Gantt / adherence charts
    rawEvents.push({
      agentId,
      agentName,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status,
      durationRaw: totalDurationSeconds,
    });

    // HARD CUT: Apply business hours filter for aggregated totals only
    const overlap = getBusinessHoursOverlap(startTime, endTime);
    if (!overlap) {
      if (i < 3) {
        console.log(`[TimelineFormat] Fila ${i} - Fuera de horario operativo (no cuenta en totales):`, {
          agentName,
          startStr: startTime.toISOString(),
          endStr: endTime.toISOString(),
        });
      }
      continue;
    }

    const durationSeconds = Math.max(0, (overlap.end.getTime() - overlap.start.getTime()) / 1000);
    const wasTruncated = durationSeconds < totalDurationSeconds;

    if (i < 3) {
      console.log(`[TimelineFormat] Fila ${i} - Procesada:`, {
        agentName,
        status,
        durationSeconds,
        originalDuration: totalDurationSeconds,
        wasTruncated,
      });
    }

    processedCount++;

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
    const startDate = overlap.start.toISOString().split('T')[0];
    const endDate = overlap.end.toISOString().split('T')[0];

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

  console.log('[TimelineFormat] Resumen de procesamiento:', {
    totalRows: rows.length,
    processedCount,
    skippedMissingData,
    skippedDesconectado,
    skippedInvalidDates,
    skippedZeroDuration,
    uniqueAgents: agentMap.size,
    rawEventsCaptured: rawEvents.length,
  });

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

  console.log('[TimelineFormat] Resultado final:', {
    agentsWithTime: result.length,
    totalConnectedSeconds: result.reduce((sum, a) => sum + a.connectedSeconds, 0),
  });

  if (result.length === 0 && rawEvents.length === 0) {
    return {
      rows: [],
      errors: ['No se encontraron agentes con tiempo de presencia en el reporte de timeline.'],
    };
  }

  return { rows: result, errors: [], rawEvents };
}

// Parse timeline datetime format - supports multiple formats:
// - DD-MM-YYYY HH:MM (with hyphens)
// - D/MM/YY HH:MM:SS or MM/DD/YY HH:MM:SS (with slashes, Genesys format)
// - HH:MM:SS (time only, assume today)
function parseTimelineDateTime(dateStr: string): Date | null {
  if (!dateStr) return null;

  const s = dateStr.trim();

  // Try DD-MM-YYYY HH:MM format (with hyphens)
  let match = s.match(/^(\d{1,2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    const paddedHour = String(parseInt(hour, 10)).padStart(2, '0');
    const paddedMinute = String(parseInt(minute, 10)).padStart(2, '0');
    const d = new Date(`${year}-${month}-${day}T${paddedHour}:${paddedMinute}:${second || '00'}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Try D/MM/YY HH:MM:SS format (Genesys Latin American format: Day/Month/Year)
  // Example: "6/04/26 08:02:29" = April 6th, 2026
  match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{2})?/);
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    // Convert 2-digit year to 4-digit: 26 → 2026, 99 → 1999
    const fullYear = parseInt(year) <= 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
    const paddedMonth = String(parseInt(month, 10)).padStart(2, '0');
    const paddedDay = String(parseInt(day, 10)).padStart(2, '0');
    const paddedHour = String(parseInt(hour, 10)).padStart(2, '0');
    const paddedMinute = String(parseInt(minute, 10)).padStart(2, '0');
    const paddedSecond = second ? String(parseInt(second, 10)).padStart(2, '0') : '00';
    const d = new Date(`${fullYear}-${paddedMonth}-${paddedDay}T${paddedHour}:${paddedMinute}:${paddedSecond}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Try HH:MM:SS format (assume today)
  match = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{2}))?$/);
  if (match) {
    const [, hour, minute, second] = match;
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                       parseInt(hour), parseInt(minute), parseInt(second || '0'));
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}
