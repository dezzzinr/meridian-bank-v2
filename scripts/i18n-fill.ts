/**
 * Fills translation gaps found by `i18n:audit`.
 *
 *   npm run dev
 *   npx tsx scripts/i18n-fill.ts --dry-run            # show what would be translated
 *   npx tsx scripts/i18n-fill.ts --provider=mymemory --workers=4   # no API key needed
 *   npx tsx scripts/i18n-fill.ts --provider=libretranslate
 *   DEEPL_API_KEY=xxx npx tsx scripts/i18n-fill.ts --provider=deepl
 *   OPENAI_API_KEY=xxx npx tsx scripts/i18n-fill.ts --provider=openai
 *
 * Safe to re-run: strings already in filled.json are skipped, so a long run can be
 * interrupted and resumed.
 *
 * Writes src/lib/i18n/filled.json, which the runtime merges over STRINGS.
 * Hand-written copy in strings.ts is never touched, and strings already present
 * there are skipped — so this only ever adds.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { STRINGS, normaliseKey } from "../src/lib/i18n/strings";
import { LOCALES, type LocaleCode } from "../src/lib/i18n/locales";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v] as const;
  }),
);
const PROVIDER = args.get("provider") ?? "libretranslate";
const DRY = args.get("dry-run") === "true";
const LIMIT = Number(args.get("limit") ?? "400");
const WORKERS = Math.max(1, Number(args.get("workers") ?? "4"));
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAGES = (process.env.PAGES ?? [
  "/", "/about", "/careers", "/community", "/investment-centres",
  "/loans", "/loans/mortgage", "/loans/business", "/loans/car",
  "/faq", "/help", "/contact", "/security", "/mobile-app",
  "/login", "/register", "/privacy", "/terms", "/cookies", "/legal",
].join(",")).split(",");

/** Amounts stay in the source formatting — the UI splits pounds and cents. */
const MONEY = /^[−+\-–]?\s?£?\s?[\d.,\u00a0 ]+\s?£?$/;
const FILLED_PATH = "src/lib/i18n/filled.json";

/** Strings that are correct as-is in every locale. */
const NEVER = new Set(["Meridian", "GBP", "£", "Alex Morgan", "you@example.com"]);

async function collectMissing(): Promise<string[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const known = new Set([
    ...Object.values(STRINGS).map((e) => normaliseKey(e.en.replace(/\|/g, ""))),
    ...LOCALES.map((l) => l.native),
    ...LOCALES.map((l) => l.label),
  ]);
  const missing = new Set<string>();

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
      if (!known.has(text) && !NEVER.has(text) && !MONEY.test(text)) missing.add(text);
    }
  }
  await browser.close();
  return [...missing].slice(0, LIMIT);
}

type Translate = (texts: string[], target: LocaleCode) => Promise<string[]>;

const libretranslate: Translate = async (texts, target) => {
  const url = process.env.LT_URL ?? "https://libretranslate.com";
  const res = await fetch(`${url}/translate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      q: texts,
      source: "en",
      target,
      format: "text",
      api_key: process.env.LT_API_KEY,
    }),
  });
  if (!res.ok) throw new Error(`libretranslate ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { translatedText: string | string[] };
  return Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];
};

const deepl: Translate = async (texts, target) => {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error("DEEPL_API_KEY is not set");
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: { authorization: `DeepL-Auth-Key ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ text: texts, source_lang: "EN", target_lang: target.toUpperCase() }),
  });
  if (!res.ok) throw new Error(`deepl ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => t.text);
};

const openai: Translate = async (texts, target) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `Translate UI copy for a UK online bank into ${target}. Keep it short, calm and plain. ` +
            `Preserve placeholders, £ signs, numbers and product names. Reply with JSON: ` +
            `{"translations":["...","..."]} in the same order and length as the input.`,
        },
        { role: "user", content: JSON.stringify(texts) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(data.choices[0].message.content) as { translations: string[] };
  if (parsed.translations.length !== texts.length) throw new Error("openai returned a wrong-length batch");
  return parsed.translations;
};

