
El problema es que el archivo `src/lib/csvParser.ts` quedó corrupto. Parece que se mezcló el contenido del archivo con un tag `<dyad-write>`. Esto pasó porque en mi respuesta anterior, el archivo se cortó y luego intenté escribirlo de nuevo, pero algo salió mal.

Necesito reescribir el archivo `src/lib/csvParser.ts` completo y correctamente, asegurándome de que:
1. No haya tags `<dyad-write>` mezclados en el código
2. La función `filterOverlappingCalls` use `record.executive` (string) en lugar de `record.executives[0]`
3. Todo el código sea sintácticamente correcto

Voy a escribir el archivo completo de nuevo, limpio.</think> Perdón, el archivo `csvParser.ts` quedó corrupto con un tag de edición mezclado en el código. Lo reescribo completo y limpio:

<dyad-write path="src/lib/csvParser.ts" description="Complete clean csvParser.ts with all fixes">
// Parse CSV text into headers and rows
export function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Helper: parse a single CSV line (handles quoted fields)
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => parseLine(line));
  return { headers, rows };
}

// Helper: clean phone number
export function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/^sip:[^@]*/i, '')
    .replace(/^sip:/i, '')
    .replace(/@.*$/, '')
    .replace(/[^0-9+]/g, '')
    .replace(/^\+/, '');
}

