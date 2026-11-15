import Link from "next/link";
import type { ComponentType } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-3"><span className="hidden md:inline-flex"><LanguageSwitcher/></span><div className="hidden items-center gap-1 sm:flex"><Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white">Log in</Link><Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-[#c8e4d1] px-4 py-2.5 text-sm font-bold text-[#163d30] transition hover:bg-white">Get started<ArrowIcon className="h-4 w-4"/></Link></div><details className="group relative lg:hidden">
          <summary aria-label="Open navigation menu" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
            <svg className="group-open:hidden" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <svg className="hidden group-open:block" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </summary>
          <nav aria-label="Mobile navigation" className="absolute right-0 top-full z-50 mt-3 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-card p-3 text-ink shadow-2xl">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-ink-faint">Banking</p>
            {productLinks.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-paper"><Icon size={17}/>{label}</Link>)}
            <p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[.16em] text-ink-faint">Discover</p>
            {discoverLinks.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-paper"><Icon size={17}/>{label}</Link>)}
            <div className="mt-2 flex items-center justify-between border-t border-line-soft px-3 pt-3"><Link href="/about" className="py-2 text-sm font-semibold">About</Link><Link href="/help" className="py-2 text-sm font-semibold">Help</Link><LanguageSwitcher variant="light"/></div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line-soft pt-3"><Link href="/login" className="rounded-lg border border-line px-3 py-2.5 text-center text-sm font-semibold">Log in</Link><Link href="/register" className="rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-bold text-white">Get started</Link></div>
          </nav>
        </details></div>
      </div>
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
