/**
 * @fileoverview Audit utilities for the frontend.
 * Includes hash verification and JSON diffing.
 */

/**
 * Calculates SHA-256 hash of a string using the SubtleCrypto API.
 */
export async function calculateSHA256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies if an event's hash is valid by re-calculating it on the client.
 */
export async function verifyEventHash(event: {
  prevHash: string | null;
  type: string;
  payload: any;
  version: number;
  aggregateId: string;
  hash: string;
}): Promise<boolean> {
  const content = JSON.stringify({
    prevHash: event.prevHash,
    type: event.type,
    payload: event.payload,
    version: event.version,
    aggregateId: event.aggregateId,
  });

  const calculatedHash = await calculateSHA256(content);
  return calculatedHash === event.hash;
}

/**
 * Simple JSON diff to identify changed properties between two objects.
 */
export function getDiff(prev: any, current: any): string[] {
  if (!prev) return Object.keys(current);
  
  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(current)]);

  for (const key of allKeys) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(current[key])) {
      changes.push(key);
    }
  }
  return changes;
}
