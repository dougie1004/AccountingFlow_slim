/**
 * C-Level Friendly Number Formatting
 * Avoids showing details down to the single 'won' unit.
 */

export const formatCLevel = (value: number, unit: 'M' | 'B' | 'Auto' = 'Auto'): string => {
    const absValue = Math.abs(value);

    // Default to 'M' (Million) as requested by user's preference for 'M'
    if (unit === 'M' || (unit === 'Auto' && absValue < 1000000000)) {
        return `₩${Math.round(value / 1000000).toLocaleString()}M`;
    }

    // Billion (B) for very large values
    if (unit === 'B' || (unit === 'Auto' && absValue >= 1000000000)) {
        return `₩${(value / 1000000000).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })}B`;
    }

    return `₩${Math.round(value / 1000000)}M`;
};

/**
 * Korean Style Abbreviation (X억 Y천만)
 * Optional: Use if the user prefers local units over M/B
 */
export const formatKoreanCLevel = (value: number): string => {
    if (Math.abs(value) >= 100000000) {
        return `₩${(value / 100000000).toFixed(1)}억`;
    }
    if (Math.abs(value) >= 10000) {
        return `₩${Math.round(value / 10000).toLocaleString()}만`;
    }
    return `₩${Math.round(value).toLocaleString()}`;
};

export const formatCurrency = (value: number): string => {
    return '₩' + Math.round(value).toLocaleString();
};

export const formatPercent = (value: number): string => {
    return (value * 100).toFixed(1) + '%';
};

/**
 * Returns YYYY-MM-DD in local time
 */
export const toLocalIsoDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
