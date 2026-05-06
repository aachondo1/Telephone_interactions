// ... existing imports ...
import { crypto } from 'crypto'; // Asegurar que esté disponible (Vite/Node)

// ... existing code ...

// New function: Generate unique signature for deduplication
// Uses: callDate + callTime + aniHash + durationSeconds + callDirection
// If ANI is weak, also includes queueTimeSeconds and ivrTotalSeconds
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

  // Generate SHA-256 hash for fixed-length, database-friendly signature
  const encoder = new TextEncoder();
  const data = encoder.encode(fullString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... inside transformRows(), update the deduplication check:

export async function transformRows(
  rows: RawCallRecord[],
  columnMap: Record<string, string>,
  processedSignatures?: Set<string>
): Promise<{ records: ParsedCallRecord[]; duplicateCount: number; anomalies: typeof anomalies }> {
  // ... existing code ...

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
        rawQueueTime,
        ivrTotalSeconds
      );

      if (processedSignatures.has(signature)) {
        duplicateCount++;
        continue;
      }
    }

    // ... rest of the loop ...
  }

  // ... rest of the function ...
}