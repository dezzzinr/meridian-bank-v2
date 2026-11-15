import Image from "next/image";

/** Full-bleed photographic backdrop for a page hero. Renders behind the
 *  section's own content via negative z-index, so the markup of the hero
 *  itself doesn't need to change. Uses `isolate` + `-z-10` so the image sits
 *  above the section background but below the text. */
export function HeroPhoto({ src, position = "center" }: { src: string; position?: string }) {
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
        style={{ objectPosition: position }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,32,25,.94)_0%,rgba(16,32,25,.78)_55%,rgba(16,32,25,.95)_100%)]"
      />
    </>
  );
}

/** Contained photo panel with a fixed aspect ratio — used where a page passes
 *  an `illustration` slot and expects something that fills the box. */
export function PhotoPanel({
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 1024px) 100vw, 45vw",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
}) {
  return (
    <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}
