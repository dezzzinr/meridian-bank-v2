/**
 * Merges hand-made (or exported) translation files into src/lib/i18n/filled.json.
 *
 *   npx tsx scripts/i18n-merge.ts
 *
 * Expects scripts/mt/<locale>.txt with one line per string from
 * scripts/i18n-missing.json, in the same order, formatted as:
 *
 *   001|Zeile eins
 *   002|Zeile zwei
 *
 * The numeric prefix is checked, so a file that is out of step with the source
 * list fails loudly instead of silently shifting every translation by one row.
 * Existing translations for a locale are replaced; other locales are untouched.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LOCALE_CODES } from "../src/lib/i18n/locales";

const flag = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;

const MISSING = flag("list", "scripts/i18n-missing.json");
/** Amounts stay in the source formatting — the UI splits pounds and cents. */
const MONEY = /^[−+\-–]?\s?£?\s?[\d.,\u00a0 ]+\s?£?$/;
const FILLED = "src/lib/i18n/filled.json";
const DIR = flag("dir", "scripts/mt");

const sources = JSON.parse(readFileSync(MISSING, "utf8")) as string[];
const filled = JSON.parse(readFileSync(FILLED, "utf8")) as Record<string, Record<string, string>>;

let failures = 0;
const report: string[] = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort()) {
  const locale = file.replace(/\.txt$/, "");
  if (!LOCALE_CODES.includes(locale as (typeof LOCALE_CODES)[number])) {
    console.log(`skip ${file}: not a configured locale`);
    continue;
  }

  const rows = readFileSync(join(DIR, file), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  const problems: string[] = [];
  if (rows.length !== sources.length) problems.push(`${rows.length} rows, expected ${sources.length}`);

  let written = 0;
  let skipped = 0;
  rows.forEach((row, i) => {
    const sep = row.indexOf("|");
    if (sep < 0) {
      problems.push(`row ${i + 1}: missing "|" separator`);
      return;
    }
    const index = Number(row.slice(0, sep));
    const text = row.slice(sep + 1).trim();
    if (index !== i + 1) problems.push(`row ${i + 1}: index ${index}`);
    if (!text) problems.push(`row ${i + 1}: empty translation`);
    const source = sources[index - 1];
    if (!source) return;
    if (MONEY.test(source)) {
      skipped++;
      return;
    }
    filled[source] = filled[source] ?? {};
    filled[source][locale] = text;
    written++;
  });

  if (problems.length) {
    failures++;
    console.log(`${locale}: ${problems.length} problem(s) — ${problems.slice(0, 4).join("; ")}`);
  } else {
    report.push(`${locale}: ${written} strings${skipped ? ` (${skipped} amounts left as-is)` : ""}`);
  }
}

if (failures) {
  console.log(`\n${failures} file(s) need fixing — nothing written.`);
  process.exit(1);
}

writeFileSync(FILLED, JSON.stringify(filled, null, 2) + "\n");
const locales = new Set(Object.values(filled).flatMap((v) => Object.keys(v)));
console.log(report.join("\n"));
console.log(`\nwrote ${FILLED}: ${Object.keys(filled).length} strings × ${locales.size} locales`);
