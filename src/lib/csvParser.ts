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

// ... existing imports (keep them all) ...
// ❌ REMOVE THIS LINE if present: import { crypto } from 'crypto'; 

// ... rest of the file ...

// Find the generateCallSignature function and replace it with this version:
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
  
  // Use globalThis.crypto which is available in modern browsers and Node
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || !cryptoApi.subtle) {
    console.warn('Web Crypto API not available, falling back to simple hash');
    // Simple fallback for environments without subtle (shouldn't happen in modern setups)
    return btoa(fullString); 
  }

  const hashBuffer = await cryptoApi.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... rest of the file (transformRows, detectColumns, etc.) ...