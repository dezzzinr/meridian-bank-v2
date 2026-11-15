/**
 * Translation coverage audit.
 *
 *   npm run dev            # in one terminal
 *   npx tsx scripts/i18n-audit.ts
 *   BASE_URL=https://meridian-bank-v2.vercel.app npx tsx scripts/i18n-audit.ts
 *
 * Crawls the public pages, extracts every visible text node, and reports which ones
 * have no entry in src/lib/i18n/strings.ts — i.e. what still renders in English.
 * Add the missing strings to STRINGS (or scripts/i18n-strings.py) and re-run.
 */
import { chromium } from "@playwright/test";
import { STRINGS, normaliseKey } from "../src/lib/i18n/strings";
import { readFileSync } from "node:fs";
import { LOCALES } from "../src/lib/i18n/locales";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAGES = (process.env.PAGES ?? [
  "/", "/about", "/careers", "/community", "/investment-centres",
  "/loans", "/loans/mortgage", "/loans/business", "/loans/car",
  "/faq", "/help", "/contact", "/security", "/mobile-app",
  "/login", "/register", "/privacy", "/terms", "/cookies", "/legal",
].join(",")).split(",");

// Strings count as covered if they live in STRINGS *or* in the generated dictionary.
/** Text that must stay as-is in every locale: brand, endonyms, picker labels. */
const NEVER = new Set([
  "Meridian",
  "Alex Morgan",
  "you@example.com",
  "GBP",
  "£",
  ...LOCALES.map((l) => l.native),
  ...LOCALES.map((l) => l.label),
]);

/** Amounts keep the source formatting — the UI splits pounds and cents. */
const SAME_IN_EVERY_LOCALE = /^[−+\-–]?\s?£?\s?[\d.,\u00a0 ]+\s?£?$/;

const filled = JSON.parse(readFileSync("src/lib/i18n/filled.json", "utf8")) as Record<
  string,
  Record<string, string>
>;
const known = new Set([
  ...Object.values(STRINGS).map((entry) => normaliseKey(entry.en.replace(/\|/g, ""))),
  ...Object.keys(filled),
]);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const missing = new Map<string, number>();
  let total = 0;
  let hit = 0;

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const texts: string[] = await page.evaluate(() => {
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const el = (node as Text).parentElement;
        if (!el || skip.has(el.tagName)) continue;
        // structural keys replace the whole subtree, and sample names/addresses stay
        if (el.closest("[data-i18n]")) continue;
        const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
        if (text.length > 1) out.push(text);
      }
      // attributes are visible too: placeholders, tooltips, screen-reader labels
      for (const el of document.querySelectorAll("[placeholder],[aria-label],[title],[alt]")) {
        for (const attr of ["placeholder", "aria-label", "title", "alt"]) {
          const value = el.getAttribute(attr);
          if (value) {
            const text = value.replace(/\s+/g, " ").trim();
            if (text.length > 1) out.push(text);
          }
        }
      }
      return out;
    });

    for (const text of texts) {
      // skip brand names, endonyms and the picker's own labels — they stay put
      if (NEVER.has(text) || SAME_IN_EVERY_LOCALE.test(text)) continue;
      total++;
      if (known.has(normaliseKey(text))) hit++;
      else missing.set(text, (missing.get(text) ?? 0) + 1);
    }
  }
  await browser.close();

  const pct = ((100 * hit) / total).toFixed(0);
  console.log(`\nCoverage: ${hit}/${total} translatable text nodes (${pct}%)`);
  console.log("(brand name, language endonyms and picker labels excluded — they stay as-is)\n");

  const ranked = [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
  if (ranked.length) {
    console.log("Most frequent untranslated strings (★ = appears on several pages):\n");
    for (const [text, count] of ranked) {
      console.log(`  ${count > 1 ? "★" : " "} ${JSON.stringify(text)}`);
    }
    console.log(`\n${missing.size} unique strings to translate, ×14 locales = ${missing.size * 14} entries.`);
  } else {
    console.log("Nothing left to translate on these pages.");
  }
}

main();
