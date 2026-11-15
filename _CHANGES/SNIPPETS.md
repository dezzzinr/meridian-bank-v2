# Snippets — wiring the photos into `meridian-bank-v2`

Everything below assumes you copied `public/images/` into the repo root (see `README.md`).
Next.js serves that folder at `/images/...` with no config change, and `next/image`
re-encodes and lazy-loads it for you.

Files touched: **`src/app/page.tsx`** and **`src/app/layout.tsx`**. Nothing else is required;
sections 4–6 are optional extras for the marketing pages.

---

## 0. Add the images

```bash
./sync-to-repo.sh ~/code/meridian-bank-v2
```

Result:

```
public/images/
  hero-meridian.jpg     2048×1024
  hero-lifestyle.jpg    2400×1350
  insight-overview.jpg  1450×1000
  cards-payments.jpg    1450×1000
  mortgage-home.jpg     1200×900
  business-loan.jpg     1200×900
  car-loan.jpg          1200×900
  investments.jpg       1200×900
  community.jpg         1200×900
  careers.jpg           1200×900
  og-meridian.jpg       1200×630
```

Each also has `.webp` and `.avif` siblings. With `next/image` you don't need them —
Next generates AVIF/WebP itself. Keep them only if you use plain `<img>` or CSS backgrounds.

---

## 1. Hero — put the photograph inside the night section

`hero-meridian.jpg` is composed for this exact job: a dark green wall across the left half
where the headline sits, and a still life resolving on the right where the balance card
floats. The scrim is **CSS, not baked into the file**, so the photo stays reusable.

**`src/app/page.tsx`** — add the import:

```tsx
import Image from "next/image";
```

Replace the hero section's opening markup:

```tsx
{/* BEFORE */}
<section className="overflow-hidden bg-night text-white">
  <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:py-24">

{/* AFTER */}
<section className="relative isolate overflow-hidden bg-night text-white">
  <Image
    src="/images/hero-meridian.jpg"
    alt=""
    aria-hidden
    fill
    priority
    sizes="100vw"
    className="-z-10 object-cover object-[76%_center]"
  />
  {/* vertical scrim on phones, left-to-right on desktop */}
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,32,25,.97)_0%,rgba(16,32,25,.94)_58%,rgba(16,32,25,.86)_100%)] lg:bg-[linear-gradient(100deg,#102019_0%,rgba(16,32,25,.93)_36%,rgba(16,32,25,.55)_66%,rgba(16,32,25,.22)_100%)]"
  />
  <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:py-24">
```

Why it's safe:

- `alt=""` + `aria-hidden` — the photo is decorative behind the headline, so a screen
  reader skips it and the H1 carries the meaning.
- `object-[76%_center]` anchors the crop on the still life. On phones the scrim goes
  vertical because the copy stacks over the whole frame — a left-to-right gradient leaves
  body text sitting on the cup.
- The existing `PreviewCard` needs **no change**; it reads as a floating app card over the
  photo, which is the intended look. It keeps its own `relative` stacking because the
  photo and scrim are both `-z-10`.
- The `bg-night` on the section stays as the fallback colour while the image loads.

### If you'd rather keep the hero flat

Then use `hero-meridian.jpg` as a wide band on `/about` instead (section 5 below) and
delete the two lines above. The rest of the set doesn't depend on it.

## 2. Insight slot — swap the SVG for a photo

**`src/app/page.tsx`**, in the "See what's coming in and going out" section:

```tsx
{/* BEFORE */}
<div className="aspect-[1.45] overflow-hidden rounded-[26px] shadow-card">
  <InsightIllustration />
</div>

{/* AFTER */}
<div className="aspect-[1.45] overflow-hidden rounded-[26px] shadow-card">
  <Image
    src="/images/insight-overview.jpg"
    alt="Reviewing recent account activity on a phone beside a notebook"
    width={1450}
    height={1000}
    sizes="(max-width: 1024px) 100vw, 46vw"
    className="h-full w-full object-cover"
  />
</div>
```

The image is already 1.45, so `object-cover` never crops it — the ratio in the wrapper
and the file match exactly.

---

## 3. Cards & payments slot

Same section pattern, further down:

```tsx
{/* BEFORE */}
<div className="aspect-[1.45] overflow-hidden rounded-[26px] shadow-card">
  <CardsIllustration />
</div>

{/* AFTER */}
<div className="aspect-[1.45] overflow-hidden rounded-[26px] shadow-card">
  <Image
    src="/images/cards-payments.jpg"
    alt="Tapping a Meridian debit card on a card reader at a café counter"
    width={1450}
    height={1000}
    sizes="(max-width: 1024px) 100vw, 46vw"
    className="h-full w-full object-cover"
  />
</div>
```

