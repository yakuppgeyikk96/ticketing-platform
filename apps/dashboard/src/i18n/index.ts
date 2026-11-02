import { localeSchema, type Locale } from "@ticketing/contracts";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en.ts";
import { tr } from "./tr.ts";

export const LOCALES = localeSchema.options;

// Same key family as useStoredValue, read here because i18next starts before React.
const STORAGE_KEY = "pref:locale";

// Guarded: this module is also loaded by node-side unit tests.
const inBrowser = typeof window !== "undefined";

export function asLocale(value: unknown): Locale {
  const parsed = localeSchema.safeParse(value);
  return parsed.success ? parsed.data : "tr";
}

// Intl wants a region tag ("tr-TR"); i18next works with the bare language.
const intlTags: Record<Locale, string> = { tr: "tr-TR", en: "en-US" };

export function localeTag(locale: string = i18next.language): string {
  return intlTags[asLocale(locale)];
}

function initialLocale(): Locale {
  if (!inBrowser) return "tr";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return asLocale(stored);
  } catch {
    // storage blocked: fall through to the browser language
  }
  return asLocale(navigator.language.split("-")[0]);
}

// Resources are bundled, so init is synchronous and the first render already
// has its strings.
void i18next.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en } },
  lng: initialLocale(),
  fallbackLng: "tr",
  supportedLngs: LOCALES,
  interpolation: { escapeValue: false }, // React escapes on its own
});

// The language lives in three places: i18next, <html lang> and storage.
// Every change goes through here so they cannot drift apart.
export async function applyLocale(locale: Locale): Promise<void> {
  if (inBrowser) {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // storage blocked: the session still has it
    }
  }
  await i18next.changeLanguage(locale);
}

if (inBrowser) document.documentElement.lang = i18next.language;

export { i18next as i18n };
