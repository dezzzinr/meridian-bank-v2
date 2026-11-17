"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { useCurrentUser } from "@/components/CurrencyContext";
import { dayLabel, greeting } from "@/lib/format";
import { DashboardActions } from "@/components/pages/DashboardActions";
import { MobileBankingModals } from "@/components/banking/MobileBankingModals";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconCircleHelp,
  IconEye,
  IconEyeOff,
  IconPlus,
  IconSend,
  IconSwap,
  IconTrendingUp,
  IconWallet,
} from "@/components/icons";
import type { AccountDTO, PayeeDTO, TransactionDTO } from "@/lib/queries";

interface DashboardData {
  accounts: AccountDTO[];
  totalCents: number;
  savingsCents: number;
  availableCents: number;
  income30: number;
  spend30: number;
  transactions30: number;
  pendingCount: number;
  pendingCents: number;
  weeks: { label: string; cents: number }[];
  monthly: { label: string; income: number; spend: number }[];
  byCategory: { category: string; cents: number }[];
  recent: TransactionDTO[];
  baseCurrency: string;
  hasForeignCurrency: boolean;
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", GBP: "🇬🇧", EUR: "🇪🇺", NGN: "🇳🇬", KES: "🇰🇪", INR: "🇮🇳",
  CAD: "🇨🇦", AUD: "🇦🇺", JPY: "🇯🇵", CHF: "🇨🇭", ZAR: "🇿🇦", GHS: "🇬🇭",
};

/* ---- Accounts panel ---- */
function AccountSummary({ accounts }: { accounts: AccountDTO[] }) {
  const { money } = useCurrentUser();
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
        <div><h3 className="font-display text-base font-semibold text-ink">Your accounts</h3><p className="mt-0.5 text-[11px] text-ink-faint">Balances by account</p></div>
        <Link href="/app/accounts" className="text-[13px] font-semibold text-brand transition hover:text-brand-deep">View all</Link>
      </div>
      <div className="divide-y divide-line-soft">
        {accounts.slice(0, 4).map((account) => (
          <Link key={account.id} href="/app/accounts" className="flex items-center gap-3 px-5 py-3 transition hover:bg-paper/70">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand-deep">{account.currency.slice(0, 3)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-ink">{account.name}</span><span className="block truncate text-[11px] text-ink-faint">{account.type.replaceAll("_", " ")} · •••• {account.last4}</span></span>
            <span className="font-display text-sm font-semibold text-ink">{money(account.balanceCents, account.currency)}</span>
          </Link>
        ))}
        {accounts.length === 0 && <p className="px-5 py-8 text-center text-sm text-ink-soft">No accounts yet.</p>}
      </div>
    </div>
  );
}

