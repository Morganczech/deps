import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import cs from './locales/cs.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            cs: { translation: cs }
        },
        fallbackLng: 'en',
        detection: {
            // order and from where user language should be detected
            order: ['localStorage', 'navigator'],
            // keys or params to lookup language from
            lookupLocalStorage: 'i18nextLng',
            // cache user language on
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
