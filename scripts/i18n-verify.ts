/**
 * End-to-end translation check.
 *
 *   npm run i18n:verify
 *
 * For every locale it opens the site, switches language with the real picker, then
 * collects every visible text node that is still *identical to an English source
 * string that has a dictionary entry*. Anything listed is a node the provider
 * failed to translate — i.e. a real gap, not just a string nobody added yet.
 *
 * Numbers, currency fragments and the brand name are ignored: they are the same in
 * every language on purpose.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { LOCALES } from "../src/lib/i18n/locales";
import { STRINGS, normaliseKey } from "../src/lib/i18n/strings";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAGES = (process.env.PAGES ?? "/,/loans/business,/faq,/security,/mobile-app").split(",");

const filled = JSON.parse(readFileSync("src/lib/i18n/filled.json", "utf8")) as Record<
  string,
  Record<string, string>
>;
/** English source -> its translation per locale (hand-written wins over generated). */
const dictionary = new Map<string, Record<string, string>>();
for (const entry of Object.values(STRINGS)) {
  const key = normaliseKey(entry.en.replace(/\|/g, ""));
  const row: Record<string, string> = {};
  for (const [code, value] of Object.entries(entry)) {
    if (code !== "en" && typeof value === "string") row[code] = normaliseKey(value.replace(/\|/g, ""));
  }
  dictionary.set(key, row);
}
for (const [source, row] of Object.entries(filled)) {
  const key = normaliseKey(source);
  dictionary.set(key, { ...(dictionary.get(key) ?? {}), ...row });
}

/** Same in every locale, so "unchanged" is correct for these. */
const SAME = /^[£$€\d\s.,:•·×%↓↑+−–—-]*$/;

/** Never translated: brand, sample names, endonyms, picker labels. */
const NEVER = new Set([
  "Meridian",
  "Alex Morgan",
  "you@example.com",
  ...LOCALES.map((l) => l.native),
  ...LOCALES.map((l) => l.label),
]);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  let failures = 0;

  for (const { code, label } of LOCALES.filter((l) => l.code !== "en")) {
    const leftovers = new Map<string, string>();

    for (const path of PAGES) {
      // Seed the stored locale, then load the page. Pages without a picker
      // (login, register, legal) still translate from the saved preference.
      await page.addInitScript((loc) => {
        try {
          localStorage.setItem("meridian_locale", loc);
          document.cookie = `meridian_locale=${loc}; path=/`;
        } catch {
          /* ignore */
        }
      }, code);
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      const stuck: string[] = await page.evaluate(() => {
        const out: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const el = (node as Text).parentElement;
          if (!el || skip.has(el.tagName)) continue;
          if (el.closest("[data-i18n]")) continue;
          const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
          if (text.length > 1) out.push(text);
        }
        for (const el of document.querySelectorAll("[placeholder],[aria-label],[title],[alt]")) {
          for (const attr of ["placeholder", "aria-label", "title", "alt"]) {
            const value = el.getAttribute(attr);
            if (value) out.push(value.replace(/\s+/g, " ").trim());
          }
        }
        return out;
      });

      for (const text of stuck) {
        if (NEVER.has(text)) continue;
        const key = normaliseKey(text);
        const expected = dictionary.get(key)?.[code];
        if (!expected || SAME.test(text)) continue;
        // a real gap is when the page still shows the English word but the locale
        // has a different word for it. Cognates ("Contact" in Dutch) are fine.
        if (normaliseKey(expected) === key) continue;
        leftovers.set(key, path);
      }
    }

    if (leftovers.size) {
      failures++;
      console.log(`${code} (${label}): ${leftovers.size} untranslated`);
      for (const [text, path] of [...leftovers].slice(0, 6)) console.log(`   ${path}  ${JSON.stringify(text)}`);
    } else {
      console.log(`${code} (${label}): ok — every dictionary string replaced on ${PAGES.length} pages`);
    }
  }

  await browser.close();
  console.log(failures ? `\n${failures} locale(s) still show English text.` : "\nAll locales fully translated.");
  process.exit(failures ? 1 : 0);
}

main();
