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

// ... rest of existing imports and code ...

// Helper: clean phone number
export function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/^sip:[^@]*/i, '')  // sip:number@domain -> keep number part
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

  // Base components for signature
  const baseString = `${callDate}|${callTime}|${aniHash}|${durationSeconds}|${callDirection}`;

  // If ANI hash is weak (too short or empty), add more fields for uniqueness
  let fullString = baseString;
  if (!aniHash || aniHash.length < 8) {
    fullString += `|${queueTimeSeconds}|${ivrTotalSeconds}`;
  }

  // ✅ Use Web Crypto API (Standard, works in Browser + Node v15+)
  const encoder = new TextEncoder();
  const data = encoder.encode(fullString);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// filterOverlappingCalls function
export function filterOverlappingCalls(records: any[]): { records: any[]; canceledCount: number } {
  let canceledCount = 0;
  
  // Group by executive and date
  const recordsByDateAndExecutive: Record<string, any[]> = {};
  
  for (const record of records) {
    if (!record.executives || record.executives.length === 0) continue;
    const key = `${record.callDate}_${record.executives[0]}`;
    if (!recordsByDateAndExecutive[key]) {
      recordsByDateAndExecutive[key] = [];
    }
    recordsByDateAndExecutive[key].push(record);
  }
  
  // Mark overlapping calls
  const markedRecords = records.map(r => ({ ...r }));
  
  for (const key in recordsByDateAndExecutive) {
    const callsForExecutive = recordsByDateAndExecutive[key];
    // Sort by call time
    callsForExecutive.sort((a, b) => {
      const timeA = a.callTime || '';
      const timeB = b.callTime || '';
      return timeA.localeCompare(timeB);
    });
    
    for (let i = 0; i < callsForExecutive.length; i++) {
      for (let j = i + 1; j < callsForExecutive.length; j++) {
        const callA = callsForExecutive[i];
        const callB = callsForExecutive[j];
        
        // If call B starts after call A ends, no more overlaps
        if (callB.callTime > callA.callTime) {
          const timeASeconds = timeToSeconds(callA.callTime) + (callA.durationSeconds || 0);
          const timeBSeconds = timeToSeconds(callB.callTime);
          if (timeBSeconds >= timeASeconds) break;
        }
        
        // Mark as overlapping
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

// ... rest of the file (transformRows, detectColumns, validateColumns, etc.) ...
// Make sure transformRows uses generateCallSignature correctly:

export async function transformRows(
  rows: RawCallRecord[],
  columnMap: Record<string, string>,
  processedSignatures?: Set<string>
): Promise<{ records: ParsedCallRecord[]; duplicateCount: number; anomalies: any[] }> {
  const records: ParsedCallRecord[] = [];
  const anomalies: any[] = [];
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // ... existing parsing code ...
    
    // Check for duplicates if signatures provided
    if (processedSignatures && callDate && callTime) {
      const signature = await generateCallSignature(
        callDate,
        callTime,
        hash,
        durationSeconds,
        direction,
        queueTimeSeconds,
        ivrTotalSeconds
      );

      if (processedSignatures.has(signature)) {
        duplicateCount++;
        continue;
      }
    }

    // ... rest of the loop ...
  }

  return { records, duplicateCount, anomalies };
}

// ... existing interfaces (RawCallRecord, ParsedCallRecord, etc.) ...