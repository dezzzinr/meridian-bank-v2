# Meridian — photo set

Photography for **[dezzzinr/meridian-bank-v2](https://github.com/dezzzinr/meridian-bank-v2)**,
built to the site's own design system rather than bolted on.

| | |
| --- | --- |
| **Palette** | sampled from `src/app/globals.css` — forest green `#17664f`, deep `#104a39`, sage `#e2f1e9`, mint `#a7d4b5`, cream `#f4f3ee`, night `#102019` |
| **Type** | the OG card is set in Space Grotesk + Manrope, the same two fonts `layout.tsx` loads |
| **Ratios** | 2048×1024 hero (2:1), 1450×1000 for the two existing `aspect-[1.45]` slots, 1200×900 marketing, 2400×1350 about band, 1200×630 OG |
| **Formats** | `.jpg` (progressive, q82) + `.webp` + `.avif` |
| **Weight** | 1.7 MB total as JPEG; ~3.2 MB for all three formats |

## Look at this first

Open **`preview.html`** — it shows every photo in the layout it's meant for (hero, both
1.45 slots, the lending grid, the OG card), with dimensions, file weights and alt text
beside each file. It's self-contained, so it works offline.

## Install

```bash
./sync-to-repo.sh ~/code/meridian-bank-v2     # copies into public/images/
```

The fastest route is **`APPLY.md`** — it ships the two edited files ready to drop in
(`apply/`), plus a `git apply`-able diff and a verification checklist. The edits were
applied to a clone of your repo, built, served and screenshotted (`verify/`).

Or do it by hand with the JSX in **`SNIPPETS.md`** — sections 1–3 and 6:

1. hero photograph inside the night section, with a left-weighted scrim;
2. the "see what's coming in and going out" slot;
3. the "cards and payments" slot;
4. the `openGraph` + `twitter` metadata so shared links get a real card.

```bash
git add public/images src/app/page.tsx src/app/layout.tsx
git commit -m "Add photography for landing and marketing pages"
git push
```

## The files

| File | Size | Where it goes |
| --- | --- | --- |
| `hero-meridian.jpg` | 2048×1024 | home hero, behind the night section |
| `hero-lifestyle.jpg` | 2400×1350 | `/about` wide hero band |
| `insight-overview.jpg` | 1450×1000 | home, replaces `InsightIllustration` |
| `cards-payments.jpg` | 1450×1000 | home, replaces `CardsIllustration` |
| `mortgage-home.jpg` | 1200×900 | `/loans/mortgage` + lending tile |
| `business-loan.jpg` | 1200×900 | `/loans/business` + lending tile |
| `car-loan.jpg` | 1200×900 | `/loans/car` + lending tile |
| `investments.jpg` | 1200×900 | `/investment-centres` + lending tile |
| `community.jpg` | 1200×900 | `/community` |
| `careers.jpg` | 1200×900 | `/careers` |
| `og-meridian.jpg` | 1200×630 | `openGraph.images` / `twitter.images` |

Exact byte sizes, alt text and target slot for each are in **`manifest.json`**.

## Art direction

The brief came from the site's own copy — *"a clearer way to bank"*, *"calm"*,
*"thoughtful"*. So: muted forest greens and creams, soft directional daylight, shallow
depth of field, no stock-photo smiles, no invented UI, no text anywhere in frame.

The hero is a still life, not a lifestyle shot, on purpose: it was composed with a dark
green wall across the left half so the headline gets free space and contrast, with the
objects resolving right where the balance card floats. A person-based hero frame was shot
first and rejected — the flat wall in its right third left the copy fighting midtones. The
card in `cards-payments.jpg` is blank on purpose, and the phone in `insight-overview.jpg`
shows a dark screen — nothing in the photos asserts a product feature that doesn't exist.

## Notes

- **`next/image` handles the variants.** You only need the `.jpg` files in `public/images/`
  — Next re-encodes to WebP/AVIF and serves the right size per breakpoint. `sync-to-repo.sh`
  copies JPEGs only. The `.webp`/`.avif` siblings here are for plain `<img>` or CSS
  backgrounds if you'd rather not use `next/image`.
- **`metadataBase` is required** for the OG image to resolve. Use your real production
  domain in `layout.tsx`; it's `https://meridian-bank-v2.vercel.app` in the snippet.
- **These are AI-generated images**, not photographs of real people or a real bank — fine
  for a demo or portfolio. If Meridian becomes real, swap `community.jpg` and `careers.jpg`
  for licensed photography.
- **Rebuilding:** `build.py` re-crops from `raw/` and recomposes the OG card; it needs
  PIL and the two Google fonts in `../_fonts/`. `gen_preview.py` regenerates `preview.html`.