// Helper: hash phone
export async function hashPhone(phone: string): Promise<string> {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(cleaned);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: mask phone
export function maskPhone(phone: string): string {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return '';
  if (cleaned.length <= 4) return cleaned;
  return cleaned.slice(0, 2) + '****' + cleaned.slice(-4);
}

// New function: Generate unique signature for deduplication
export async function generateCallSignature(
  callDate: string | null,
  callTime: string | null,
  aniHash: string,
  durationSeconds: number,
  callDirection: string,
  queueTimeSeconds: number,
  ivrTotalSeconds: number
): Promise<string> {
  if (!callDate || !callTime) return '';

  const baseString = `${callDate}|${callTime}|${aniHash}|${durationSeconds}|${callDirection}`;
  let fullString = baseString;
  if (!aniHash || aniHash.length < 8) {
    fullString += `|${queueTimeSeconds}|${ivrTotalSeconds}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(fullString);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// filterOverlappingCalls function
export function filterOverlappingCalls(records: any[]): { records: any[]; canceledCount: number } {
  let canceledCount = 0;
  const recordsByDateAndExecutive: Record<string, any[]> = {};
  
  for (const record of records) {
    if (!record.executive) continue;
    const key = `${record.callDate}_${record.executive}`;
    if (!recordsByDateAndExecutive[key]) {
      recordsByDateAndExecutive[key] = [];
    }
    recordsByDateAndExecutive[key].push(record);
  }
  
  const markedRecords = records.map(r => ({ ...r }));
  
  for (const key in recordsByDateAndExecutive) {
    const callsForExecutive = recordsByDateAndExecutive[key];
    callsForExecutive.sort((a, b) => {
      const timeA = a.callTime || '';
      const timeB = b.callTime || '';
      return timeA.localeCompare(timeB);
    });
    
    for (let i = 0; i < callsForExecutive.length; i++) {
      for (let j = i + 1; j < callsForExecutive.length; j++) {
        const callA = callsForExecutive[i];
        const callB = callsForExecutive[j];
        
        if (callB.callTime > callA.callTime) {
          const timeASeconds = timeToSeconds(callA.callTime) + (callA.durationSeconds || 0);
          const timeBSeconds = timeToSeconds(callB.callTime);
          if (timeBSeconds >= timeASeconds) break;
        }
        
        const markedA = markedRecords.find(r => r.originalCallId === callA.originalCallId);
        const markedB = markedRecords.find(r => r.originalCallId === callB.originalCallId);
        
        if (markedA && markedB && !markedA.isOverlapping && !markedB.isOverlapping) {
          markedB.isOverlapping = true;
          canceledCount++;
        }
      }
    }
  }
  
  return { records: markedRecords, canceledCount };
}

// Helper: convert time string to seconds
function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2) return 0;
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

// Calculate date range from records
export function calculateDateRangeFromRecords(records: any[]): { start: string; end: string } {
  const dates = records
    .map(r => r.callDate || r.call_date)
    .filter((d): d is string => !!d)
    .sort();
  
  if (dates.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    return { start: today, end: today };
  }
  
  return { start: dates[0], end: dates[dates.length - 1] };
}

// Detect columns from CSV headers
export function detectColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const normalized = headers.map(h => h.toLowerCase().trim());
  
  const findCol = (candidates: string[]): string | undefined => {
    for (const c of candidates) {
      const idx = normalized.findIndex(h => h === c || h.includes(c));
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  };

  map.date = findCol(['fecha', 'date', 'call_date']) || '';
  map.time = findCol(['hora', 'time', 'call_time', 'timestamp']) || '';
  map.executive = findCol(['ejecutivo', 'executive', 'agente', 'agent', 'usuario', 'user']) || '';
  map.duration = findCol(['duración', 'duration', 'duracion', 'tiempo']) || '';
  map.direction = findCol(['dirección', 'direction', 'direccion', 'tipo', 'type']) || '';
  map.queue = findCol(['cola', 'queue', 'grupo']) || '';
  map.ani = findCol(['ani', 'teléfono', 'telefono', 'phone', 'número', 'numero']) || '';
  map.attended = findCol(['atendida', 'attended', 'contestada', 'answered']) || '';
  map.handleTime = findCol(['manejo', 'handle_time', 'handle time', 'tiempo manejo']) || '';
  map.queueTime = findCol(['tiempo cola', 'queue_time', 'queue time', 'espera']) || '';
  map.alertTime = findCol(['tiempo alerta', 'alert_time', 'alert time', 'timbrado']) || '';
  map.alertSegments = findCol(['segmentos alerta', 'alert_segments', 'alert segments', 'intentos']) || '';
  map.flowExit = findCol(['salida flujo', 'flow_exit', 'flow exit', 'ivr exit']) || '';
  map.alertedUsers = findCol(['usuarios alertados', 'alerted_users', 'alerted users']) || '';
  map.holdTime = findCol(['hold', 'hold_time', 'hold time', 'espera activa']) || '';
  map.acw = findCol(['acw', 'after call work', 'post llamada']) || '';
  map.ivrTime = findCol(['ivr', 'ivr_time', 'ivr time', 'tiempo ivr']) || '';
  
  return map;
}

// Validate that required columns are present
export function validateColumns(columnMap: Record<string, string>): string[] {
  const required = ['date', 'time', 'executive', 'duration', 'direction'];
  const missing: string[] = [];
  
  for (const key of required) {
    if (!columnMap[key]) {
      missing.push(key);
    }
  }
  
  return missing;
}

// Transform raw rows into parsed records
export async function transformRows(
  rows: any[],
  columnMap: Record<string, string>,
  processedSignatures?: Set<string>
): Promise<{ records: any[]; duplicateCount: number; anomalies: any[] }> {
  const records: any[] = [];
  const anomalies: any[] = [];
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const callDate = row[columnMap.date] || null;
    const callTime = row[columnMap.time] || null;
    const executive = row[columnMap.executive] || 'SIN ATENDER';
    const durationSeconds = parseInt(row[columnMap.duration]) || 0;
    const direction = row[columnMap.direction] || '';
    const queue = row[columnMap.queue] || '';
    const ani = row[columnMap.ani] || '';
    const attended = row[columnMap.attended]?.toLowerCase() === 'true' || row[columnMap.attended]?.toLowerCase() === 'sí' || row[columnMap.attended]?.toLowerCase() === 'si';
    const handleTimeSeconds = parseInt(row[columnMap.handleTime]) || 0;
    const queueTimeSeconds = parseInt(row[columnMap.queueTime]) || 0;
    const alertTimeSeconds = parseInt(row[columnMap.alertTime]) || 0;
    const alertSegments = parseInt(row[columnMap.alertSegments]) || 1;
    const flowExit = row[columnMap.flowExit]?.toLowerCase() !== 'false';
    const alertedUsers = row[columnMap.alertedUsers] || '';
    const holdTimeSeconds = parseInt(row[columnMap.holdTime]) || 0;
    const acwSeconds = parseInt(row[columnMap.acw]) || 45;
    const ivrTimeSeconds = parseInt(row[columnMap.ivrTime]) || 0;

    const hash = await hashPhone(ani);
    const masked = maskPhone(ani);

    if (processedSignatures && callDate && callTime) {
      const signature = await generateCallSignature(
        callDate,
        callTime,
        hash,
        durationSeconds,
        direction,
        queueTimeSeconds,
        ivrTimeSeconds
      );

      if (processedSignatures.has(signature)) {
        duplicateCount++;
        continue;
      }
    }

    records.push({
      callDate,
      callTime,
      callHour: callTime ? parseInt(callTime.split(':')[0]) : null,
      executive,
      originalCallId: `${callDate}_${callTime}_${i}`,
      aniHash: hash,
      aniMasked: masked,
      callDirection: direction,
      queue,
      durationSeconds,
      durationFormatted: formatDuration(durationSeconds),
      attended,
      exportComplete: true,
      isOverlapping: false,
      queueTimeSeconds,
      handleTimeSeconds,
      alertSegments,
      alertTimeSeconds,
      flowExit,
      alertedUsers,
      usersNotRespond: '',
      abandonType: null,
      isBounce: false,
      holdTimeSeconds,
      acwSeconds,
      ivrTimeSeconds,
      timeToAbandon: null,
      exitReason: null,
      isDuplicate: false,
    });
  }

  return { records, duplicateCount, anomalies };
}

// Format duration helper
function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Type exports
export type RawCallRecord = Record<string, string>;
export type ParsedCallRecord = {
  callDate: string | null;
  callTime: string | null;
  callHour: number | null;
  executive: string;
  originalCallId: string;
  aniHash: string;
  aniMasked: string;
  callDirection: string;
  queue: string;
  durationSeconds: number;
  durationFormatted: string;
  attended: boolean;
  exportComplete: boolean;
  isOverlapping: boolean;
  queueTimeSeconds: number;
  handleTimeSeconds: number;
  alertSegments: number;
  alertTimeSeconds: number;
  flowExit: boolean;
  alertedUsers: string;
  usersNotRespond: string;
  abandonType: string | null;
  isBounce: boolean;
  holdTimeSeconds: number;
  acwSeconds: number;
  ivrTimeSeconds: number;
  timeToAbandon: number | null;
  exitReason: string | null;
  isDuplicate: boolean;
};