"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeMeta, type LocaleCode } from "@/lib/i18n/locales";
import { STRINGS, translatedIndex, normaliseKey as normalise } from "@/lib/i18n/strings";

type LanguageContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  /** Translated string for a dictionary key, falling back to English. */
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => STRINGS[key]?.en ?? key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

/** English text -> localised text, for this locale. */
type Index = Map<string, string>;

function buildIndex(locale: LocaleCode): Index | null {
  if (locale === DEFAULT_LOCALE) return null;
  return translatedIndex(locale);
}

/** Elements we must never rewrite. */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "svg", "SVG", "PATH", "path"]);
const SKIP_ATTR = "data-no-translate";
const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;

type Store = {
  text: WeakMap<Text, string>;
  attr: WeakMap<Element, Map<string, string>>;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const store = useRef<Store>({ text: new WeakMap(), attr: new WeakMap() });
  const applying = useRef(false);
  const localeRef = useRef<LocaleCode>(DEFAULT_LOCALE);

  const t = useCallback(
    (key: string) => STRINGS[key]?.[locale] ?? STRINGS[key]?.en ?? key,
    [locale],
  );

  /** Render a dictionary value into an element. `|` marks the accented run. */
  const paint = useCallback((el: Element, value: string) => {
    const [plain, accent] = value.split("|");
    const nodes: Node[] = [];
    if (plain) nodes.push(document.createTextNode(plain));
    if (accent !== undefined) {
      const span = document.createElement("span");
      span.className = "text-[#a7d4b5]";
      span.textContent = accent;
      nodes.push(span);
    }
    el.replaceChildren(...nodes);
  }, []);

  const apply = useCallback((next: LocaleCode) => {
    if (typeof document === "undefined") return;
    applying.current = true;
    const index = buildIndex(next);
    const { text: textStore, attr: attrStore } = store.current;
    const root = document.body;

    // 1. elements tagged with data-i18n — structural strings (e.g. the hero headline)
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = STRINGS[key]?.[next] ?? STRINGS[key]?.en;
      if (value) paint(el, value);
    });

    // 2. every text node
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest(`[${SKIP_ATTR}]`)) continue;
      if (parent.hasAttribute("data-i18n")) continue; // handled above

      let base = textStore.get(textNode);
      if (base === undefined) {
        base = textNode.nodeValue ?? "";
        textStore.set(textNode, base);
      }
      if (!base.trim()) continue;

      const target = index?.get(normalise(base));
      if (target) {
        const lead = base.match(/^\s*/)?.[0] ?? "";
        const trail = base.match(/\s*$/)?.[0] ?? "";
        textNode.nodeValue = lead + target.split("|").join("") + trail;
      } else if (next === DEFAULT_LOCALE) {
        textNode.nodeValue = base;
      }
    }

    // 3. attributes worth translating
    ATTRS.forEach((attr) => {
      root.querySelectorAll(`[${attr}]`).forEach((el) => {
        if (el.closest(`[${SKIP_ATTR}]`)) return;
        let saved = attrStore.get(el);
        if (!saved) {
          saved = new Map();
          attrStore.set(el, saved);
        }
        const current = el.getAttribute(attr) ?? "";
        if (!saved.has(attr)) saved.set(attr, current);
        const base = saved.get(attr) ?? "";
        const target = index?.get(normalise(base));
        el.setAttribute(attr, target ?? (next === DEFAULT_LOCALE ? base : current));
      });
    });

    const meta = localeMeta(next);
    document.documentElement.lang = next;
    document.documentElement.dir = meta.dir;
    applying.current = false;
  }, [paint]);

  const setLocale = useCallback(
    (next: LocaleCode) => {
      localeRef.current = next;
      setLocaleState(next);
      try {
        localStorage.setItem(LOCALE_COOKIE, next);
      } catch {
        /* private mode */
      }
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      apply(next);
    },
    [apply],
  );

  // restore the saved choice once, and keep the DOM translated as React re-renders
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LOCALE_COOKIE);
    } catch {
      /* private mode */
    }
    if (!saved) {
      const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
      saved = match ? decodeURIComponent(match[1]) : null;
    }
    if (isLocale(saved) && saved !== DEFAULT_LOCALE) {
      localeRef.current = saved;
      setLocaleState(saved);
      apply(saved);
    }

    let queued = false;
    const observer = new MutationObserver(() => {
      if (applying.current || localeRef.current === DEFAULT_LOCALE) return;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        apply(localeRef.current);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [apply]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
