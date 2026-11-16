"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { useCurrentUser } from "@/components/CurrencyContext";
import { categoryStyle, dayLabel, greeting } from "@/lib/format";
import { DashboardActions } from "@/components/pages/DashboardActions";
import { MobileBankingModals } from "@/components/banking/MobileBankingModals";
import { TypeBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconCheck,
  IconClock,
  IconEye,
  IconEyeOff,
  IconInfo,
  IconPlus,
  IconSpinner,
  IconSend,
  IconShield,
  IconSwap,
  IconTrendingUp,
  IconWallet,
  IconX,
} from "@/components/icons";
import type { AccountDTO, TransactionDTO } from "@/lib/queries";

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

interface Rates {
  base: string;
  rates: Record<string, number>;
}

/* ---- Spend Chart (8 weeks) ---- */
function SpendChart({ weeks }: { weeks: { label: string; cents: number }[] }) {
  const { money } = useCurrentUser();
  const max = Math.max(...weeks.map((w) => w.cents), 1);
  const total = weeks.reduce((s, w) => s + w.cents, 0);
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold text-ink">
          Weekly spending
        </h3>
        <p className="text-xs font-medium text-ink-faint">8 weeks</p>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
        {money(total)}
      </p>
      <div className="mt-4 flex h-36 items-end gap-1.5 sm:gap-2">
        {weeks.map((w, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${w.label} — ${money(w.cents)}`}>
            <div
              className={`w-full rounded-md transition hover:opacity-75 ${i === weeks.length - 1 ? "bg-brand" : "bg-brand/25"}`}
              style={{ height: `${Math.max(5, Math.round((w.cents / max) * 100))}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {weeks.map((w, i) => (
          <p key={i} className="flex-1 truncate text-center text-[10px] font-medium text-ink-faint">
            {i % 2 === 0 ? w.label : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ---- Monthly Income vs Expenses ---- */
function MonthlyChart({
  monthly,
}: {
  monthly: { label: string; income: number; spend: number }[];
}) {
  const { money } = useCurrentUser();
  const max = Math.max(...monthly.flatMap((m) => [m.income, m.spend]), 1);
  return (
    <div className="card p-5">
      <h3 className="font-display text-base font-semibold text-ink">
        Income vs expenses
      </h3>
      <p className="mt-1 text-xs text-ink-faint">Last 6 months</p>
      <div className="mt-4 flex h-40 items-end gap-3">
        {monthly.map((m, i) => (
          <div key={i} className="flex h-full flex-1 items-end justify-center gap-1">
            <div
              className="w-full rounded-t bg-good/70"
              style={{ height: `${Math.max(3, (m.income / max) * 100)}%` }}
              title={`${m.label} income: ${money(m.income)}`}
            />
            <div
              className="w-full rounded-t bg-rose/50"
              style={{ height: `${Math.max(3, (m.spend / max) * 100)}%` }}
              title={`${m.label} spend: ${money(m.spend)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {monthly.map((m, i) => (
          <p key={i} className="flex-1 text-center text-[10px] font-medium text-ink-faint">
            {m.label}
          </p>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          <span className="h-2 w-2 rounded-sm bg-good/70" /> Income
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          <span className="h-2 w-2 rounded-sm bg-rose/50" /> Expenses
        </span>
      </div>
    </div>
  );
}

/* ---- Spending by Category ---- */
function CategoryBreakdown({
  byCategory,
}: {
  byCategory: { category: string; cents: number }[];
}) {
  const { money } = useCurrentUser();
  const total = byCategory.reduce((s, c) => s + c.cents, 0);
  return (
    <div className="card p-5">
      <h3 className="font-display text-base font-semibold text-ink">
        Spending by category
      </h3>
      <p className="mt-1 text-xs text-ink-faint">This month</p>
      <div className="mt-4 space-y-2.5">
        {byCategory.map((c) => {
          const pct = total > 0 ? Math.round((c.cents / total) * 100) : 0;
          return (
            <div key={c.category}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-ink">{c.category}</span>
                <span className="font-display font-semibold text-ink">
                  {money(c.cents)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${categoryStyle(c.category).split(" ")[0]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {byCategory.length === 0 && (
          <p className="text-sm text-ink-faint">No spending data yet.</p>
        )}
      </div>
    </div>
  );
}

/* ---- Exchange Rates ---- */
function ExchangeRates({ rates }: { rates: Rates | null }) {
  if (!rates) return null;
  const display = ["EUR", "GBP", "NGN", "KES", "INR", "CAD"].filter(
    (c) => c !== rates.base,
  );
  return (
    <div className="card p-5">
      <h3 className="font-display text-base font-semibold text-ink">
        Exchange rates
      </h3>
      <p className="mt-1 text-xs text-ink-faint">
        Base: {rates.base} · indicative rates
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {display.map((code) => (
          <div
            key={code}
            className="flex items-center justify-between rounded-lg bg-paper px-3 py-2"
          >
            <span className="text-[13px] font-medium text-ink">{code}</span>
            <span className="font-display text-sm font-semibold text-ink">
              {rates.rates[code]?.toFixed(2) ?? "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">
        Indicative mid-market rates for display purposes.
      </p>
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
  const router = useRouter();
  const [navigationPending, startNavigation] = useTransition();
  const [pendingAction, setPendingAction] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [rates, setRates] = useState<Rates | null>(null);
  const [notifications, setNotifications] = useState<
    { id: number; type: string; title: string; body: string; createdAt: string }[]
  >([]);
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
    apiFetch("/api/exchange-rates", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setRates)
      .catch(() => {});
    apiFetch("/api/notifications?limit=3", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotifications((d?.notifications ?? []).slice(0, 3)))
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
          <DashboardActions accounts={data.accounts} onboarding={onboarding} />
        </div>}
      </div>

      <div className="hidden sm:block">
      {data?.hasForeignCurrency && <p className="mb-4 rounded-xl bg-brand-soft/40 p-3 text-xs text-brand-deep">Overview in {data.baseCurrency} · Foreign-currency totals use live indicative exchange-rate estimates. Account balances and individual transactions remain in their original currency.</p>}
      {loadErr ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-semibold text-rose">Couldn't load your dashboard.</p>
          <button className="btn-outline mt-4" onClick={load}>Try again</button>
        </div>
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-7 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : onboarding ? (
        /* ---- Onboarding empty state ---- */
        <div className="card animate-rise p-8 sm:p-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
            <IconWallet size={22} />
          </span>
          <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">
            Let's set up your first account
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
            Open a checking account for everyday spending or a savings account
            that earns keeps your goals separate from everyday spending.
          </p>
        </div>
      ) : (
        <>
          {/* ---- Balance Cards ---- */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <div className="col-span-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e6849] via-[#168355] to-[#35b96e] p-5 text-white shadow-card sm:p-6 xl:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/50">
                  Total balance
                </p>
                <button
                  onClick={() => setHidden(!hidden)}
                  className="rounded-md p-1 text-emerald-100/50 transition hover:text-white"
                  aria-label={hidden ? "Show balance" : "Hide balance"}
                >
                  {hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </button>
              </div>
              <p className="mt-3 font-display text-[30px] font-semibold tracking-tight sm:text-3xl">
                {hidden ? "••••••" : money(data.totalCents)}
              </p>
              <p className="mt-1.5 text-xs text-emerald-100/45">
                {data.accounts.length} account{data.accounts.length === 1 ? "" : "s"}
              </p>
              {data.accounts[0] && <div className="mt-4 min-w-0 border-t border-white/10 pt-3">
                <p className="truncate text-[10px] font-medium text-emerald-100/55">Default account · {data.accounts[0].name}</p>
                <p className="break-all font-mono text-[11px] tracking-wide text-white/90">
                  {hidden ? `•••• ${data.accounts[0].last4}` : data.accounts[0].accountNumber}
                </p>
              </div>}
            </div>
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Available balance
              </p>
              <p className="mt-3 font-display text-[22px] font-semibold tracking-tight text-ink sm:text-2xl">
                {hidden ? "•••••" : money(data.availableCents)}
              </p>
              <p className="mt-1 text-xs text-ink-faint">Excludes locked fixed deposits</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
                  <IconTrendingUp size={14} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Savings
                </p>
              </div>
              <p className="mt-3 font-display text-[22px] font-semibold tracking-tight text-brand-deep sm:text-2xl">
                {hidden ? "•••••" : money(data.savingsCents)}
              </p>
            </div>
            <div className={`card p-5 ${data.pendingCount > 0 ? "border-amber/30 bg-amber-soft/50" : ""}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${data.pendingCount > 0 ? "bg-amber-soft text-amber" : "bg-good-soft text-good"}`}>
                  {data.pendingCount > 0 ? <IconClock size={14} /> : <IconCheck size={14} />}
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Pending</p>
              </div>
              {data.pendingCount > 0 ? (
                <>
                  <p className="mt-3 font-display text-[22px] font-semibold tracking-tight text-amber sm:text-2xl">
                    {money(data.pendingCents)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber/80">
                    {data.pendingCount} payment{data.pendingCount === 1 ? "" : "s"} settling
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 font-display text-[22px] font-semibold tracking-tight text-ink sm:text-2xl">{money(0)}</p>
                  <p className="mt-1 text-xs text-ink-faint">All settled</p>
                </>
              )}
            </div>
          </div>

          {/* ---- Income vs Expenses + Spending ---- */}
          <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2">
            <div className="card order-2 p-5 lg:order-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                This month
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-good-soft text-good">
                    <IconArrowDownLeft size={15} />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-ink-faint">Income</p>
                    <p className="font-display text-lg font-semibold tracking-tight text-good">
                      {money(data.income30)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-line-soft text-ink-soft">
                    <IconArrowUpRight size={15} />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-ink-faint">Expenses</p>
                    <p className="font-display text-lg font-semibold tracking-tight text-ink">
                      {money(data.spend30)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Quick actions */}
            <div className="card order-1 p-4 sm:p-5 lg:order-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Quick actions</p>
              <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2.5">
                {[
                  { label: "Transfer", hint: "Between accounts", href: "/app/payments", Icon: IconSwap },
                  { label: "Accounts", hint: "Manage your accounts", href: "/app/accounts", Icon: IconPlus },
                  { label: "Pay a bill", hint: "Manage payments", href: "/app/payments", Icon: IconSend },
                  { label: "Activity", hint: "Review spending", href: "/app/activity", Icon: IconArrowUpRight },
                ].map(({ label, hint, href, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={navigationPending}
                    onClick={() => {
                      setPendingAction(label);
                      startNavigation(() => router.push(href));
                    }}
                    className="group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-paper px-1.5 py-2 text-center transition hover:border-brand/50 hover:bg-brand-soft/30 active:scale-[.98] disabled:opacity-65 sm:flex-row sm:gap-2.5 sm:p-3 sm:text-left"
                    aria-busy={navigationPending && pendingAction === label}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand sm:rounded-lg sm:bg-white sm:shadow-sm">
                      {navigationPending && pendingAction === label ? <IconSpinner size={16} /> : <Icon size={16} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-bold text-ink sm:text-xs">{label}</span>
                      <span className="mt-0.5 hidden truncate text-[10px] text-ink-faint sm:block">{navigationPending && pendingAction === label ? "Opening…" : hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---- Account numbers ---- */}
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Your accounts</h2>
              <Link href="/app/accounts" className="text-[13px] font-semibold text-brand transition hover:text-brand-deep">Manage</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {data.accounts.map((a) => (
                <Link key={a.id} href="/app/accounts" className="card group p-5 transition hover:border-brand/40">
                  <div className="flex items-center justify-between">
                    <TypeBadge type={a.type} />
                    <span className="text-xs font-medium text-ink-faint">{a.currency} · •••• {a.last4}</span>
                  </div>
                  <p className="mt-2 truncate font-display text-base font-semibold text-ink group-hover:text-brand-deep">
                    {a.name}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-ink-faint">
                    {a.accountNumber}
                  </p>
                  <p className="mt-2 font-display text-xl font-semibold tracking-tight text-ink">
                    {money(a.balanceCents, a.currency)}
                  </p>
                </Link>
              ))}
              <Link href="/app/accounts" className="flex min-h-[130px] items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-card/50 text-sm font-semibold text-ink-soft transition hover:border-brand/50 hover:bg-brand-soft/40 hover:text-brand-deep">
                <IconPlus size={16} /> New account
              </Link>
            </div>
          </div>

          {/* ---- Charts + Activity ---- */}
          <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-2">
              <SpendChart weeks={data.weeks} />
              <CategoryBreakdown byCategory={data.byCategory} />
            </div>
            <div className="lg:col-span-3 space-y-3">
              <MonthlyChart monthly={data.monthly} />
              {/* Recent activity */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
                  <h3 className="font-display text-base font-semibold text-ink">Recent activity</h3>
                  <Link href="/app/activity" className="text-[13px] font-semibold text-brand transition hover:text-brand-deep">View all</Link>
                </div>
                {data.recent.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                    <IconTrendingUp size={20} className="text-ink-faint" />
                    <p className="text-sm text-ink-soft">Transactions will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-line-soft">
                    {data.recent.map((t) => {
                      const dir = t.kind === "credit" || t.kind === "transfer_in" ? "in" : "out";
                      const voided = t.status === "voided";
                      return (
                        <Link key={t.id} href="/app/activity" className="flex items-center gap-3 px-5 py-3 transition hover:bg-paper/70">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${voided ? "bg-line-soft text-ink-faint" : dir === "in" ? "bg-good-soft text-good" : "bg-line-soft text-ink-soft"}`}>
                            {voided ? <IconX size={15} /> : dir === "in" ? <IconArrowDownLeft size={15} /> : <IconArrowUpRight size={15} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-semibold ${voided ? "text-ink-faint line-through" : "text-ink"}`}>
                              {t.description}
                            </span>
                            <span className="block truncate text-xs text-ink-faint">
                              {dayLabel(t.occurredAt)} · {t.accountName}
                            </span>
                          </span>
                          <span className={`font-display text-sm font-semibold tracking-tight ${voided ? "text-ink-faint line-through" : dir === "in" ? "text-good" : "text-ink"}`}>
                            {moneySigned(t.amountCents, dir, t.currency)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---- Exchange Rates + Notifications ---- */}
          <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2">
            <ExchangeRates rates={rates} />
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
                <h3 className="font-display text-base font-semibold text-ink">Notifications</h3>
                <Link href="/app/notifications" className="text-[13px] font-semibold text-brand transition hover:text-brand-deep">View all</Link>
              </div>
              {notifications.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-ink-soft">You're all caught up.</p>
                </div>
              ) : (
                <div className="divide-y divide-line-soft">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-5 py-3">
                      <p className="text-[13px] font-semibold text-ink">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-ink-soft">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ---- QR and mobile money tools ---- */}
          <div className="mt-4">
            <MobileBankingModals accounts={data.accounts} />
          </div>
        </>
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
