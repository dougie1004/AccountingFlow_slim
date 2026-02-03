import { useAccounting } from './useAccounting';
import { getTranslation, TranslationKeys } from '../locales/i18n';

export const useTranslation = () => {
    const { language, setLanguage } = useAccounting();

    const t = (path: string) => {
        return getTranslation(language, path);
    };

    return { t, language, setLanguage };
};
