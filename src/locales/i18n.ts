import { ko } from './ko';
import { en } from './en';

export type Language = 'ko' | 'en';
export type TranslationKeys = typeof ko;

export const translations: Record<Language, TranslationKeys> = {
    ko,
    en
};

/**
 * Access nested object properties using string path (e.g., 'common.close')
 */
export const getTranslation = (lang: Language, path: string): string => {
    const keys = path.split('.');
    let result: any = translations[lang];

    for (const key of keys) {
        if (result && result[key]) {
            result = result[key];
        } else {
            return path; // Fallback to path string if not found
        }
    }

    return typeof result === 'string' ? result : path;
};
