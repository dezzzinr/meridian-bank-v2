"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/client";
import { money, fmtDate } from "@/lib/format";
import { CARD_STATUS_LABELS, type CardDTO, type CardActivityDTO } from "@/lib/banking";
import type { AccountDTO } from "@/lib/queries";
import { useCurrentUser } from "../CurrencyContext";
import { useToast } from "../ui/Toast";
import { EmptyState } from "../ui/EmptyState";
import { BankIcon } from "../banking/BankIcon";
import { CardFace } from "../banking/CardFace";
import { CardDialogs, type CardDialogMode } from "../banking/CardDialogs";
import { IconCheck, IconEye, IconEyeOff, IconPlus, IconShield, IconSpinner, IconX } from "../icons";

function Switch({ checked, disabled, onClick, label }: { checked: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onClick} className={`flex h-[23px] w-[41px] shrink-0 items-center rounded-full p-[3px] transition-colors disabled:opacity-45 ${checked ? "bg-brand" : "bg-[#d9ddd7]"}`}><span className={`h-[17px] w-[17px] rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0"}`} /></button>;
}
export function CardsClient() {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [cards, setCards] = useState<CardDTO[] | null>(null);
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [error, setError] = useState("");
  const [accountError, setAccountError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState<CardDialogMode>(null);
  const [walletProvider, setWalletProvider] = useState<"apple" | "google">("apple");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [history, setHistory] = useState<CardActivityDTO[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);
  const [more, setMore] = useState(false);
  const canEdit = user.status === "active";
  const load = useCallback(async (preferred?: number) => {
    try {
      const result = await apiJson<{ cards: CardDTO[] }>("/api/cards");
      setCards(result.cards); setError("");
      setSelectedId((prev) => preferred ?? (result.cards.some((c) => c.id === prev) ? prev : result.cards.find((c) => c.status === "active")?.id ?? result.cards[0]?.id ?? null));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load cards."); }
    try { const result = await apiJson<{ accounts: AccountDTO[] }>("/api/accounts"); setAccounts(result.accounts); setAccountError(""); }
    catch (e) { setAccountError(e instanceof Error ? e.message : "Couldn't load linked accounts."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const selected = cards?.find((c) => c.id === selectedId) ?? null;
  useEffect(() => {
    setRevealed(null); setMore(false); setHistory(null); setHistoryError("");
    if (!selectedId) return;
    const controller = new AbortController();
    apiJson<{ activity: CardActivityDTO[] }>(`/api/cards/${selectedId}/activity`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setHistory(result.activity); })
      .catch((e) => { if (!controller.signal.aborted) setHistoryError(e instanceof Error ? e.message : "Couldn't load card history."); });
    return () => controller.abort();
  }, [selectedId, refresh]);
  useEffect(() => {
    if (!revealed) return;
    const hide = () => setRevealed(null);
    const timer = window.setTimeout(hide, 30000);
    window.addEventListener("blur", hide); document.addEventListener("visibilitychange", hide);
    return () => { window.clearTimeout(timer); window.removeEventListener("blur", hide); document.removeEventListener("visibilitychange", hide); };
  }, [revealed]);
  const shownCards = (cards ?? []).filter((c) => filter === "all" || c.kind === filter);
  const activeCount = cards?.filter((c) => c.status === "active").length ?? 0;
  const shownHistory = useMemo(() => (history ?? []).filter((item) => historyFilter === "all" || item.status === historyFilter), [history, historyFilter]);
  const update = async (patch: Partial<CardDTO>) => {
    if (!selected || busy) return;
    const previous = selected; setBusy(true);
    setCards((list) => list?.map((c) => c.id === previous.id ? { ...c, ...patch } : c) ?? null);
    if (patch.status) setRevealed(null);
    try { await apiJson(`/api/cards/${previous.id}`, { method: "PATCH", body: JSON.stringify(patch) }); toast("success", patch.status === "frozen" ? "Card frozen. New payments are blocked." : patch.status === "active" ? "Your card is active again." : "Card control updated."); }
    catch (e) { setCards((list) => list?.map((c) => c.id === previous.id ? previous : c) ?? null); toast("error", e instanceof Error ? e.message : "Couldn't update the card."); }
    finally { setBusy(false); }
  };
  const onDone = (id?: number) => { if (id) setFilter("all"); void load(id); setRefresh((n) => n + 1); };
  const usable = Boolean(selected && ["active", "frozen"].includes(selected.status));
  const terminal = Boolean(selected && ["replaced", "closed"].includes(selected.status));
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><div className="mb-1 flex items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-brand">EVERYDAY FREEDOM</p></div><h1 className="font-display text-[28px] font-semibold tracking-tight">Cards</h1><p className="mt-1 text-sm text-ink-soft">Made for your life. Managed on your terms.</p></div><button onClick={() => setMode("issue")} disabled={!canEdit || !!accountError || !accounts.some((a) => a.type !== "fixed_deposit")} className="btn-primary"><IconPlus size={16} />Get a new card</button></header>
    {error && <div role="alert" className="card p-6 text-center"><p className="text-sm text-rose">{error}</p><button className="btn-outline mt-3" onClick={() => void load()}>Try again</button></div>}
    {accountError && <div className="rounded-xl border border-amber/25 bg-amber-soft p-4 text-xs text-amber">Linked accounts unavailable: {accountError}<button className="ml-2 font-bold underline" onClick={() => void load()}>Retry</button></div>}
    {!cards && !error ? <div className="grid gap-6 lg:grid-cols-2"><div className="aspect-[1.7] animate-pulse rounded-2xl bg-line" /><div className="h-72 animate-pulse rounded-2xl bg-line-soft" /></div> : cards?.length === 0 ? <EmptyState icon={<BankIcon name="card" size={26} />} title="Meet your new everyday card" body="Create a virtual debit card in seconds, or try a physical card with simulated delivery. Set limits and keep every payment in your control." action={accounts.some((a) => a.type !== "fixed_deposit") ? <button className="btn-primary" disabled={!canEdit} onClick={() => setMode("issue")}><IconPlus size={16} />Create your first card</button> : <Link href="/app/accounts" className="btn-primary">Open an account first<BankIcon name="arrow" size={16} /></Link>} /> : selected && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-lg bg-line-soft/70 p-1">{["all", "virtual", "physical"].map((tab) => <button key={tab} onClick={() => { setFilter(tab); const next = cards?.find((c) => tab === "all" || c.kind === tab); if (next) setSelectedId(next.id); }} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === tab ? "bg-card shadow-sm" : "text-ink-faint hover:text-ink"}`}>{tab === "all" ? "All cards" : `${tab} cards`} <span className="ml-1 text-[10px] text-ink-faint">{cards?.filter((c) => tab === "all" || c.kind === tab).length}</span></button>)}</div><p className="flex items-center gap-1.5 text-[11px] text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-good" />{activeCount} active · {cards?.length} total</p></div>
      {shownCards.length === 0 ? <EmptyState compact icon={<BankIcon name="card" size={22} />} title={`No ${filter} cards yet`} body="Choose a card linked to an open account." action={<button className="btn-primary" disabled={!canEdit || !accounts.length} onClick={() => setMode("issue")}>Get a card</button>} /> : <>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{selected.name}</h2><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${selected.status === "active" ? "bg-good-soft text-good" : selected.status === "frozen" ? "bg-[#e8eef7] text-[#31517a]" : "bg-amber-soft text-amber"}`}>{selected.status === "frozen" ? <BankIcon name="freeze" size={11} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{CARD_STATUS_LABELS[selected.status]}</span></div>
          <CardFace card={selected} revealed={revealed} />
          <div className="grid grid-cols-2 gap-3"><button className="btn-outline" disabled={!canEdit || !usable || busy} onClick={() => revealed ? setRevealed(null) : setMode("reveal")}>{revealed ? <IconEyeOff size={16} /> : <IconEye size={16} />}{revealed ? "Hide details" : "Show details"}</button><button className={`btn-outline ${selected.status === "frozen" ? "border-brand/40 bg-brand-soft/60 text-brand" : ""}`} disabled={!canEdit || !usable || busy} onClick={() => void update({ status: selected.status === "frozen" ? "active" : "frozen" })}>{busy ? <IconSpinner size={16} /> : <BankIcon name="freeze" size={16} />}{selected.status === "frozen" ? "Unfreeze card" : "Freeze card"}</button></div>
          {revealed && <p className="text-center text-[11px] text-ink-faint">Protected card number · auto-hides after 30 seconds</p>}
          <div className="flex gap-2 overflow-x-auto pb-1">{shownCards.map((c) => <button key={c.id} onClick={() => { setSelectedId(c.id); setRevealed(null); }} className={`flex min-w-[155px] flex-1 items-center gap-2.5 rounded-xl border p-3 text-left transition ${selected.id === c.id ? "border-brand bg-brand-soft/40" : "border-line bg-card hover:border-brand/35"}`}><span className={`flex h-8 w-10 shrink-0 items-center justify-center rounded-md ${c.kind === "virtual" ? "bg-brand text-white" : "bg-night text-white/70"}`}><BankIcon name="card" size={16} /></span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold">{c.name}</span><span className="text-[10px] text-ink-faint">•••• {c.last4} · {c.kind}</span></span>{selected.id === c.id && <IconCheck size={13} className="ml-auto shrink-0 text-brand" />}</button>)}</div>
          <div className="card flex items-center gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand"><BankIcon name="wallet" size={17} /></span><div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Linked account</p><p className="mt-1 text-sm font-semibold">{selected.accountName}</p></div><div className="text-right"><p className="font-display text-sm font-semibold">{accounts.find((a) => a.id === selected.accountId) ? money(accounts.find((a) => a.id === selected.accountId)!.balanceCents, selected.currency) : selected.currency}</p><Link href="/app/accounts" className="text-[11px] font-semibold text-brand">View account →</Link></div></div>
          {selected.status === "awaiting_activation" && <div className="rounded-xl border border-amber/25 bg-amber-soft p-4"><p className="text-sm font-semibold text-amber">Your physical debit card is in transit</p><p className="mt-1 text-xs leading-relaxed text-amber">Dispatched via courier to {selected.deliveryAddress}.</p><button className="btn-outline mt-3 w-full py-2 text-xs" disabled={!canEdit} onClick={() => setMode("activate")}>Confirm arrival & activate<BankIcon name="arrow" size={14} /></button></div>}
          <div className="card p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">A little less to carry</h3></div><p className="mt-1 text-xs text-ink-faint">Instant contactless payments with Apple Wallet & Google Pay.</p><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={!canEdit || selected.status !== "active"} onClick={() => { setWalletProvider("apple"); setMode("wallet"); }} className="rounded-lg border border-line py-3 font-display text-sm font-semibold transition hover:bg-paper disabled:opacity-50">Apple Pay<span className="mt-1 block font-sans text-[10px] font-normal text-ink-faint">{selected.appleWalletDemo ? "Added to wallet" : "Add to wallet"}</span></button><button disabled={!canEdit || selected.status !== "active"} onClick={() => { setWalletProvider("google"); setMode("wallet"); }} className="rounded-lg border border-line py-3 font-display text-sm font-semibold transition hover:bg-paper disabled:opacity-50">Google Pay<span className="mt-1 block font-sans text-[10px] font-normal text-ink-faint">{selected.googleWalletDemo ? "Added to wallet" : "Add to wallet"}</span></button></div></div>
        </div>
        <div className="space-y-4"><section className="card overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><h2 className="font-display text-base font-semibold">Card controls</h2><p className="mt-1 text-xs text-ink-faint">A little control. A lot of peace of mind.</p></div><div className="divide-y divide-line-soft px-5">{([
          ["onlineEnabled", "Online payments", "Subscriptions and online purchases", "online"],
          ["internationalEnabled", "International payments", "Purchases outside your home country", "globe"],
          ["atmEnabled", "ATM withdrawals", selected.kind === "virtual" ? "Available on physical cards only" : "Withdraw cash using your card PIN", "atm"],
        ] as const).map(([key, title, hint, icon]) => <div key={key} className="flex items-center gap-3 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-soft"><BankIcon name={icon} size={17} /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold">{title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{hint}</p></div><Switch label={title} checked={selected[key]} disabled={!canEdit || !usable || busy || (key === "atmEnabled" && selected.kind === "virtual")} onClick={() => void update({ [key]: !selected[key] })} /></div>)}</div><div className="border-t border-line-soft px-5"><button disabled={!canEdit || terminal} onClick={() => setMode("pin")} className="flex w-full items-center gap-3 py-4 text-left disabled:opacity-45"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-ink-soft"><BankIcon name="lock" size={17} /></span><div className="flex-1"><p className="text-[13px] font-semibold">{selected.pinSet ? "Change PIN" : "Set your PIN"}</p><p className="mt-0.5 text-[11px] text-ink-faint">{selected.pinChangedAt ? `Last changed ${fmtDate(selected.pinChangedAt)}` : "Choose a secure 4-digit code"}</p></div><BankIcon name="arrow" size={16} className="text-ink-faint" /></button></div></section>
          <section className="card p-5"><div className="flex items-center justify-between"><h2 className="font-display text-base font-semibold">Spending limits</h2><button className="text-xs font-semibold text-brand disabled:text-ink-faint" disabled={!canEdit || !usable || busy} onClick={() => setMode("limits")}>Edit limits</button></div><div className="mt-5 space-y-5">{[["Daily", selected.dailySpentCents, selected.dailyLimitCents], ["Monthly", selected.monthlySpentCents, selected.monthlyLimitCents]].map(([label, spent, limit]) => <div key={label}><div className="mb-2 flex justify-between gap-2 text-xs"><p className="font-semibold">{label} spending</p><p><span className="font-semibold">{money(Number(spent), selected.currency)}</span><span className="text-ink-faint"> / {money(Number(limit), selected.currency)}</span></p></div><div className="h-1.5 overflow-hidden rounded-full bg-line-soft"><div className={`h-full rounded-full transition-all ${Number(spent) >= Number(limit) ? "bg-amber" : "bg-brand"}`} style={{ width: `${Math.min(100, Number(spent) / Math.max(Number(limit), 1) * 100)}%` }} /></div></div>)}</div><p className="mt-4 text-[10px] leading-relaxed text-ink-faint">Includes approved demo purchases and ATM withdrawals. Resets daily / monthly at midnight UTC.</p></section>
          <section className="card divide-y divide-line-soft px-5"><button disabled={!canEdit || terminal} onClick={() => setMode("replace")} className="flex w-full items-center gap-3 py-4 text-left disabled:opacity-45"><BankIcon name="replace" size={18} className="text-ink-soft" /><div className="flex-1"><p className="text-[13px] font-semibold">Request replacement</p><p className="mt-0.5 text-[11px] text-ink-faint">Lost, damaged or ready for a fresh start</p></div><BankIcon name="arrow" size={15} className="text-ink-faint" /></button><button disabled={!canEdit || terminal} onClick={() => setMode("close")} className="flex w-full items-center justify-between py-3 text-xs font-semibold text-rose disabled:opacity-45">Close card permanently<IconX size={14} /></button></section>
        </div>
      </div>
      <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4"><div><h2 className="font-display text-base font-semibold">Card activity</h2><p className="mt-1 text-xs text-ink-faint">{selected.name} · latest 200 test authorizations</p></div><div className="flex items-center gap-2"><select className="input w-auto py-2 text-xs" aria-label="Filter card transactions" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}><option value="all">All activity</option><option value="completed">Approved</option><option value="declined">Declined</option></select><button disabled={!canEdit || terminal} className="btn-outline py-2 text-xs" onClick={() => setMode("simulate")}><BankIcon name="card" size={14} />Test payment</button></div></div>
        {historyError ? <div className="p-8 text-center"><p className="text-sm text-rose">{historyError}</p><button className="btn-outline mt-3" onClick={() => setRefresh((n) => n + 1)}>Retry</button></div> : history === null ? <div className="space-y-4 p-5">{[1, 2, 3].map((n) => <div key={n} className="h-9 animate-pulse rounded-lg bg-line-soft" />)}</div> : !shownHistory.length ? <div className="flex flex-col items-center px-5 py-10 text-center"><BankIcon name="card" size={25} className="mb-3 text-ink-faint" /><p className="text-sm font-semibold">{history.length ? "No matching activity" : "Your next purchase starts here"}</p><p className="mt-1 max-w-md text-xs leading-relaxed text-ink-faint">Run a test payment to see your controls in action. Approved payments appear in both card history and your account statement.</p></div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-paper/60 text-[10px] uppercase tracking-wider text-ink-faint"><tr><th className="px-5 py-3 font-semibold">Merchant</th><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Channel</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Amount</th></tr></thead><tbody className="divide-y divide-line-soft">{shownHistory.slice(0, more ? 200 : 6).map((item) => <tr key={item.id}><td className="min-w-48 px-5 py-3.5"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-ink-soft"><BankIcon name={item.channel === "atm" ? "atm" : item.channel === "online" ? "online" : "card"} size={15} /></span><div><p className="text-[13px] font-semibold">{item.merchant}</p>{item.declineReason && <p className="mt-0.5 text-[10px] text-rose">{item.declineReason}</p>}</div></div></td><td className="whitespace-nowrap px-3 py-3 text-ink-soft">{fmtDate(item.occurredAt)}</td><td className="px-3 py-3 capitalize text-ink-soft">{item.channel === "pos" ? "In-store" : item.channel}{item.international && <span className="mt-1 block text-[10px] text-ink-faint">International</span>}</td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status === "completed" ? "bg-good-soft text-good" : "bg-rose-soft text-rose"}`}>{item.status === "completed" ? <IconCheck size={10} /> : <IconX size={10} />}{item.status === "completed" ? "Approved" : "Declined"}</span></td><td className={`whitespace-nowrap px-5 py-3 text-right font-display text-sm font-semibold ${item.status === "declined" ? "text-ink-faint" : ""}`}>{item.status === "completed" ? "−" : ""}{money(item.amountCents, selected.currency)}</td></tr>)}</tbody></table></div>}
        {shownHistory.length > 6 && <button className="w-full border-t border-line-soft py-3 text-xs font-semibold text-brand hover:bg-paper" onClick={() => setMore(!more)}>{more ? "Show less" : `Show all ${shownHistory.length} authorizations`}</button>}
      </section>
      </>}
    </>}
    <footer className="flex items-start gap-2 rounded-xl bg-paper px-1 text-[11px] leading-relaxed text-ink-faint"><IconShield size={15} className="mt-0.5 shrink-0" /><p>Bank-grade protection. Card credentials are encrypted and sensitive changes require password authorization.</p></footer>
    <CardDialogs walletProvider={walletProvider} mode={mode} card={selected} accounts={accounts} onClose={() => setMode(null)} onDone={onDone} onReveal={setRevealed} />
  </div>;
}
