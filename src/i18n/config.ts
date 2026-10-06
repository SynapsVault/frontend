import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export async function loadLocale(lng: string): Promise<void> {
  if (i18n.hasResourceBundle(lng, "translation")) {
    return;
  }

  const messages = await import(`./locales/${lng}.json`);
  i18n.addResourceBundle(lng, "translation", messages.default ?? messages, true, true);
}

export default i18n;