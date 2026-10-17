import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "synapsvault-lang";

function isSupportedLanguage(val: unknown): val is SupportedLanguage {
  return typeof val === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(val);
}

/**
 * Resolve the initial UI language from localStorage, falling back to the
 * browser's language preference (`navigator.language`) and finally `"en"`.
 */
export function detectInitialLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;
  } catch {
    // Storage can be unavailable (privacy mode, sandboxed iframes).
  }

  if (typeof navigator !== "undefined") {
    const candidates = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        const base = candidate.split("-")[0]?.toLowerCase();
        if (isSupportedLanguage(base)) return base;
      }
    }
  }

  return "en";
}

export function applyLanguageEffects(lang: SupportedLanguage): void {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = lang;
  }
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Non-fatal: language still applies for this session.
  }
}

const initialLanguage = detectInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ...(initialLanguage === "es" ? { es: { translation: es } } : {}),
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

if (typeof document !== "undefined" && document.documentElement) {
  document.documentElement.lang = initialLanguage;
}

i18n.on("languageChanged", (lng) => {
  if (isSupportedLanguage(lng)) {
    applyLanguageEffects(lng);
  }
});

export async function loadLocale(lng: string): Promise<void> {
  if (i18n.hasResourceBundle(lng, "translation")) {
    return;
  }

  if (lng === "es") {
    i18n.addResourceBundle("es", "translation", es, true, true);
    return;
  }

  const messages = await import(`./locales/${lng}.json`);
  i18n.addResourceBundle(lng, "translation", messages.default ?? messages, true, true);
}

export default i18n;