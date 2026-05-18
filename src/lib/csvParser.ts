import type { SupabaseClient } from '@supabase/supabase-js';

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
  isOverlapping: boolean;
  uniqueCallIdentifier: string;
  queueTimeSeconds: number;
  handleTimeSeconds: number;
  alertSegments: number;
  alertTimeSeconds: number;
  flowExit: boolean;
  alertedUsers: string;
  abandonType: string | null;
  isBounce: boolean;
  holdTimeSeconds: number;
  acwSeconds: number;
  ivrTotalSeconds: number;
  usersNotRespond: string;
  transfers: number;
  abandonTimeSeconds: number;
  conversationTotalSeconds: number;
  disconnectionType: string;
  finalizationDate: string | null;
  partialResultTimestamp: string | null;
  filters: string;
  campaign: string;
  conversationInitiator: string;
};

export type AnomalyEntry = {
  type: string;
  callId?: string;
  rawHandleTime?: number;
  durationSeconds?: number;
  queueTimeSeconds?: number;
  alertedUsers?: string;
  flowExit?: boolean;
  actionTaken: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: Date;
};

export type ParseResult = {
  records: ParsedCallRecord[];
  errors: string[];
  columnMap: Record<string, string>;
  anomalies?: AnomalyEntry[];
  auditSummary?: {
    totalAnomalies: number;
    critical: number;
  };
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
  queueTime: ['total de cola', 'tiempo de cola', 'queue time', 'wait time', 'tiempo en cola'],
  handleTime: ['manejo total', 'handle time', 'total handle', 'tiempo de manejo'],
  alertSegments: ['segmentos de alerta', 'alert segments', 'intentos', 'intentos de entrega'],
  alertTime: ['total de alertas', 'alert time', 'ring time', 'tiempo de alerta', 'tiempo de timbre'],
  flowExit: ['salida de flujo', 'flow exit', 'ivr exit', 'salida ivr'],
  alertedUsers: ['usuarios - alertados', 'alerted users', 'agentes alertados', 'usuarios alertados'],
  ivrTotal: ['ivr total', 'ivr time', 'tiempo ivr', 'total ivr'],
  usersNotRespond: ['usuarios - no responden', 'users not respond', 'no responden', 'usuarios sin respuesta'],
  transfers: ['transferencias', 'transfers', 'derivaciones'],
  abandonTime: ['tiempo en abandonar', 'abandon time', 'tiempo abandono', 'wait before abandon'],
  conversationTotal: ['conversación total', 'conversation total', 'total conversation', 'tiempo conversación'],
  disconnectionType: ['tipo de desconexión', 'tipo desconexion', 'disconnection type', 'tipo'],
  finalizationDate: ['fecha de finalización', 'fecha finalizacion', 'finalization date', 'fecha fin'],
  partialResultTimestamp: ['marca de hora del resultado parcial', 'partial result timestamp', 'resultado parcial'],
  filters: ['filtros', 'filters'],
  campaign: ['campaña', 'campaign'],
  conversationInitiator: ['iniciador de conversación', 'conversation initiator', 'iniciador'],
};

