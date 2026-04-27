export type RawCallRecord = {
  [key: string]: string;
};

export type ParsedCallRecord = {
  originalCallId: string;
  rawDate: string;
  callDate: string | null;
  callTime: string | null;
  callHour: number | null;
  executives: string[];
  rawPhone: string;
  cleanPhone: string;
  callDirection: string;
  queue: string;
  rawDuration: string;
  durationSeconds: number;
  durationFormatted: string;
  rawUser: string;
  attended: boolean;
  exportComplete: boolean;
};

export type ParseResult = {
  records: ParsedCallRecord[];
  errors: string[];
  columnMap: Record<string, string>;
};

// Known column name variants
const COLUMN_ALIASES: Record<string, string[]> = {
  startTime: ['fecha', 'fecha inicio', 'start time', 'hora inicio', 'timestamp', 'fecha/hora', 'fecha y hora', 'inicio'],
  callId: ['id llamada', 'call id', 'id', 'id de llamada', 'identificador'],
  direction: ['dirección', 'direccion', 'direction', 'tipo', 'tipo llamada', 'sentido'],
  queue: ['cola', 'queue', 'departamento', 'department', 'grupo', 'group'],
  duration: ['duración', 'duracion', 'duration', 'tiempo', 'tiempo de llamada'],
  users: ['usuarios', 'users', 'agente', 'agentes', 'ejecutivo', 'ejecutivos', 'user', 'agent'],
  phone: ['ani', 'teléfono', 'telefono', 'phone', 'número', 'numero', 'caller', 'número llamante'],
  exportComplete: ['exportación completa', 'exportacion completa', 'export complete', 'completa', 'complete'],
};

function findColumn(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map(h => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = normalized.findIndex(h => h === alias || h.includes(alias));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function detectColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = findColumn(headers, aliases);
    if (found) map[key] = found;
  }
  return map;
}

export function validateColumns(columnMap: Record<string, string>): string[] {
  const required = ['startTime', 'direction', 'queue', 'duration'];
  const missing: string[] = [];
  for (const key of required) {
    if (!columnMap[key]) missing.push(key);
  }
  return missing;
}