/** MyMemory uses slightly different locale tags. */
const MM_LANG: Record<string, string> = { zh: "zh-CN" };

const mymemory: Translate = async (texts, target) => {
  const out: string[] = [];
  for (const text of texts) {
    const params = new URLSearchParams({ q: text, langpair: `en|${MM_LANG[target] ?? target}` });
    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`);
    if (!res.ok) throw new Error(`mymemory ${res.status}`);
    const data = (await res.json()) as {
      responseStatus: number | string;
      responseData: { translatedText: string };
    };
    const value = data.responseData?.translatedText ?? "";
    if (
      Number(data.responseStatus) !== 200 ||
      !value ||
      /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(value)
    ) {
      throw new Error(`mymemory: ${value || "empty response"}`);
    }
    out.push(value);
  }
  return out;
};

const PROVIDERS: Record<string, Translate> = { libretranslate, deepl, openai, mymemory };

async function main() {
  const translate = PROVIDERS[PROVIDER];
  if (!translate) throw new Error(`unknown provider "${PROVIDER}" (use ${Object.keys(PROVIDERS).join(", ")})`);

  console.log(`provider: ${PROVIDER}${DRY ? " (dry run)" : ""}`);
  const missing = await collectMissing();
  console.log(`${missing.length} untranslated strings found\n`);

  // --dump writes the ordered list so it can be translated by hand (or by an LLM),
  // then merged back with `npx tsx scripts/i18n-merge.ts`.
  if (args.get("dump") === "true") {
    const out = args.get("out") ?? "scripts/i18n-missing.json";
    writeFileSync(out, JSON.stringify(missing, null, 2) + "\n");
    console.log(`wrote ${out} (${missing.length} strings)`);
    return;
  }

  if (!missing.length) return;
  if (DRY) {
    for (const m of missing.slice(0, 40)) console.log("  " + JSON.stringify(m));
    console.log(`\n${missing.length} strings × ${LOCALES.length - 1} locales = ${missing.length * (LOCALES.length - 1)} requests.`);
    return;
  }

  const filled = JSON.parse(readFileSync(FILLED_PATH, "utf8")) as Record<string, Record<string, string>>;
  const pending = missing.filter((source) =>
    LOCALES.some((l) => l.code !== "en" && !filled[source]?.[l.code]),
  );
  console.log(`${pending.length} strings still needing at least one locale\n`);

  const save = () => writeFileSync(FILLED_PATH, JSON.stringify(filled, null, 2) + "\n");

  for (const { code } of LOCALES.filter((l) => l.code !== "en")) {
    const todo = pending.filter((source) => !filled[source]?.[code]);
    if (!todo.length) continue;

    let done = 0;
    let failed = 0;
    const queue = [...todo];

    const worker = async () => {
      for (;;) {
        const source = queue.shift();
        if (!source) return;
        try {
          const [translated] = await translate([source], code);
          if (translated) {
            filled[source] = filled[source] ?? {};
            filled[source][code] = translated;
            done++;
          }
        } catch (error) {
          failed++;
          const message = (error as Error).message;
          // stop a locale early if we're being rate limited or capped
          if (/warning|limit|429|quota/i.test(message) && failed > 5) {
            console.error(`\n  ${code}: stopping after ${failed} failures (${message.slice(0, 80)})`);
            queue.length = 0;
            return;
          }
        }
        if (done % 10 === 0) {
          process.stdout.write(`\r  ${code}: ${done}/${todo.length}`);
          save();
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(WORKERS, todo.length) }, worker));
    save();
    process.stdout.write(`\r  ${code}: ${done}/${todo.length}${failed ? ` (${failed} failed)` : ""}\n`);
  }

  console.log(`\n\nwrote ${FILLED_PATH} — re-run \`npm run i18n:audit\` to confirm.`);
}

main();
