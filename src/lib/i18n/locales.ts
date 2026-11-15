export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "meridian_locale";

export type LocaleCode =
  | "en" | "de" | "fr" | "it" | "es" | "pt" | "nl"
  | "tr" | "id" | "ru" | "ar" | "zh" | "ja" | "ko" | "hi";

export type LocaleMeta = {
  code: LocaleCode;
  /** English name, for screen readers and the switch page */
  label: string;
  /** Endonym — what the language calls itself */
  native: string;
  dir: "ltr" | "rtl";
};

export const LOCALES: LocaleMeta[] = [
  { code: "en", label: "English",              native: "English",    dir: "ltr" },
  { code: "de", label: "German",               native: "Deutsch",    dir: "ltr" },
  { code: "fr", label: "French",               native: "Français",   dir: "ltr" },
  { code: "it", label: "Italian",              native: "Italiano",   dir: "ltr" },
  { code: "es", label: "Spanish",              native: "Español",    dir: "ltr" },
  { code: "pt", label: "Portuguese",           native: "Português",  dir: "ltr" },
  { code: "nl", label: "Dutch",                native: "Nederlands", dir: "ltr" },
  { code: "tr", label: "Turkish",              native: "Türkçe",     dir: "ltr" },
  { code: "id", label: "Indonesian",           native: "Bahasa Indonesia", dir: "ltr" },
  { code: "ru", label: "Russian",              native: "Русский",    dir: "ltr" },
  { code: "ar", label: "Arabic",               native: "العربية",     dir: "rtl" },
  { code: "zh", label: "Chinese (Simplified)", native: "简体中文",     dir: "ltr" },
  { code: "ja", label: "Japanese",             native: "日本語",       dir: "ltr" },
  { code: "ko", label: "Korean",               native: "한국어",       dir: "ltr" },
  { code: "hi", label: "Hindi",                native: "हिन्दी",        dir: "ltr" },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function isLocale(value: unknown): value is LocaleCode {
  return typeof value === "string" && (LOCALE_CODES as string[]).includes(value);
}

export function localeMeta(code: LocaleCode): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
