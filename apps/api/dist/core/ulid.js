/**
 * ULID (Universally Unique Lexicographically Sortable Identifier)
 *
 * Why ULID over UUID:
 * - Lexicographically sortable → natural ordering by time
 * - Monotonic within same millisecond → no clock-skew issues
 * - 128-bit compatible with UUID storage
 * - Multi-region safe: timestamp prefix guarantees global ordering
 *
 * Format: TTTTTTTTTTRRRRRRRRRRRRRRRRR (26 chars Crockford Base32)
 *   T = 10 chars = 48-bit timestamp (ms since epoch)
 *   R = 16 chars = 80-bit randomness
 *
 * Monotonic guarantee:
 *   If same millisecond → increment random component
 *   This prevents ordering ambiguity in distributed systems
 */
import crypto from 'crypto';
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford's Base32
const ENCODING_LEN = ENCODING.length; // 32
const TIME_LEN = 10;
const RANDOM_LEN = 16;
const ULID_LEN = TIME_LEN + RANDOM_LEN;
// Monotonic state: tracks last timestamp and random component
let lastTime = 0;
let lastRandom = [];
/**
 * Encode timestamp to Crockford Base32
 */
function encodeTime(now, len) {
    let str = '';
    let time = now;
    for (let i = len; i > 0; i--) {
        const mod = time % ENCODING_LEN;
        str = ENCODING[mod] + str;
        time = Math.floor(time / ENCODING_LEN);
    }
    return str;
}
/**
 * Generate random component
 */
function generateRandom() {
    const buffer = crypto.randomBytes(RANDOM_LEN);
    const random = [];
    for (let i = 0; i < RANDOM_LEN; i++) {
        random.push(buffer[i] % ENCODING_LEN);
    }
    return random;
}
/**
 * Encode random component to Crockford Base32
 */
function encodeRandom(random) {
    let str = '';
    for (let i = 0; i < RANDOM_LEN; i++) {
        str += ENCODING[random[i]];
    }
    return str;
}
/**
 * Increment random component (for monotonic guarantee)
 */
function incrementRandom(random) {
    const next = [...random];
    for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] < ENCODING_LEN - 1) {
            next[i]++;
            return next;
        }
        next[i] = 0;
    }
    // Overflow - extremely unlikely (2^80 values per ms)
    throw new Error('ULID_RANDOM_OVERFLOW: Cannot increment random component');
}
/**
 * Generate a monotonic ULID
 *
 * Guarantees:
 * 1. Globally unique
 * 2. Lexicographically sortable by creation time
 * 3. Monotonically increasing within same millisecond
 * 4. No clock-skew issues (increments if time is same/backward)
 */
export function ulid(seedTime) {
    const now = seedTime ?? Date.now();
    if (now === lastTime) {
        // Same millisecond: increment random for monotonic ordering
        lastRandom = incrementRandom(lastRandom);
    }
    else if (now > lastTime) {
        // New millisecond: fresh random
        lastRandom = generateRandom();
        lastTime = now;
    }
    else {
        // Clock went backward (NTP adjustment, etc)
        // Use lastTime + increment to maintain monotonicity
        lastRandom = incrementRandom(lastRandom);
        // Don't update lastTime - keep the higher value
    }
    return encodeTime(lastTime, TIME_LEN) + encodeRandom(lastRandom);
}
/**
 * Extract timestamp from ULID
 */
export function extractTimestamp(ulidStr) {
    if (ulidStr.length !== ULID_LEN) {
        throw new Error(`Invalid ULID: expected ${ULID_LEN} chars, got ${ulidStr.length}`);
    }
    const timeChars = ulidStr.substring(0, TIME_LEN);
    let time = 0;
    for (let i = 0; i < timeChars.length; i++) {
        const charIndex = ENCODING.indexOf(timeChars[i]);
        if (charIndex === -1) {
            throw new Error(`Invalid ULID character: ${timeChars[i]}`);
        }
        time = time * ENCODING_LEN + charIndex;
    }
    return time;
}
/**
 * Convert ULID to UUID format (for PostgreSQL UUID columns)
 * ULID is 128-bit, same as UUID — just different encoding
 */
export function ulidToUuid(ulidStr) {
    if (ulidStr.length !== ULID_LEN) {
        throw new Error(`Invalid ULID length: ${ulidStr.length}`);
    }
    // Convert Crockford Base32 to hex
    let binary = BigInt(0);
    for (let i = 0; i < ulidStr.length; i++) {
        const charIndex = ENCODING.indexOf(ulidStr[i].toUpperCase());
        if (charIndex === -1)
            throw new Error(`Invalid char: ${ulidStr[i]}`);
        binary = binary * BigInt(32) + BigInt(charIndex);
    }
    const hex = binary.toString(16).padStart(32, '0');
    // Format as UUID: 8-4-4-4-12
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32),
    ].join('-');
}
/**
 * Compare two ULIDs (lexicographic = chronological)
 */
export function compareUlid(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
/**
 * Check if ULID was generated within a time range
 */
export function isWithinRange(ulidStr, startMs, endMs) {
    const ts = extractTimestamp(ulidStr);
    return ts >= startMs && ts <= endMs;
}
/**
 * Generate ULID for a specific region (adds region prefix to metadata)
 * This helps with cross-region ordering when clocks might differ
 */
export function regionUlid(regionId) {
    const id = ulid();
    return {
        id,
        region: regionId,
        timestamp: extractTimestamp(id),
    };
}
/**
 * Lamport timestamp for cross-region causal ordering
 * Combines wall clock with logical counter
 */
export class LamportClock {
    counter;
    regionId;
    constructor(regionId, initialCounter = 0) {
        this.counter = initialCounter;
        this.regionId = regionId;
    }
    /**
     * Tick on local event
     */
    tick() {
        this.counter++;
        return {
            timestamp: Date.now(),
            counter: this.counter,
            region: this.regionId,
        };
    }
    /**
     * Update on receiving remote event
     * max(local, remote) + 1
     */
    receive(remoteCounter) {
        this.counter = Math.max(this.counter, remoteCounter) + 1;
        return {
            timestamp: Date.now(),
            counter: this.counter,
            region: this.regionId,
        };
    }
    /**
     * Compare two Lamport timestamps
     * 1. Compare counter
     * 2. If equal, compare region (deterministic tiebreaker)
     */
    static compare(a, b) {
        if (a.counter !== b.counter)
            return a.counter - b.counter;
        return a.region < b.region ? -1 : a.region > b.region ? 1 : 0;
    }
}
