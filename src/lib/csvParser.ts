// ... existing imports (keep them all) ...
// ❌ REMOVE THIS LINE: import { crypto } from 'crypto'; 

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
  // This avoids the "Module not found" error in Vite browser builds
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