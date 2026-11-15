# meridian-bank-v2 — photography + translator

Complete working copy of `dezzzinr/meridian-bank-v2` with two features added on top of your
repo. I ran `tsc --noEmit` (clean) and `next build` (succeeded) against exactly this tree.

## 1. Photography — all 11 images wired

| Path | What changed |
| --- | --- |
| `public/images/` | 11 photographs (JPEG) |
| `src/components/pages/Photos.tsx` | **new** — `HeroPhoto` (full-bleed backdrop), `PhotoPanel` (contained 4:3) |
| `src/app/page.tsx` | hero background, both 1.45 slots, photo headers on the 5 "Finance for what's next" tiles |
| `src/app/layout.tsx` | `metadataBase`, `openGraph`, `twitter` card |
| `src/app/about/page.tsx` | `hero-lifestyle` in the illustration panel |
| `src/app/loans/{mortgage,business,car}/page.tsx` | `mortgage-home` · `business-loan` · `car-loan` |
| `src/app/careers/page.tsx` · `investment-centres/page.tsx` | hero backdrops |
| `src/app/community/page.tsx` | editorial photo band |

## 2. Translator — 15 locales

Switcher in the public header (and the mobile chip row), plus in the dashboard sidebar and
mobile top bar. English · Deutsch · Français · Italiano · Español · Português · Nederlands ·
Türkçe · Bahasa Indonesia · Русский · العربية (RTL) · 简体中文 · 日本語 · 한국어 · हिन्दी.

| Path | What changed |
| --- | --- |
| `src/lib/i18n/locales.ts` | locale registry + direction |
| `src/lib/i18n/strings.ts` | 43 keys × 14 translations = 602 hand-written strings |
| `src/lib/i18n/filled.json` | 431 strings × 14 locales = 6,034 generated entries (the bulk of the site) |
| `src/components/i18n/LanguageProvider.tsx` | persistence + DOM matcher |
| `src/components/i18n/LanguageSwitcher.tsx` | the control |
| `scripts/i18n-audit.ts` · `i18n-fill.ts` · `i18n-merge.ts` · `i18n-verify.ts` · `i18n-strings.py` | coverage, filler, batch merge, browser test, regenerator |
| `scripts/mt/`, `scripts/mt2/`, `scripts/mt3/` | reviewed translation batches (NNN|text rows, index-checked on merge) |
| `src/app/layout.tsx`, `shell/PublicSite.tsx`, `shell/AppShell.tsx` | provider mount + switcher placement |

**Coverage: 1,577 / 1,577 translatable strings (100%) across 20 public routes** — text nodes,
placeholders, aria-labels and image alt text — verified in
a real browser in all 14 non-English locales (`npm run i18n:verify` — zero strings left in
English). Login, registration and the legal pages are covered too, and the provider is mounted
in the root layout so the signed-in app inherits the same dictionary.

Only three things stay as-is in every locale, on purpose: the brand name `Meridian`, the
language endonyms in the picker, and amounts such as `£8,420.50` (the UI splits pounds and
cents into separate nodes, so re-formatting them per locale breaks the card layout).

Four scripts ship with it:

```bash
npm run i18n:audit     # coverage % + ranked list of anything still English
npm run i18n:fill      # generate gaps (MyMemory needs no key; DeepL gives the best quality)
npm run i18n:merge     # merge reviewed scripts/mt*/*.txt batches into filled.json
npm run i18n:verify    # browser test: switch language on every page, report what stayed English
```

**Read `_CHANGES/I18N.md` before you demo it** — especially the note on the legal pages: the
privacy/terms/cookies translations are a first pass and need a human review before launch.

---

## Apply to your existing clone

**Easiest — apply the patch.** It touches 25 files (13 modified, 12 new):

```bash
cd ~/code/meridian-bank-v2
U=~/Downloads/meridian-bank-v2-with-images     # wherever you unzipped this

git apply --stat  $U/_CHANGES/images-and-i18n.patch     # review
git apply --check $U/_CHANGES/images-and-i18n.patch     # confirm it applies
git apply         $U/_CHANGES/images-and-i18n.patch
cp -r $U/public/images public/                          # images aren't in the patch

npm install && npm run dev
```

**Or copy the files by hand** (same result):

```bash
cd ~/code/meridian-bank-v2
U=~/Downloads/meridian-bank-v2-with-images

# images + the two new folders
cp -r $U/public/images public/
cp -r $U/src/lib/i18n src/lib/
cp -r $U/src/components/i18n src/components/
cp    $U/src/components/pages/Photos.tsx src/components/pages/

# the i18n scripts go in the existing repo-root scripts/ folder
cp $U/scripts/i18n-audit.ts $U/scripts/i18n-fill.ts $U/scripts/i18n-strings.py scripts/

# edited files
cp $U/src/app/page.tsx $U/src/app/layout.tsx src/app/
cp $U/src/app/about/page.tsx src/app/about/
cp $U/src/app/careers/page.tsx src/app/careers/
cp $U/src/app/community/page.tsx src/app/community/
cp $U/src/app/investment-centres/page.tsx src/app/investment-centres/
cp $U/src/app/loans/mortgage/page.tsx src/app/loans/mortgage/
cp $U/src/app/loans/business/page.tsx src/app/loans/business/
cp $U/src/app/loans/car/page.tsx src/app/loans/car/
cp $U/src/components/shell/PublicSite.tsx $U/src/components/shell/AppShell.tsx src/components/shell/

npm install && npm run dev
```

If you copy by hand, add these two lines to the `"scripts"` block in `package.json`
(the patch route already does this):

```json
"i18n:audit": "tsx scripts/i18n-audit.ts",
"i18n:fill": "tsx scripts/i18n-fill.ts"
```

Then:

```bash
git add -A
git commit -m "Add photography and a 15-locale language switcher"
git push
```

## Verify

| Where | Expect |
| --- | --- |
| `/` | photo hero, photo slots, photo headers on all 5 lending tiles |
| `/about`, `/loans/*`, `/careers`, `/investment-centres`, `/community` | photos as described above |
| any page header | a globe selector — pick Deutsch, 日本語, العربية |
| Arabic | whole layout mirrors, `<html dir="rtl">` |
| after reload | the language sticks |
| `/login`, `/register` | picker top-right; the whole screen translates |
| `/privacy`, `/terms`, `/cookies`, `/legal` | fully translated body copy |

## Known rough edges

- **`npm ci` fails on this repo** (lockfile out of sync) — use `npm install`.
- `metadataBase` is `https://meridian-bank-v2.vercel.app`; change it if you add a domain.
- The signed-in area (`/app/*`) uses the same provider and dictionary, but it needs a live
  database and a session to audit, so it was not crawled here. To check it against your own
  DB: sign in, then
  `PAGES="/app,/app/activity,/app/payments,/app/cards" npm run i18n:audit` and
  `… npm run i18n:verify`. Anything it reports is added the same way as the public strings.
- `filled.json` adds ~120 KB gzipped to the client bundle (all 15 locales ship to every
  visitor). Splitting it per locale is a one-line-per-language change — see the end of
  `_CHANGES/I18N.md`.
- The `next.config.ts` in this zip is your original, unmodified file. I only temporarily
  disabled Next's TypeScript step while building in a 2-vCPU sandbox; types were verified
  separately with `tsc --noEmit`.