function MobileDashboard({ data, hidden, onToggleBalance }: { data: DashboardData; hidden: boolean; onToggleBalance: () => void }) {
  const { money, moneySigned } = useCurrentUser();
  const maxWeek = Math.max(...data.weeks.map((week) => week.cents), 1);
  return <div className="space-y-5 sm:hidden">
    <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-[#078447] via-[#12a755] to-[#34c96b] p-5 text-white shadow-[0_16px_35px_-20px_rgba(5,111,62,.7)]">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 -z-10 h-44 w-44 rounded-full border-[28px] border-white/[.07]" />
      <div aria-hidden className="pointer-events-none absolute right-[-22px] bottom-[-72px] -z-10 h-44 w-44 rounded-full bg-[#a5f5b7]/15 blur-2xl" />
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] font-semibold tracking-wide text-white/70">Total balance</p><p className="mt-1 text-[10px] text-white/60">Across {data.accounts.length} account{data.accounts.length === 1 ? "" : "s"}</p></div>
        <button type="button" onClick={onToggleBalance} aria-label={hidden ? "Show balance" : "Hide balance"} className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25">{hidden ? <IconEyeOff size={16}/> : <IconEye size={16}/>}</button>
      </div>
      <div className="relative z-10 mt-2 max-w-[72%]">
        <p className="font-display text-[32px] font-semibold leading-tight tracking-[-.04em]">{hidden ? "••••••••" : money(data.totalCents)}</p>
        <p className="mt-1 text-[10px] font-medium text-white/65">{data.baseCurrency} · available balance {hidden ? "••••" : money(data.availableCents)}</p>
      </div>
      <div aria-hidden className="absolute bottom-5 right-4 h-[78px] w-[118px] rotate-[-9deg] rounded-xl border border-white/25 bg-gradient-to-br from-white/30 to-[#064b38]/30 p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between"><span className="h-4 w-5 rounded-[4px] border border-white/50 bg-[#f5df8d]/80"/><span className="text-[7px] font-bold tracking-[.12em] text-white/75">MERIDIAN</span></div>
        <div className="mt-4 flex items-end justify-between"><span className="font-mono text-[8px] tracking-[.15em] text-white/80">•••• {data.accounts[0]?.last4 ?? "••••"}</span><span className="text-[8px] font-black italic text-white/85">CARD</span></div>
      </div>
      <div className="relative z-10 mt-5 flex items-center gap-2 border-t border-white/20 pt-3">
        <span className="h-1.5 w-1.5 rounded-full bg-[#c7ffd4]"/><p className="truncate text-[10px] font-medium text-white/75">{data.accounts[0]?.name ?? "Your accounts"}</p><span className="ml-auto text-[10px] font-semibold text-white/70">•••• {data.accounts[0]?.last4 ?? "—"}</span>
      </div>
    </section>

    <MobileBankingModals accounts={data.accounts} compact />

    <section aria-labelledby="mobile-overview-title">
      <div className="mb-3 flex items-end justify-between"><div><h2 id="mobile-overview-title" className="font-display text-[17px] font-semibold tracking-tight text-ink">Quick overview</h2><p className="mt-0.5 text-[10px] text-ink-faint">This month</p></div><Link href="/app/activity" className="text-[10px] font-bold text-brand">Details</Link></div>
      <div className="grid grid-cols-2 gap-3">
        <article className="rounded-2xl border border-line-soft bg-white p-4 shadow-[0_4px_18px_-12px_rgba(18,56,38,.16)]"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#e4f6eb] text-[#159354]"><IconArrowDownLeft size={15}/></span><h3 className="text-[11px] font-medium text-ink-soft">Income</h3></div><p className="mt-3 truncate font-display text-[19px] font-semibold tracking-tight text-ink">{hidden ? "••••••" : money(data.income30)}</p><p className="mt-1 text-[9px] text-ink-faint">Last 30 days</p></article>
        <article className="rounded-2xl border border-line-soft bg-white p-4 shadow-[0_4px_18px_-12px_rgba(18,56,38,.16)]"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#fff0e8] text-[#db7942]"><IconArrowUpRight size={15}/></span><h3 className="text-[11px] font-medium text-ink-soft">Expenses</h3></div><p className="mt-3 truncate font-display text-[19px] font-semibold tracking-tight text-ink">{hidden ? "••••••" : money(data.spend30)}</p><p className="mt-1 text-[9px] text-ink-faint">Last 30 days</p></article>
        <article className="rounded-2xl border border-line-soft bg-white p-4 shadow-[0_4px_18px_-12px_rgba(18,56,38,.16)]"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#edf3ff] text-[#527bd2]"><IconSwap size={15}/></span><h3 className="text-[11px] font-medium text-ink-soft">Transactions</h3></div><p className="mt-3 font-display text-[19px] font-semibold tracking-tight text-ink">{data.transactions30}</p><p className="mt-1 text-[9px] text-ink-faint">Last 30 days</p></article>
        <article className="rounded-2xl border border-line-soft bg-white p-4 shadow-[0_4px_18px_-12px_rgba(18,56,38,.16)]"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0eafa] text-[#9065bd]"><IconTrendingUp size={15}/></span><h3 className="text-[11px] font-medium text-ink-soft">Savings</h3></div><p className="mt-3 truncate font-display text-[19px] font-semibold tracking-tight text-ink">{hidden ? "••••••" : money(data.savingsCents)}</p><p className="mt-1 text-[9px] text-ink-faint">Across savings accounts</p></article>
      </div>
    </section>

    <section className="overflow-hidden rounded-[22px] bg-[#103f30] p-5 text-white shadow-card">
      <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#a8e3be]">Spending analysis</p><p className="mt-1 text-[10px] text-white/55">This month</p></div><Link href="/app/activity" aria-label="View spending activity" className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white/80"><IconArrowUpRight size={14}/></Link></div>
      <p className="mt-2 font-display text-[22px] font-semibold tracking-tight">{hidden ? "••••••" : money(data.spend30)}</p>
      <div className="mt-4 flex h-[94px] items-end gap-2 border-b border-white/10 px-1">{data.weeks.map((week, index) => <div key={`${week.label}-${index}`} title={`${week.label}: ${money(week.cents)}`} className="flex h-full flex-1 items-end"><div className={`w-full rounded-t-md ${index === data.weeks.length - 1 ? "bg-[#b6f1b9]" : "bg-[#4fcb82]/45"}`} style={{ height: `${Math.max(9, Math.round(week.cents / maxWeek * 100))}%` }}/></div>)}</div>
      <div className="mt-2 flex justify-between text-[9px] text-white/40"><span>{data.weeks[0]?.label}</span><span>{data.weeks[data.weeks.length - 1]?.label}</span></div>
    </section>

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">Recent activity</h2><Link href="/app/activity" className="text-[10px] font-bold text-brand">See all</Link></div>
      <div className="overflow-hidden rounded-2xl border border-line-soft bg-white shadow-[0_4px_18px_-12px_rgba(18,56,38,.16)]">{data.recent.slice(0, 4).map((transaction) => { const inbound = transaction.kind === "credit" || transaction.kind === "transfer_in"; return <Link key={transaction.id} href="/app/activity" className="flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-0"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${inbound ? "bg-[#e4f6eb] text-[#159354]" : "bg-[#f2f4f2] text-ink-soft"}`}>{inbound ? <IconArrowDownLeft size={16}/> : <IconArrowUpRight size={16}/>}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">{transaction.description}</span><span className="mt-0.5 block truncate text-[9px] text-ink-faint">{dayLabel(transaction.occurredAt)} · {transaction.accountName}</span></span><span className={`font-display text-xs font-semibold ${inbound ? "text-good" : "text-ink"}`}>{moneySigned(transaction.amountCents, inbound ? "in" : "out", transaction.currency)}</span></Link>; })}</div>
    </section>
    <Link href="/app/accounts" className="flex items-center justify-between rounded-xl border border-line-soft bg-white px-4 py-3 text-xs font-semibold text-ink"><span>View all {data.accounts.length} accounts</span><IconArrowUpRight size={15} className="text-brand"/></Link>
  </div>;
}

/* ---- Main Dashboard ---- */
export default function DashboardPage() {
  const { user, money, moneySigned } = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<
    { id: number; type: string; title: string; body: string; createdAt: string }[]
  >([]);
  const [payees, setPayees] = useState<PayeeDTO[]>([]);
  const [loadErr, setLoadErr] = useState(false);
  const [hidden, setHidden] = useState(false);

  const load = () => {
    setLoadErr(false);
    apiFetch("/api/dashboard", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setLoadErr(true));
    apiFetch("/api/notifications?limit=3", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotifications((d?.notifications ?? []).slice(0, 3)))
      .catch(() => {});
    apiFetch("/api/payees", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPayees(d?.payees ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("meridian:banking-updated", listener);
    return () => window.removeEventListener("meridian:banking-updated", listener);
  }, []);

  const onboarding = !!data && data.accounts.length === 0;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const firstName = user.name.split(" ")[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {greeting()}, {firstName}<span className="ml-1 sm:hidden">👋</span>
          </h1>
          <p className="mt-1 hidden text-sm text-ink-soft sm:block">{today}</p>
          <p className="mt-1 text-[11px] text-ink-soft sm:hidden">Here’s your account at a glance.</p>
        </div>
        {data && <div className={onboarding ? "" : "hidden sm:block"}>
          {onboarding ? <DashboardActions accounts={data.accounts} onboarding={onboarding} /> : <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-semibold ${user.status === "active" ? "bg-good-soft text-good" : "bg-amber-soft text-amber"}`}><span className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-good" : "bg-amber"}`}/>{user.status === "active" ? "Account active" : `Account ${user.status}`}</div>}
        </div>}
      </div>

      <div className="hidden sm:block">
        {loadErr ? (
          <div className="card p-10 text-center">
            <p className="text-sm font-semibold text-rose">Couldn’t load your dashboard.</p>
            <button className="btn-outline mt-4" onClick={load}>Try again</button>
          </div>
        ) : !data ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <Skeleton className="h-[225px] rounded-2xl lg:col-span-8" />
            <Skeleton className="h-[225px] rounded-2xl lg:col-span-4" />
            <Skeleton className="h-36 rounded-2xl lg:col-span-8" />
          </div>
        ) : onboarding ? (
          <div className="card animate-rise p-8 sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-deep"><IconWallet size={22} /></span>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">Let’s set up your first account</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">Open a current account for everyday spending or a savings account to keep your goals separate.</p>
            <div className="mt-5"><DashboardActions accounts={data.accounts} onboarding /></div>
          </div>
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-12">
            <div className="min-w-0 space-y-5 xl:col-span-8">
              {data.hasForeignCurrency && <p className="rounded-xl bg-brand-soft/40 p-3 text-xs text-brand-deep">Overview in {data.baseCurrency} · Foreign-currency totals use indicative exchange-rate estimates.</p>}

              <section className="relative isolate overflow-hidden rounded-[22px] bg-gradient-to-br from-[#073f35] via-[#075640] to-[#08794b] p-6 text-white shadow-[0_18px_42px_-24px_rgba(4,76,51,.72)]">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[36px] border-white/[.055]" />
                <div aria-hidden className="pointer-events-none absolute -bottom-28 right-24 -z-10 h-56 w-56 rounded-full bg-[#62d58b]/15 blur-3xl" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white/60">Total balance</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="font-display text-[38px] font-semibold leading-none tracking-[-.045em]">{hidden ? "••••••••" : money(data.totalCents)}</p>
                      <button type="button" onClick={() => setHidden((value) => !value)} className="rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white" aria-label={hidden ? "Show balance" : "Hide balance"}>{hidden ? <IconEyeOff size={16}/> : <IconEye size={16}/>}</button>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#a8e8bd]"><IconTrendingUp size={14}/> {data.accounts.length} active account{data.accounts.length === 1 ? "" : "s"}</p>
                  </div>
                  <div aria-hidden className="hidden h-[112px] w-[180px] rotate-[-7deg] rounded-2xl border border-white/20 bg-gradient-to-br from-[#47b778]/85 via-[#166b4e] to-[#073b33] p-4 shadow-xl md:block">
                    <div className="flex items-center justify-between"><span className="h-7 w-9 rounded-md border border-[#f3dc91]/70 bg-gradient-to-br from-[#f3dc91]/75 to-[#bfae70]/60"/><span className="text-[9px] font-bold tracking-[.18em] text-white/65">MERIDIAN</span></div>
                    <div className="mt-7 flex items-end justify-between"><span className="font-mono text-[10px] tracking-[.16em] text-white/75">•••• {data.accounts[0]?.last4 ?? "••••"}</span><span className="font-display text-[11px] font-black italic text-white/85">CARD</span></div>
                  </div>
                </div>
                <div className="relative z-10 mt-6 grid grid-cols-4 gap-2 border-t border-white/15 pt-4 sm:max-w-[440px]">
                  {[
                    { label: "Send", href: "/app/payments", Icon: IconSend },
                    { label: "Receive", href: "/app/accounts", Icon: IconArrowDownLeft },
                    { label: "Exchange", href: "/app/payments", Icon: IconSwap },
                    { label: "Top Up", href: "/app/payments", Icon: IconPlus },
                  ].map(({ label, href, Icon }) => <Link key={label} href={href} className="group flex flex-col items-center gap-1.5 rounded-xl py-1.5 text-white/85 transition hover:bg-white/10 hover:text-white"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition group-hover:bg-white/20"><Icon size={16}/></span><span className="text-[10px] font-semibold">{label}</span></Link>)}
                </div>
              </section>

              <section aria-label="Accounts by currency">
                <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-semibold text-ink">Accounts</h2><Link href="/app/accounts" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-deep">View all <IconArrowUpRight size={12}/></Link></div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {data.accounts.slice(0, 3).map((account) => <Link key={account.id} href="/app/accounts" className="rounded-2xl border border-[#edf0ed] bg-white p-4 shadow-[0_5px_18px_-14px_rgba(18,56,38,.22)] transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                    <div className="flex items-center gap-2"><span aria-label={`${account.currency} currency`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f4f6f4] text-[17px]">{CURRENCY_FLAGS[account.currency] ?? <IconWallet size={14} className="text-[#758179]"/>}</span><span className="truncate text-xs font-semibold text-ink">{account.currency}</span></div>
                    <p className="mt-3 truncate font-display text-[18px] font-semibold tracking-tight text-ink">{hidden ? "••••••" : money(account.balanceCents, account.currency)}</p>
                    <p className="mt-1 text-[10px] text-ink-faint">{account.currency} · •••• {account.last4}</p>
                  </Link>)}
                  <Link href="/app/accounts" className="flex min-h-[105px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce4de] bg-white/70 p-3 text-center transition hover:border-brand/40 hover:bg-brand-soft/30"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#edf0ed] text-[#77837b]"><IconPlus size={16}/></span><span className="mt-2 text-xs font-semibold text-ink">Add account</span><span className="mt-0.5 text-[9px] text-ink-faint">Multi-currency available</span></Link>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-semibold text-ink">Quick actions</h2></div>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    { label: "Send Money", hint: "To bank accounts or people", href: "/app/payments", Icon: IconSend, tone: "bg-[#e7f6ed]", iconTone: "bg-[#c9eed8] text-[#14844a]" },
                    { label: "Receive Money", hint: "View your accounts", href: "/app/accounts", Icon: IconArrowDownLeft, tone: "bg-[#e9f3fb]", iconTone: "bg-[#d2e9f8] text-[#347eb2]" },
                    { label: "Order Card", hint: "Virtual or physical card", href: "/app/cards", Icon: IconWallet, tone: "bg-[#f1ecfa]", iconTone: "bg-[#e3d8f5] text-[#7855b3]" },
                    { label: "Local Withdrawal", hint: "Card and ATM settings", href: "/app/cards", Icon: IconArrowUpRight, tone: "bg-[#fff4df]", iconTone: "bg-[#ffe8b9] text-[#bb8121]" },
                  ].map(({ label, hint, href, Icon, tone, iconTone }) => <Link key={label} href={href} className={`group flex min-h-[130px] flex-col justify-between rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconTone}`}><Icon size={18}/></span>
                    <span><span className="block text-[13px] font-bold text-ink">{label}</span><span className="mt-1 block text-[10px] leading-snug text-ink-soft">{hint}</span><span className="mt-2 block text-ink/45"><IconArrowUpRight size={12}/></span></span>
                  </Link>)}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-[#edf0ed] bg-white shadow-[0_5px_20px_-15px_rgba(18,56,38,.18)]">
                <div className="flex items-center justify-between border-b border-[#edf0ed] px-5 py-4"><div><h2 className="font-display text-base font-semibold text-ink">Recent transactions</h2><p className="mt-0.5 text-[10px] text-ink-faint">Your latest account activity</p></div><Link href="/app/activity" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-deep">View all <IconArrowUpRight size={12}/></Link></div>
                {data.recent.length === 0 ? <div className="px-5 py-10 text-center text-sm text-ink-soft">Transactions will appear here.</div> : <div>
                  <div className="hidden grid-cols-[1.3fr_1fr_.8fr_.8fr] gap-3 bg-[#fafbf9] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-ink-faint md:grid"><span>Type</span><span>Details</span><span>Amount</span><span>Status · Date</span></div>
                  {data.recent.slice(0, 6).map((transaction) => { const inbound = transaction.kind === "credit" || transaction.kind === "transfer_in"; const voided = transaction.status === "voided"; return <Link key={transaction.id} href="/app/activity" className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-t border-[#f0f2f0] px-4 py-3 transition hover:bg-[#fafbf9] md:grid-cols-[1.3fr_1fr_.8fr_.8fr] md:gap-3 md:px-5">
                    <span className="flex min-w-0 items-center gap-2.5"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${inbound ? "bg-[#e6f5eb] text-[#188750]" : "bg-[#f1f3f1] text-[#76827a]"}`}>{inbound ? <IconArrowDownLeft size={15}/> : <IconArrowUpRight size={15}/>}</span><span className="truncate text-xs font-semibold text-ink">{inbound ? "Received" : "Payment"}</span></span>
                    <span className="min-w-0"><span className="block truncate text-xs font-medium text-ink">{transaction.description}</span><span className="block truncate text-[9px] text-ink-faint">{transaction.accountName} · {dayLabel(transaction.occurredAt)}</span></span>
                    <span className={`text-right font-display text-xs font-semibold md:text-left ${inbound ? "text-good" : "text-ink"}`}>{moneySigned(transaction.amountCents, inbound ? "in" : "out", transaction.currency)}</span>
                    <span className="hidden items-center justify-between gap-2 md:flex"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${voided ? "bg-[#f1f2f1] text-ink-faint" : transaction.status === "completed" ? "bg-[#e5f6eb] text-[#188750]" : "bg-[#fff2dc] text-[#b68123]"}`}>{voided ? "Voided" : transaction.status === "completed" ? "Completed" : "Pending"}</span><span className="text-[9px] text-ink-faint">{dayLabel(transaction.occurredAt)}</span></span>
                  </Link>; })}
                </div>}
              </section>
            </div>

            <aside className="min-w-0 space-y-4 xl:col-span-4">
              <Link href="/app/cards" className="group relative block min-h-[170px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#061f1e] via-[#102b28] to-[#274139] p-5 text-white shadow-[0_14px_34px_-22px_rgba(8,38,31,.7)]">
                <span className="inline-flex rounded-full bg-[#32bc78] px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white">Meridian Cards</span>
                <div className="absolute -right-8 -top-8 h-36 w-36 rotate-[-14deg] rounded-2xl border border-white/15 bg-white/[.08] p-3 transition group-hover:rotate-[-9deg]"><span className="block h-5 w-7 rounded bg-[#e8d38d]/80"/><span className="mt-12 block font-mono text-[8px] tracking-widest text-white/65">•••• •••• •••• ••••</span></div>
                <h2 className="relative mt-4 max-w-[60%] font-display text-lg font-semibold leading-tight">Your Meridian card<br/>for everyday spending</h2><span className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold">Manage cards <IconArrowUpRight size={12}/></span>
              </Link>

              <AccountSummary accounts={data.accounts} />

              <section className="overflow-hidden rounded-2xl border border-[#edf0ed] bg-white shadow-[0_5px_20px_-15px_rgba(18,56,38,.18)]">
                <div className="flex items-center justify-between border-b border-[#edf0ed] px-4 py-3.5"><h2 className="font-display text-sm font-semibold text-ink">Your recipients</h2><Link href="/app/payees" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand">View all <IconArrowUpRight size={11}/></Link></div>
                {payees.length ? payees.slice(0, 3).map((payee) => <Link key={payee.id} href="/app/payees" className="flex items-center gap-2.5 border-b border-[#f0f2f0] px-4 py-3 last:border-0 hover:bg-[#fafbf9]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef1ef] text-[10px] font-bold text-[#748078]">{payee.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-ink">{payee.name}</span><span className="block truncate text-[9px] text-ink-faint">{payee.methodDetail}</span></span><span className="rounded-full bg-[#f3f1e8] px-2 py-1 text-[8px] font-medium capitalize text-[#8a805f]">{payee.methodType}</span></Link>) : <p className="px-4 py-6 text-center text-xs text-ink-soft">Saved recipients will appear here.</p>}
              </section>

              <section className="rounded-2xl border border-[#edf0ed] bg-white p-4 shadow-[0_5px_20px_-15px_rgba(18,56,38,.18)]"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef3f0] text-[#76827a]"><IconCircleHelp size={18}/></span><div><h2 className="text-xs font-bold text-ink">Need help?</h2><p className="mt-1 text-[10px] leading-relaxed text-ink-soft">Our support team can help with account questions.</p><Link href="/contact" className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#073f35] px-3 py-1.5 text-[9px] font-semibold text-white">Contact support <IconArrowUpRight size={11}/></Link></div></div></section>

              <section className="overflow-hidden rounded-2xl border border-[#edf0ed] bg-white"><div className="flex items-center justify-between border-b border-[#edf0ed] px-4 py-3"><h2 className="text-xs font-bold text-ink">Notifications</h2><Link href="/app/notifications" className="text-[10px] font-semibold text-brand">View all</Link></div>{notifications.slice(0, 2).map((notification) => <div key={notification.id} className="border-b border-[#f0f2f0] px-4 py-2.5 last:border-0"><p className="truncate text-[10px] font-semibold text-ink">{notification.title}</p><p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-ink-soft">{notification.body}</p></div>)}{!notifications.length && <p className="px-4 py-4 text-[10px] text-ink-soft">You’re all caught up.</p>}</section>
            </aside>
          </div>
        )}
      </div>
      <div className="sm:hidden">
        {loadErr ? <div className="card p-8 text-center"><p className="text-sm font-semibold text-rose">Couldn’t load your dashboard.</p><button className="btn-outline mt-4" onClick={load}>Try again</button></div>
          : !data ? <div className="space-y-4"><Skeleton className="h-48 rounded-2xl"/><div className="grid grid-cols-5 gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div><Skeleton className="h-40 rounded-2xl"/></div>
          : onboarding ? <div className="rounded-2xl border border-line bg-white p-6"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-deep"><IconWallet size={21}/></span><h2 className="mt-4 font-display text-xl font-semibold text-ink">Let’s set up your first account</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">Open a current account for everyday spending or a savings account to keep your goals separate.</p></div>
          : <MobileDashboard data={data} hidden={hidden} onToggleBalance={() => setHidden((value) => !value)} />}
      </div>
    </div>
  );
}
