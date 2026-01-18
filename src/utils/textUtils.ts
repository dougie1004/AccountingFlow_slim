/**
 * AccountingFlow Text Utilities
 * AI generated content formatter
 */

export const cleanMarkdown = (text: string | null | undefined): string => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').replace(/### /g, '').replace(/## /g, '').replace(/# /g, '');
};

export const parseAIList = (text: string | null | undefined): string[] => {
    if (!text) return [];

    // Split by numbered items (1. 2. 3.) or bullets (- or *)
    const parts = text.split(/(?:\d+\.\s+)|(?:\n-\s+)|(?:\n\*\s+)/);
    return parts
        .map(p => cleanMarkdown(p).trim())
        .filter(p => p.length > 0);
};
