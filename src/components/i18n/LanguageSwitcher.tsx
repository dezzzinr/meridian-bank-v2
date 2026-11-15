"use client";

import { useId } from "react";
import { LOCALES } from "@/lib/i18n/locales";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const FLAGS: Record<string, string> = {
  en: "🇬🇧", de: "🇩🇪", fr: "🇫🇷", it: "🇮🇹", es: "🇪🇸", pt: "🇵🇹", nl: "🇳🇱",
  tr: "🇹🇷", id: "🇮🇩", ru: "🇷🇺", ar: "🇸🇦", zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", hi: "🇮🇳",
};

/** Compact locale picker: globe at rest, flags and language names in the menu. */
export function LanguageSwitcher({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { locale, setLocale, t } = useLanguage();
  const id = useId();
  const iconColor = variant === "dark" ? "text-[#a7d4b5]" : "text-brand";

  return (
    <div className="relative inline-grid h-9 w-9 place-items-center rounded-lg transition hover:bg-black/5">
      <label htmlFor={id} className="sr-only">{t("ui.language")}</label>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`pointer-events-none ${iconColor}`}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3Z" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <select
        id={id}
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        aria-label={t("ui.language")}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {LOCALES.map(({ code, native }) => (
          <option key={code} value={code} lang={code} className="text-ink">
            {FLAGS[code]} {native}
          </option>
        ))}
      </select>
    </div>
  );
}
