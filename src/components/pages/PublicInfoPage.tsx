import Link from "next/link";
import { PublicLayout } from "@/components/shell/PublicSite";
import { InsightIllustration } from "@/components/pages/MarketingVisuals";

export function PublicInfoPage({ eyebrow, title, intro, sections, action }: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { title: string; body: string }[];
  action?: { label: string; href: string };
}) {
  return <PublicLayout><main className="bg-[#f4f3ee]">
    <section className="bg-night px-5 py-16 text-white sm:px-8 sm:py-24"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#a7d4b5]">{eyebrow}</p><h1 className="mt-5 max-w-4xl font-display text-5xl font-medium leading-[1.04] tracking-[-.055em] sm:text-6xl">{title}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">{intro}</p>{action && <Link href={action.href} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#c8e4d1] px-5 py-3 text-sm font-bold text-[#163d30] hover:bg-white">{action.label}<span aria-hidden="true">↗</span></Link>}</div></section>
    <section className="px-5 py-12 sm:px-8 sm:py-16"><div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[.9fr_1.1fr]"><div className="overflow-hidden rounded-[24px] shadow-card"><InsightIllustration/></div><div className="grid gap-3 sm:grid-cols-2">{sections.map((section, i) => <article key={section.title} className="rounded-2xl border border-line bg-card p-5 sm:p-6"><span className="text-xs font-bold tracking-[.16em] text-brand">0{i+1}</span><h2 className="mt-3 font-display text-xl font-semibold tracking-[-.03em]">{section.title}</h2><p className="mt-2 text-sm leading-6 text-ink-soft">{section.body}</p></article>)}</div></div><div className="mx-auto mt-12 max-w-6xl rounded-2xl bg-brand px-6 py-7 text-white sm:flex sm:items-center sm:justify-between sm:px-8"><div><p className="font-display text-xl font-semibold">Ready when you are</p><p className="mt-1 text-sm text-white/65">Sign in to continue or create your Meridian account.</p></div><div className="mt-5 flex gap-3 sm:mt-0"><Link href="/login" className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Log in</Link><Link href="/register" className="rounded-lg bg-[#c8e4d1] px-4 py-2.5 text-sm font-bold text-[#163d30] hover:bg-white">Get started</Link></div></div></section>
  </main></PublicLayout>;
}
