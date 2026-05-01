import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
const resources = {
  'pt-BR': {
    translation: {
      "Sessões": "Sessões",
      "Personagens": "Personagens",
      "Bot Discord": "Bot Discord",
      "Configurações": "Configurações",
      "RPG Cronista": "RPG Cronista",
      "Crônicas de Aventura": "Crônicas de Aventura",
      "language": "Idioma",
      "pt-BR": "Português (Brasil)",
      "en-US": "Inglês (EUA)"
    }
  },
  'en-US': {
    translation: {
      "Sessões": "Sessions",
      "Personagens": "Characters",
      "Bot Discord": "Discord Bot",
      "Configurações": "Settings",
      "RPG Cronista": "RPG Chronicler",
      "Crônicas de Aventura": "Adventure Chronicles",
      "language": "Language",
      "pt-BR": "Portuguese (Brazil)",
      "en-US": "English (US)"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "pt-BR", // default language
    fallbackLng: "en-US",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
