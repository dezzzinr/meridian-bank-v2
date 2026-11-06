import Link from "next/link";
import type { ComponentType } from "react";
import { LogoMark, IconChevronDown, IconBriefcase, IconBuilding, IconCar, IconChart, IconCircleHelp, IconFileText, IconShield, IconSmartphone, IconUsers, IconWallet } from "@/components/icons";

const productLinks = [
  { label: "Personal banking", href: "/#everyday", icon: IconWallet, detail: "Accounts and payments for life" },
  { label: "Business loans", href: "/loans/business", icon: IconBriefcase, detail: "Financing options for your business" },
  { label: "Car finance", href: "/loans/car", icon: IconCar, detail: "Explore car loans" },
  { label: "Investments", href: "/investment-centres", icon: IconChart, detail: "Guidance and investment centres" },
];
const discoverLinks = [
  { label: "Community", href: "/community", icon: IconUsers },
  { label: "Frequently asked questions", href: "/faq", icon: IconCircleHelp },
  { label: "Mobile app", href: "/mobile-app", icon: IconSmartphone },
  { label: "Careers", href: "/careers", icon: IconBriefcase },
  { label: "Find an investment centre", href: "/investment-centres", icon: IconBuilding },
];

function NavGroup({ label, items }: { label: string; items: { label: string; href: string; icon: ComponentType<{ size?: number }>; detail?: string }[] }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white/75 outline-none transition hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#c8e4d1] [&::-webkit-details-marker]:hidden">
        {label}<IconChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-2xl border border-line bg-card p-2 text-ink shadow-2xl">
        {items.map(({ label: itemLabel, href, icon: Icon, detail }) => <Link key={itemLabel} href={href} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-paper"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={18}/></span><span><span className="block text-sm font-bold">{itemLabel}</span>{detail && <span className="mt-0.5 block text-xs text-ink-faint">{detail}</span>}</span></Link>)}
      </div>
    </details>
  );
}

export function PublicHeader() {
  return (
    <header className="relative z-20 border-b border-white/10 bg-night text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Meridian home"><LogoMark size={32}/><span className="font-display text-xl font-semibold tracking-tight">Meridian</span></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation"><NavGroup label="Banking" items={productLinks}/><NavGroup label="Discover" items={discoverLinks}/><Link href="/about" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/75 hover:text-white">About</Link><Link href="/help" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/75 hover:text-white">Help</Link></nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3"><Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white">Log in</Link><Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-[#c8e4d1] px-4 py-2.5 text-sm font-bold text-[#163d30] transition hover:bg-white">Get started<ArrowIcon className="h-4 w-4"/></Link></div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 lg:hidden sm:px-8" aria-label="Explore Meridian">{[...productLinks, ...discoverLinks].map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/75"><Icon size={14}/>{label}</Link>)}</nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-night text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr]">
          <div><Link href="/" className="flex items-center gap-2.5"><LogoMark size={30}/><span className="font-display text-lg font-semibold">Meridian</span></Link><p className="mt-4 max-w-xs text-sm leading-6 text-white/55">A clearer view of your money, and a more connected way to bank.</p><Link href="/mobile-app" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/5"><IconSmartphone size={15}/>Mobile app coming soon</Link></div>
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/35">Banking</p><div className="mt-4 space-y-3">{productLinks.map(({ label, href }) => <Link key={label} className="block text-sm text-white/65 hover:text-white" href={href}>{label}</Link>)}</div></div>
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/35">Discover</p><div className="mt-4 space-y-3">{discoverLinks.map(({ label, href }) => <Link key={label} className="block text-sm text-white/65 hover:text-white" href={href}>{label}</Link>)}<Link className="block text-sm text-white/65 hover:text-white" href="/about">About Meridian</Link></div></div>
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/35">Help &amp; information</p><div className="mt-4 space-y-3"><Link className="block text-sm text-white/65 hover:text-white" href="/help">Help centre</Link><Link className="block text-sm text-white/65 hover:text-white" href="/contact">Contact</Link><Link className="block text-sm text-white/65 hover:text-white" href="/security">Security</Link><Link className="block text-sm text-white/65 hover:text-white" href="/legal">Legal information</Link><Link className="block text-sm text-white/65 hover:text-white" href="/privacy">Privacy policy</Link></div></div>
        </div>
        <div className="flex flex-col gap-3 pt-6 text-xs leading-5 text-white/40 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Meridian. Banking, with a clearer view.</p><p>Products, eligibility and availability may vary by account and region.</p></div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) { return <><PublicHeader/>{children}<PublicFooter/></>; }

export function ArrowIcon({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
