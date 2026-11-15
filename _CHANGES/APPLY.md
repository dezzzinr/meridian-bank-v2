# What changed, file by file

11 photographs, 9 edited files, 1 new component. Each edit is small and independent — you can
take any subset.

## New: `src/components/pages/Photos.tsx`

Two server components, both wrapping `next/image`:

- **`<HeroPhoto src position? />`** — full-bleed backdrop for a `bg-night` page hero. Renders the
  image plus scrim at `-z-10`, so the section needs `relative isolate overflow-hidden` and the
  hero's own content needs `relative`. No other markup changes.
- **`<PhotoPanel src alt width height />`** — a contained panel with a fixed aspect ratio, sized
  to sit in `PublicInfoPage`'s `illustration` slot (which otherwise defaults to a 4:3 SVG).

## `src/app/page.tsx`

1. `import Image from "next/image"`.
2. Hero: `<Image fill priority>` + scrim behind the night section; `object-[76%_center]` anchors
   the still life so the copy column stays on the dark wall.
3. Both `aspect-[1.45]` slots: `InsightIllustration` / `CardsIllustration` replaced with photos at
   the same ratio, so nothing shifts. Their import is removed; `MarketingVisuals.tsx` is left in
   place so no other file breaks.
4. The 5 "Finance for what's next" tiles gained a photo header (`h-32 object-cover`, zooms on
   hover). Padding moved from the `<Link>` to an inner `<div>` so the photo sits flush.

## `src/app/layout.tsx`

`metadataBase`, `openGraph` (with the 1200×630 card) and `twitter` summary card.

## The marketing pages

| File | Edit |
| --- | --- |
| `about/page.tsx` | `illustration={<PhotoPanel src="/images/hero-lifestyle.jpg" …/>}` |
| `loans/mortgage/page.tsx` | `illustration` → `mortgage-home`; `MortgageIllustration` import dropped (file kept) |
| `loans/business/page.tsx` | `illustration` → `business-loan` |
| `loans/car/page.tsx` | `illustration` → `car-loan` |
| `careers/page.tsx` | section gets `relative isolate overflow-hidden` + `<HeroPhoto src="/images/careers.jpg"/>` |
| `investment-centres/page.tsx` | same pattern, `investments.jpg`, `position="70% center"` |
| `community/page.tsx` | photo band above the privacy note (its hero has a cards panel that a backdrop would fight) |

## Why the scrim lives in CSS

The photo files carry no darkening, so the same JPEG works as a hero backdrop, a panel, or a
tile. Contrast is the layout's job: `rgba(16,32,25,…)` gradients keep headline contrast high
without baking anything into the asset.

## Rollback

```bash
git checkout -- src/app/            # all page edits
rm src/components/pages/Photos.tsx  # the new component
git rm -r public/images             # the photographs
```
