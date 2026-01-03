import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import viTranslation from './locales/vi.json';

const resources = {
  vi: {
    translation: viTranslation
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // Chỉ hỗ trợ tiếng Việt
    fallbackLng: 'vi',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;