Then the import of the SVGs can go, if you remove both:

```tsx
// remove
import { CardsIllustration, InsightIllustration } from "@/components/pages/MarketingVisuals";
```

`MarketingVisuals.tsx` itself is still used by no other page — leave the file in place
so nothing else breaks.

---

## 4. Optional — lending cards get a photo header

In the "Finance for what's next" grid, each tile is a `<Link>` with an icon. To give
each one an image, add this as the first child inside the `Link`:

```tsx
<Link href="/loans/mortgage" className="group overflow-hidden rounded-2xl border border-line bg-card transition hover:-translate-y-1 hover:shadow-card">
  <Image
    src="/images/mortgage-home.jpg"
    alt=""
    width={1200}
    height={900}
    sizes="(max-width: 640px) 100vw, 25vw"
    className="h-36 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
  />
  <span className="block p-5">
    {/* existing icon + h3 + p + "Explore" row */}
  </span>
</Link>
```

Then drop the `p-5` from the `<Link>` itself so the photo sits flush to the card edge.
Map to the four tiles: `mortgage-home`, `business-loan`, `car-loan`, `investments`.

---

## 5. Optional — marketing page heroes

`/loans/mortgage`, `/loans/business`, `/loans/car`, `/investment-centres`, `/community`,
`/careers` and `/about` all read as text-only pages today. A 1200×900 → 16:9 band at the top of
each fixes that with one pattern:

```tsx
<div className="relative h-56 w-full overflow-hidden sm:h-72">
  <Image
    src="/images/careers.jpg"
    alt="Two colleagues talking in a sunlit office corridor"
    fill
    sizes="100vw"
    className="object-cover object-center"
  />
  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,32,25,.15)_0%,rgba(16,32,25,.72)_100%)]" />
</div>
```

Page → file map:

| Page | File |
| --- | --- |
| `/loans/mortgage` | `mortgage-home.jpg` |
| `/loans/business` | `business-loan.jpg` |
| `/loans/car` | `car-loan.jpg` |
| `/investment-centres` | `investments.jpg` |
| `/community` | `community.jpg` |
| `/careers` | `careers.jpg` |
| `/about` | `hero-lifestyle.jpg` |

---

## 6. OG / Twitter card

Right now a shared link renders as a bare text card. **`src/app/layout.tsx`**:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://meridian-bank-v2.vercel.app"),
  title: "Meridian — Online banking",
  description:
    "Check balances, move money, and manage payees in one calm place.",
  icons: { /* unchanged */ },
  openGraph: {
    type: "website",
    siteName: "Meridian",
    title: "Meridian — A clearer way to bank",
    description: "See your accounts, move money and stay on top of everyday banking.",
    url: "/",
    images: [
      {
        url: "/images/og-meridian.jpg",
        width: 1200,
        height: 630,
        alt: "Meridian — a clearer way to bank",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian — A clearer way to bank",
    description: "See your accounts, move money and stay on top of everyday banking.",
    images: ["/images/og-meridian.jpg"],
  },
};
```

`metadataBase` matters: without it Next warns and emits relative OG URLs, which most
scrapers ignore. Point it at your real production domain.

Verify with `curl -s https://meridian-bank-v2.vercel.app | grep og:image` after deploy,
or drop the URL into a card validator once it's live.

---

## Alt-text rules used here

- **Hero:** `alt=""` + `aria-hidden` — decorative, headline carries the meaning.
- **Paired with a heading that already says it:** still describe the *content*, not the
  marketing claim. `"Tapping a Meridian debit card on a card reader at a café counter"`,
  not `"Secure payments"`.
- **Never** invent product specifics in alt text (no card numbers, no rates).
- If you make a photo load-bearing (e.g. a link's only label), it needs real alt text.

---

## One thing to decide before launch

These images are AI-generated, so there's no model release or licence issue — but they're
also not photographs of a real bank, real customers or a real branch. For a portfolio or
demo site that's fine. If Meridian ever becomes anything real, replace the two
people-focused photos (`community.jpg`, `careers.jpg`) with licensed photography of actual
staff, and drop `insight-overview.jpg` if the phone in frame could be misread as the
Meridian app — it currently shows a blank screen on purpose, which is the safe version.
