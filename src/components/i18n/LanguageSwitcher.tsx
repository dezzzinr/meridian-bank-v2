"use client";

import { useId } from "react";
import { LOCALES } from "@/lib/i18n/locales";
import { useLanguage } from "@/components/i18n/LanguageProvider";

/** Locale picker. `dark` sits on the night-green chrome, `light` on white. */
export function LanguageSwitcher({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { locale, setLocale, t } = useLanguage();
  const id = useId();

  const dark = variant === "dark";
  const text = dark ? "text-white/70 hover:text-white" : "text-ink-soft hover:text-ink";
  const border = dark ? "border-white/15 bg-white/[.04]" : "border-line bg-card";

  return (
    <div className={`relative inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${border}`}>
      <label htmlFor={id} className="sr-only">
        {t("ui.language")}
      </label>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={dark ? "text-[#a7d4b5]" : "text-brand"}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3Z" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <select
        id={id}
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className={`cursor-pointer appearance-none bg-transparent pr-4 text-xs font-semibold outline-none ${text}`}
      >
        {LOCALES.map(({ code, native, label }) => (
          <option key={code} value={code} lang={code} className="text-ink">
            {native} — {label}
          </option>
        ))}
      </select>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`pointer-events-none absolute right-2 ${dark ? "text-white/50" : "text-ink-faint"}`}>
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
