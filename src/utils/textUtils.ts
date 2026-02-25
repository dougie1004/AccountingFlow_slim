/**
 * AccountingFlow Text Utilities
 * AI generated content formatter
 */

export const cleanMarkdown = (text: string | null | undefined): string => {
    if (!text) return '';

    let cleaned = text.trim();

    // Recursive removal of surrounding quotes and artifacts
    let changed = true;
    while (changed) {
        let before = cleaned;

        // Remove surrounding double/single quotes
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1).trim();
        }

        // Remove surrounding code blocks (e.g. ```json ... ```)
        if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
            cleaned = cleaned.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
        }

        changed = before !== cleaned;
    }

    return cleaned;
};

export const parseAIList = (text: string | null | undefined): string[] => {
    if (!text) return [];

    // Split by numbered items (1. 2. 3.) or bullets (- or *)
    const parts = text.split(/(?:\d+\.\s+)|(?:\n-\s+)|(?:\n\*\s+)/);
    return parts
        .map(p => cleanMarkdown(p).trim())
        .filter(p => p.length > 0);
};
