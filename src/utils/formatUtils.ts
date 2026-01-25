/**
 * C-Level Friendly Number Formatting
 * Avoids showing details down to the single 'won' unit.
 */

export const formatCLevel = (value: number, unit: 'M' | 'B' | 'Auto' = 'Auto'): string => {
    const absValue = Math.abs(value);

    // Default to 'M' (Million) as requested by user's preference for 'M'
    if (unit === 'M' || (unit === 'Auto' && absValue < 1000000000)) {
        return `₩${(value / 1000000).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })}M`;
    }

    // Billion (B) for very large values
    if (unit === 'B' || (unit === 'Auto' && absValue >= 1000000000)) {
        return `₩${(value / 1000000000).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}B`;
    }

    return `₩${(value / 1000000).toFixed(1)}M`;
};

/**
 * Korean Style Abbreviation (X억 Y천만)
 * Optional: Use if the user prefers local units over M/B
 */
export const formatKoreanCLevel = (value: number): string => {
    if (Math.abs(value) >= 100000000) {
        return `₩${(value / 100000000).toFixed(2)}억`;
    }
    if (Math.abs(value) >= 10000) {
        return `₩${(value / 10000).toFixed(0)}만`;
    }
    return `₩${value.toLocaleString()}`;
};