function findColumn(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map(h => h.toLowerCase().trim());
  for (const alias of aliases) {
    // First try exact match
    const exactIdx = normalized.findIndex(h => h === alias);
    if (exactIdx !== -1) return headers[exactIdx];

    // Then try substring match (but not if it's part of a longer compound column)
    const idx = normalized.findIndex(h => h.includes(alias) && !h.includes('-'));
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

// Detects delimiter: tab (TSV) or semicolon (CSV)
function detectDelimiter(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  return tabCount > semiCount ? '\t' : ';';
}

export function parseCSVText(text: string): { headers: string[]; rows: RawCallRecord[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);

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
      } else if (ch === delimiter && !inQuotes) {
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

export function parseDateTime(raw: string): { callDate: string | null; callTime: string | null; callHour: number | null } {
  if (!raw || raw.trim() === '') return { callDate: null, callTime: null, callHour: null };

  const s = raw.trim();
  const spaceIdx = s.indexOf(' ');
  if (spaceIdx === -1) return { callDate: null, callTime: null, callHour: null };

  const datePart = s.substring(0, spaceIdx);
  const timePart = s.substring(spaceIdx + 1);

  const dateBits = datePart.split('/');
  if (dateBits.length !== 3) return { callDate: null, callTime: null, callHour: null };

  const [dd, mm] = dateBits;
  let yy = dateBits[2];
  if (yy.length === 2) {
    const yr = parseInt(yy);
    yy = yr > 50 ? `19${yy}` : `20${yy}`;
  }
  const callDate = `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

  const timeBits = timePart.split(':');
  const callTime = timePart.substring(0, 8);
  const callHour = timeBits.length >= 1 ? parseInt(timeBits[0]) : null;

  return { callDate, callTime, callHour: isNaN(callHour ?? NaN) ? null : callHour };
}

export function cleanPhoneNumber(raw: string): string {
  if (!raw || raw.trim() === '') return '';
  return raw
    .replace(/^tel:/i, '')
    .replace(/^sip:([^@]*)@.*$/i, '$1')
    .replace(/^sip:/i, '')
    .replace(/@.*$/, '')
    .replace(/[^0-9+]/g, '')
    .replace(/^\+/, '');
}

export async function hashPhone(phone: string): Promise<string> {
  if (!phone) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode('callhash:' + phone);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

export async function generateUniqueCallId(
  aniHash: string,
  callDate: string | null,
  callTime: string | null,
  durationSeconds: number
): Promise<string> {
  if (!aniHash || !callDate || !callTime) return '';
  const combined = `${aniHash}|${callDate}|${callTime}|${durationSeconds}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

export function calculateDateRangeFromRecords(
  records: unknown[]
): { start: string | null; end: string | null } {
  const dates = records
    .map((r: unknown) => (r as Record<string, unknown>)?.call_date)
    .filter((d: unknown): d is string => typeof d === 'string')
    .sort();

  if (dates.length === 0) {
    return { start: null, end: null };
  }

  return {
    start: dates[0],
    end: dates[dates.length - 1],
  };
}

const PROGRESS_CHUNK = 500;

export async function transformRows(
  rows: RawCallRecord[],
  columnMap: Record<string, string>,
  onProgress?: (processed: number, total: number) => void
): Promise<{ records: ParsedCallRecord[]; duplicateCount: number; anomalies: typeof anomalies }> {
  const anomalies: Array<{
    type: string;
    callId?: string;
    rawHandleTime?: number;
    durationSeconds?: number;
    queueTimeSeconds?: number;
    alertedUsers?: string;
    flowExit?: boolean;
    actionTaken: string;
    severity?: 'CRITICAL' | 'WARNING' | 'INFO';
    timestamp: Date;
  }> = [];
  const results: ParsedCallRecord[] = [];
  const duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const rawDate = columnMap.startTime ? (row[columnMap.startTime] ?? '') : '';
    const { callDate, callTime, callHour } = parseDateTime(rawDate);

    const rawDuration = columnMap.duration ? (row[columnMap.duration] ?? '') : '';
    const durationSeconds = parseDurationToSeconds(rawDuration);
    const durationFormatted = formatDuration(durationSeconds);

    const rawUser = columnMap.users ? (row[columnMap.users] ?? '') : '';
    const allUsers = parseExecutives(rawUser);
    let executives = allUsers.length > 0 ? [allUsers[allUsers.length - 1]] : [];

    const originalCallId = columnMap.callId
      ? (row[columnMap.callId] ?? String(i))
      : String(i);

    const direction = (columnMap.direction ? row[columnMap.direction] : '') ?? '';
    const isOutbound = direction.toLowerCase() === 'outbound' || direction.toLowerCase() === 'saliente';

    const conversationTotalSeconds = columnMap.conversationTotal
      ? parseNumericField(row[columnMap.conversationTotal] ?? '0')
      : durationSeconds;

    const attended = conversationTotalSeconds > 0;

    const rawPhone = columnMap.phone ? (row[columnMap.phone] ?? '') : '';
    const cleanPhone = cleanPhoneNumber(rawPhone);
    const aniHash = await hashPhone(cleanPhone);

    const uniqueCallIdentifier = await generateUniqueCallId(aniHash, callDate, callTime, durationSeconds);

    const exportComplete = columnMap.exportComplete
      ? isExportComplete(row[columnMap.exportComplete] ?? '')
      : false;

    const rawQueue = ((columnMap.queue ? row[columnMap.queue] : '') ?? '').trim();
    const isInbound = direction.toLowerCase() === 'inbound' || direction.toLowerCase() === 'entrante';

    const ivrTotalSeconds = columnMap.ivrTotal
      ? parseNumericField(row[columnMap.ivrTotal] ?? '0')
      : 0;

    const hasExecutive = executives.length > 0;
    let isIvrOnlyCall = false;
    if (isInbound && !hasExecutive && !rawQueue && ivrTotalSeconds >= 10) {
      isIvrOnlyCall = true;
    }

    if (!isOutbound && !attended && !isIvrOnlyCall) {
      executives = ['SIN ATENDER'];
    } else if (isOutbound && executives.length === 0) {
      executives = ['DESCONOCIDO'];
    } else if (attended && executives.length === 0 && !isIvrOnlyCall) {
      executives = ['DESCONOCIDO'];
    }

    let queue: string;
    if (VALID_QUEUES.has(rawQueue)) {
      queue = rawQueue;
    } else if (isOutbound) {
      queue = '';
    } else if (isInbound) {
      if (rawQueue && rawQueue.toLowerCase().includes('ivr')) {
        queue = 'IVR';
      } else if (isIvrOnlyCall) {
        queue = 'IVR';
      } else if (rawQueue) {
        queue = rawQueue;
      } else {
        queue = 'Sin cola';
      }
    } else {
      continue;
    }

    const rawQueueTime = columnMap.queueTime
      ? parseNumericField(row[columnMap.queueTime] ?? '0')
      : 0;

    const queueTimeSeconds = (() => {
      if (isOutbound && rawQueueTime > 0) {
        anomalies.push({
          type: 'outbound_has_queue_time',
          callId: originalCallId,
          queueTimeSeconds: rawQueueTime,
          actionTaken: 'auto_corrected_to_zero',
          severity: 'WARNING',
          timestamp: new Date(),
        });
        return 0;
      }
      return rawQueueTime;
    })();

    const rawHandleTime = columnMap.handleTime
      ? parseNumericField(row[columnMap.handleTime] ?? '0')
      : 0;

    const handleTimeSeconds = (() => {
      if (rawHandleTime < durationSeconds && rawHandleTime > 0 && durationSeconds > 0) {
        const effectiveHandleTime = durationSeconds + 45;
        anomalies.push({
          type: 'handle_time_lt_duration',
          callId: originalCallId,
          rawHandleTime,
          durationSeconds,
          actionTaken: `usar ${effectiveHandleTime}s (duration + 45s ACW)`,
          severity: 'CRITICAL',
          timestamp: new Date(),
        });
        return effectiveHandleTime;
      }
      return rawHandleTime > 0 ? rawHandleTime : durationSeconds;
    })();

    const alertSegments = columnMap.alertSegments
      ? parseNumericField(row[columnMap.alertSegments] ?? '1')
      : 1;
    const alertTimeSeconds = columnMap.alertTime
      ? parseNumericField(row[columnMap.alertTime] ?? '0')
      : 0;
    const flowExit = columnMap.flowExit
      ? parseFlowExit(row[columnMap.flowExit] ?? 'true')
      : true;
    const alertedUsers = columnMap.alertedUsers
      ? (row[columnMap.alertedUsers] ?? '')
      : '';

    const acwSeconds = 45;
    const holdTimeSeconds = Math.max(0, handleTimeSeconds - acwSeconds - durationSeconds);
    const abandonType = calculateAbandonType(attended, flowExit, queueTimeSeconds, alertedUsers, originalCallId, anomalies);
    const isBounce = calculateIsBounce(alertSegments, alertedUsers, allUsers);

    const usersNotRespond = columnMap.usersNotRespond
      ? (row[columnMap.usersNotRespond] ?? '')
      : '';

    const transfers = columnMap.transfers
      ? parseNumericField(row[columnMap.transfers] ?? '0')
      : 0;

    const abandonTimeSeconds = columnMap.abandonTime
      ? parseNumericField(row[columnMap.abandonTime] ?? '0')
      : 0;

    const disconnectionType = columnMap.disconnectionType
      ? (row[columnMap.disconnectionType] ?? '')
      : '';

    const finalizationDateRaw = columnMap.finalizationDate
      ? (row[columnMap.finalizationDate] ?? '')
      : '';
    const { callDate: finalizationDate } = finalizationDateRaw
      ? parseDateTime(finalizationDateRaw)
      : { callDate: null };

    const partialResultTimestamp = columnMap.partialResultTimestamp
      ? (row[columnMap.partialResultTimestamp] ?? '')
      : '';

    const filters = columnMap.filters
      ? (row[columnMap.filters] ?? '')
      : '';

    const campaign = columnMap.campaign
      ? (row[columnMap.campaign] ?? '')
      : '';

    const conversationInitiator = columnMap.conversationInitiator
      ? (row[columnMap.conversationInitiator] ?? '')
      : '';

    const record: ParsedCallRecord = {
      originalCallId,
      rawDate,
      callDate,
      callTime,
      callHour,
      executives,
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
      isOverlapping: false,
      uniqueCallIdentifier,
      queueTimeSeconds,
      handleTimeSeconds,
      alertSegments,
      alertTimeSeconds,
      flowExit,
      alertedUsers,
      abandonType,
      isBounce,
      holdTimeSeconds,
      acwSeconds,
      ivrTotalSeconds,
      usersNotRespond,
      transfers,
      abandonTimeSeconds,
      conversationTotalSeconds,
      disconnectionType,
      finalizationDate: finalizationDate ?? null,
      partialResultTimestamp,
      filters,
      campaign,
      conversationInitiator,
    };

    results.push(record);

    // Yield to event loop every PROGRESS_CHUNK rows so UI stays responsive
    if (onProgress && (i + 1) % PROGRESS_CHUNK === 0) {
      onProgress(i + 1, rows.length);
      await new Promise<void>(r => setTimeout(r, 0));
    }
  }

  if (onProgress) onProgress(rows.length, rows.length);

  return { records: results, duplicateCount, anomalies: [...anomalies] };
}

function timeStringToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function markOverlappingCalls(records: ParsedCallRecord[]): { records: ParsedCallRecord[]; canceledCount: number } {
  const recordsByDateAndExecutive = new Map<string, ParsedCallRecord[]>();

  for (const record of records) {
    if (!record.callDate || !record.callTime) continue;

    for (const executive of record.executives) {
      const key = `${record.callDate}|${executive}`;
      if (!recordsByDateAndExecutive.has(key)) {
        recordsByDateAndExecutive.set(key, []);
      }
      recordsByDateAndExecutive.get(key)!.push(record);
    }
  }

  let overlapCount = 0;
  const markedRecords = records.map(r => ({ ...r }));

  for (const callsForExecutive of recordsByDateAndExecutive.values()) {
    callsForExecutive.sort((a, b) => {
      const aTime = timeStringToMinutes(a.callTime);
      const bTime = timeStringToMinutes(b.callTime);
      if (aTime === null || bTime === null) return 0;
      return aTime - bTime;
    });

    for (let i = 0; i < callsForExecutive.length; i++) {
      const currentCall = callsForExecutive[i];
      const currentStart = timeStringToMinutes(currentCall.callTime);
      const currentEnd = currentStart !== null ? currentStart + Math.ceil(currentCall.durationSeconds / 60) : null;

      for (let j = i + 1; j < callsForExecutive.length; j++) {
        const nextCall = callsForExecutive[j];
        const nextStart = timeStringToMinutes(nextCall.callTime);

        if (currentEnd !== null && nextStart !== null && nextStart < currentEnd) {
          const recordIndex = markedRecords.findIndex(r => r.originalCallId === nextCall.originalCallId);
          if (recordIndex !== -1) {
            markedRecords[recordIndex].isOverlapping = true;
            overlapCount++;
          }
        }
      }
    }
  }

  return { records: markedRecords, canceledCount: overlapCount };
}

export function filterOverlappingCalls(records: ParsedCallRecord[]): { records: ParsedCallRecord[]; canceledCount: number } {
  return markOverlappingCalls(records);
}

function parseNumericField(raw: string): number {
  if (!raw || raw.trim() === '') return 0;
  const s = raw.trim();

  if (s.includes('m') && s.includes('s')) {
    const mMatch = s.match(/(\d+)m/);
    const sMatch = s.match(/(\d+)s/);
    const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
    const seconds = sMatch ? parseInt(sMatch[1], 10) : 0;
    return minutes * 60 + seconds;
  }

  if (s.includes(':')) {
    const parts = s.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }

  const num = parseInt(s, 10);
  return isNaN(num) ? 0 : num;
}

function parseFlowExit(raw: string): boolean {
  if (!raw || raw.trim() === '') return false;
  const s = raw.trim().toLowerCase();
  if (s === '1' || s === '1.0' || s === 'true' || s === 'sí' || s === 'si' || s === 'yes') return true;
  return false;
}

function calculateAbandonType(
  attended: boolean,
  flowExit: boolean,
  queueTime: number,
  alertedUsers: string,
  callId: string,
  anomalies: AnomalyEntry[]
): string | null {
  if (attended) return null;

  if (!flowExit) return 'ivr';

  if (queueTime > 0) {
    if (alertedUsers?.trim()) return 'alert';
    return 'queue';
  }

  if (flowExit && queueTime === 0 && !alertedUsers?.trim()) {
    return 'ivr-transition';
  }

  if (!flowExit && queueTime === 0) {
    anomalies.push({
      type: 'abandon_type_unclassified',
      callId,
      flowExit,
      queueTimeSeconds: queueTime,
      alertedUsers: alertedUsers?.trim() || 'none',
      actionTaken: 'marked_as_unknown_abandon',
      severity: 'WARNING',
      timestamp: new Date(),
    });
    return 'unknown';
  }

  return null;
}

function calculateIsBounce(
  alertSegments: number,
  alertedUsers: string,
  executives: string[]
): boolean {
  if (alertSegments <= 1) return false;
  if (alertedUsers.trim() === '' || executives.length === 0) return false;

  const alertedList = alertedUsers.split(';').map(u => u.trim()).filter(u => u !== '');
  if (alertedList.length === 0) return false;

  const firstAlerted = alertedList[0].toUpperCase();
  const lastExecutive = executives[executives.length - 1].toUpperCase();

  return firstAlerted !== lastExecutive;
}

export async function saveImportAudit(
  uploadId: string,
  anomaliesToSave: AnomalyEntry[],
  supabaseClient: SupabaseClient
): Promise<void> {
  if (anomaliesToSave.length === 0) {
    return;
  }

  const grouped = anomaliesToSave.reduce((acc, anom) => {
    const type = anom.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summary = {
    upload_id: uploadId,
    total_anomalies: anomaliesToSave.length,
    critical_count: anomaliesToSave.filter(a => a.severity === 'CRITICAL').length,
    warning_count: anomaliesToSave.filter(a => a.severity === 'WARNING').length,
    anomaly_breakdown: grouped,
    details_json: anomaliesToSave,
    created_at: new Date().toISOString(),
  };

  try {
    await supabaseClient
      .from('import_audit_log')
      .insert([summary]);
  } catch (error) {
    console.error('✗ Error guardando auditoría:', error);
  }
}