// Parses semicolon-delimited CSV with quoted fields
export function parseCSVText(text: string): { headers: string[]; rows: RawCallRecord[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ';' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseLine(lines[0]);
  const rows: RawCallRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const row: RawCallRecord = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

// Duration normalization: supports "19m 10s", "38s", "1m 5s", "00:01:31", "1:05", "90"
export function parseDurationToSeconds(raw: string): number {
  if (!raw || raw.trim() === '') return 0;
  const s = raw.trim();

  // HH:MM:SS or MM:SS
  if (/^\d+:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }

  // Xm Ys or XmYs
  const minsMatch = s.match(/(\d+)\s*m\s*(\d+)\s*s/i);
  if (minsMatch) return parseInt(minsMatch[1]) * 60 + parseInt(minsMatch[2]);

  // Xm only
  const mOnlyMatch = s.match(/^(\d+)\s*m$/i);
  if (mOnlyMatch) return parseInt(mOnlyMatch[1]) * 60;

  // Xs only
  const sOnlyMatch = s.match(/^(\d+)\s*s$/i);
  if (sOnlyMatch) return parseInt(sOnlyMatch[1]);

  // Plain number (seconds)
  if (/^\d+$/.test(s)) return parseInt(s);

  return 0;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Parses "DD/MM/YY HH:MM" or "DD/MM/YYYY HH:MM:SS" etc.
export function parseDateTime(raw: string): { callDate: string | null; callTime: string | null; callHour: number | null } {
  if (!raw || raw.trim() === '') return { callDate: null, callTime: null, callHour: null };

  const s = raw.trim();
  // Split on space — first part is date, rest is time
  const spaceIdx = s.indexOf(' ');
  if (spaceIdx === -1) return { callDate: null, callTime: null, callHour: null };

  const datePart = s.substring(0, spaceIdx);
  const timePart = s.substring(spaceIdx + 1);

  // Parse date DD/MM/YY or DD/MM/YYYY
  const dateBits = datePart.split('/');
  if (dateBits.length !== 3) return { callDate: null, callTime: null, callHour: null };

  let [dd, mm, yy] = dateBits;
  if (yy.length === 2) {
    const yr = parseInt(yy);
    yy = yr > 50 ? `19${yy}` : `20${yy}`;
  }
  const callDate = `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

  // Parse time HH:MM or HH:MM:SS
  const timeBits = timePart.split(':');
  const callTime = timePart.substring(0, 8); // take up to HH:MM:SS
  const callHour = timeBits.length >= 1 ? parseInt(timeBits[0]) : null;

  return { callDate, callTime, callHour: isNaN(callHour ?? NaN) ? null : callHour };
}

// Remove tel:, sip:, spaces, dashes, +, etc. leaving only digits
export function cleanPhoneNumber(raw: string): string {
  if (!raw || raw.trim() === '') return '';
  return raw
    .replace(/^tel:/i, '')
    .replace(/^sip:[^@]*/i, '')  // sip:number@domain -> keep number part
    .replace(/^sip:/i, '')
    .replace(/@.*$/, '')          // remove domain part if any
    .replace(/[^0-9+]/g, '')
    .replace(/^\+/, '');
}

// Consistent hash using a simple deterministic function (no crypto needed)
export async function hashPhone(phone: string): Promise<string> {
  if (!phone) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode('callhash:' + phone);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// Mask phone: show last 4 digits only e.g. +56 9 XXXX 4567
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone ? 'XXXX' : '';
  const last4 = phone.slice(-4);
  const masked = 'X'.repeat(Math.max(0, phone.length - 4));
  return masked + last4;
}

export function parseExecutives(raw: string): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw.split(';').map(e => e.trim()).filter(e => e !== '');
}

export function isExportComplete(raw: string): boolean {
  const s = (raw ?? '').trim().toLowerCase();
  return s === 'sí' || s === 'si' || s === 'yes' || s === '1' || s === 'true' || s === 'completa';
}

const VALID_QUEUES = new Set([
  'BiceHipotecaria - SAC',
  'CN - SAC',
  'BiceHipotecaria - Mora Ordinaria',
  'BiceHipotecaria CallCenter',
  'BiceHipotecaria - Cobranza Judicial',
  'CN - Mora Ordinaria',
  'CN - Cobranza judicial',
]);

export async function transformRows(
  rows: RawCallRecord[],
  columnMap: Record<string, string>,
  processedSignatures?: Set<string>
): Promise<{ records: ParsedCallRecord[]; duplicateCount: number }> {
  const results: ParsedCallRecord[] = [];
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const rawDate = columnMap.startTime ? (row[columnMap.startTime] ?? '') : '';
    const { callDate, callTime, callHour } = parseDateTime(rawDate);

    const rawDuration = columnMap.duration ? (row[columnMap.duration] ?? '') : '';
    const durationSeconds = parseDurationToSeconds(rawDuration);
    const durationFormatted = formatDuration(durationSeconds);

    const rawUser = columnMap.users ? (row[columnMap.users] ?? '') : '';
    const executives = parseExecutives(rawUser);
    const attended = executives.length > 0;

    const rawPhone = columnMap.phone ? (row[columnMap.phone] ?? '') : '';
    const cleanPhone = cleanPhoneNumber(rawPhone);

    // Check for duplicates if signatures provided
    if (processedSignatures && callDate && callTime) {
      const hash = await hashPhone(cleanPhone);
      const signature = `${hash}|${callDate}|${callTime}`;
      if (processedSignatures.has(signature)) {
        duplicateCount++;
        continue;
      }
    }

    const exportComplete = columnMap.exportComplete
      ? isExportComplete(row[columnMap.exportComplete] ?? '')
      : false;

    const direction = (columnMap.direction ? row[columnMap.direction] : '') ?? '';
    const rawQueue = ((columnMap.queue ? row[columnMap.queue] : '') ?? '').trim();
    const isOutbound = direction.toLowerCase() === 'outbound' || direction.toLowerCase() === 'saliente';

    let queue: string;
    if (VALID_QUEUES.has(rawQueue)) {
      queue = rawQueue;
    } else if (isOutbound) {
      queue = 'Saliente';
    } else if (rawQueue === '' && executives.length === 0) {
      queue = 'No asignada';
    } else {
      continue;
    }

    // Use row index as original call id if no dedicated field
    const originalCallId = columnMap.callId
      ? (row[columnMap.callId] ?? String(i))
      : String(i);

    const record: ParsedCallRecord = {
      originalCallId,
      rawDate,
      callDate,
      callTime,
      callHour,
      executives: attended ? executives : ['SIN ATENDER'],
      rawPhone,
      cleanPhone,
      callDirection: direction,
      queue,
      rawDuration,
      durationSeconds,
      durationFormatted,
      rawUser,
      attended,
      exportComplete,
    };

    results.push(record);
  }

  return { records: results, duplicateCount };
}
