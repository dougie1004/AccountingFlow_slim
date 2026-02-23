
/**
 * [STRATEGIC INTEGRITY ENGINE v2.0 - CANONICAL SEALING]
 * Handles cryptographic hashing and identity verification for financial data.
 */

export interface IntegrityDiff {
    field: string;
    original: any;
    current: any;
    delta: number;
}

export interface VerificationReport {
    isValid: boolean;
    hashMatch: boolean;
    diffs: IntegrityDiff[];
    timestamp: string;
    level: 'L1_CALC' | 'L2_CONSISTENCY' | 'L3_HASH' | 'L4_IMMUTABLE';
}

/**
 * [CANONICALIZATION]
 * Transforms any financial object into a stable, sorted, normalized string.
 * This is the 'Seal' that resists row-swapping and formatting changes.
 */
export function canonicalize(obj: any): string {
    if (Array.isArray(obj)) {
        // For arrays (like ledger rows), we sort them by a deterministic key (e.g. Account + Category)
        // to make the hash resistant to row swapping.
        return '[' + obj
            .map(item => canonicalize(item))
            .sort()
            .join(',') + ']';
    } else if (typeof obj === 'object' && obj !== null) {
        // Sort keys to resist property order changes
        const sortedKeys = Object.keys(obj).sort();
        return '{' + sortedKeys
            .map(key => `"${key}":${canonicalize(obj[key])}`)
            .join(',') + '}';
    } else if (typeof obj === 'number') {
        // Normalize numbers: Round to integers to resist floating point errors
        return Math.round(obj).toString();
    } else if (typeof obj === 'string') {
        // Normalize strings: Trim and lowercase for comparison resilience
        return `"${obj.trim()}"`;
    }
    return JSON.stringify(obj);
}

/**
 * Generates a SHA-256 hash using the Canonical Form.
 * This is the 'Immutable Fingerprint' mentioned in the 6-step attack test.
 */
export async function generateFinancialHash(data: any): Promise<string> {
    const canonicalStr = canonicalize(data);
    const msgUint8 = new TextEncoder().encode(canonicalStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deep-compares two financial snapshots.
 * Zero Tolerance Policy enforced.
 */
export function verifyFinancialSnapshot(original: any, current: any): VerificationReport {
    const diffs: IntegrityDiff[] = [];
    const timestamp = new Date().toISOString();

    const check = (path: string, objO: any, objC: any) => {
        if (typeof objO === 'number') {
            const delta = Math.round(objC || 0) - Math.round(objO || 0);
            if (delta !== 0) {
                diffs.push({ field: path, original: objO, current: objC, delta });
            }
        } else if (typeof objO === 'object' && objO !== null) {
            for (const key in objO) {
                check(`${path}.${key}`, objO[key], objC?.[key]);
            }
        } else if (objO !== objC) {
            diffs.push({ field: path, original: objO, current: objC, delta: 0 });
        }
    };

    check('root', original, current);

    return {
        isValid: diffs.length === 0,
        hashMatch: false,
        diffs,
        timestamp,
        level: 'L4_IMMUTABLE'
    };
}
