"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/client";
import { money, fmtDate } from "@/lib/format";
import { ACCOUNT_TYPES, ACCOUNT_LABELS, isTermLocked, type AccountType, type JointInvitationDTO } from "@/lib/banking";
import type { AccountDTO } from "@/lib/queries";
import { useCurrentUser } from "../CurrencyContext";
import { useToast } from "../ui/Toast";
import { TypeBadge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Field";
import { OpenAccountModal } from "../modals/OpenAccountModal";
import { StatementPanel } from "../banking/StatementPanel";
import { BankIcon } from "../banking/BankIcon";
import { IconPlus, IconPencil, IconSpinner, IconUsers, IconWallet } from "../icons";

export function AccountsClient() {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [accounts, setAccounts] = useState<AccountDTO[] | null>(null);
  const [invitations, setInvitations] = useState<JointInvitationDTO[]>([]);
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [filter, setFilter] = useState<AccountType | "all">("all");
  const [closed, setClosed] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState("details");
  const [rename, setRename] = useState("");
  const [busy, setBusy] = useState("");
  const [closeConfirm, setCloseConfirm] = useState(false);
  const canEdit = user.status === "active";
  const load = useCallback(async () => {
    try { const result = await apiJson<{ accounts: AccountDTO[] }>("/api/accounts?includeClosed=true"); setAccounts(result.accounts); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't load accounts."); }
    try { const result = await apiJson<{ invitations: JointInvitationDTO[] }>("/api/accounts/invitations"); setInvitations(result.invitations); setInviteError(""); }
    catch (e) { setInviteError(e instanceof Error ? e.message : "Couldn't load invitations."); }
  }, []);
  useEffect(() => { void load(); const listener = () => { void load(); }; window.addEventListener("meridian:banking-updated", listener); return () => window.removeEventListener("meridian:banking-updated", listener); }, [load]);
  const active = (accounts ?? []).filter((a) => !a.closedAt);
  const totals = useMemo(() => {
    const map = new Map<string, number>(); (accounts ?? []).filter((a) => !a.closedAt).forEach((a) => map.set(a.currency, (map.get(a.currency) ?? 0) + a.balanceCents)); return [...map];
  }, [accounts]);
  const shown = (accounts ?? []).filter((a) => Boolean(a.closedAt) === closed && (filter === "all" || a.type === filter));
  const selected = accounts?.find((a) => a.id === selectedId) ?? null;
  const select = (account: AccountDTO, tab = "details") => { setSelectedId(account.id); setDetailTab(tab); setRename(account.name); setCloseConfirm(false); };
  const respond = async (id: number, status: "accepted" | "declined") => {
    setBusy(`invite-${id}`);
    try { await apiJson("/api/accounts/invitations", { method: "PATCH", body: JSON.stringify({ id, status }) }); toast("success", `Invitation ${status}.`); await load(); }
    catch (e) { toast("error", e instanceof Error ? e.message : "Couldn't respond."); }
    finally { setBusy(""); }
  };
  const saveName = async () => {
    if (!selected) return;
    const original = selected.name; const id = selected.id;
    setBusy("rename"); setAccounts((list) => list?.map((a) => a.id === id ? { ...a, name: rename.trim() } : a) ?? null);
    try { await apiJson(`/api/accounts/${id}`, { method: "PATCH", body: JSON.stringify({ name: rename }) }); toast("success", "Account renamed."); }
    catch (e) { setAccounts((list) => list?.map((a) => a.id === id ? { ...a, name: original } : a) ?? null); toast("error", e instanceof Error ? e.message : "Rename failed."); }
    finally { setBusy(""); }
  };
  const close = async () => {
    if (!selected) return; setBusy("close");
    try { await apiJson(`/api/accounts/${selected.id}`, { method: "DELETE" }); setSelectedId(null); toast("success", "Account closed. Statements are still available under Closed."); await load(); }
    catch (e) { toast("error", e instanceof Error ? e.message : "Couldn't close the account."); }
    finally { setBusy(""); }
  };
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast("success", "Account number copied."); } catch { toast("error", "Clipboard unavailable. Select and copy the account number instead."); } };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-brand">YOUR MONEY, ORGANIZED</p><h1 className="font-display text-[28px] font-semibold tracking-tight">Accounts</h1><p className="mt-1 text-sm text-ink-soft">Everyday spending. Future plans. All in one place.</p></div><button className="btn-primary" onClick={() => setOpen(true)} disabled={!canEdit}><IconPlus size={16} />Open an account</button></header>
    {!!invitations.length && <div className="space-y-3">{invitations.map((invite) => <div key={invite.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft/50 p-4"><IconUsers size={23} className="text-brand" /><div className="flex-1"><p className="text-sm font-semibold">An invitation to share {invite.accountName}</p><p className="mt-1 text-xs text-ink-soft">{invite.ownerName} invited you · {invite.currency}. Accepting grants access to the balance, full history and payments.</p></div><div className="flex gap-2"><button disabled={!canEdit || !!busy} className="btn-outline py-2 text-xs" onClick={() => void respond(invite.id, "declined")}>Decline</button><button disabled={!canEdit || !!busy} className="btn-primary py-2 text-xs" onClick={() => void respond(invite.id, "accepted")}>{busy === `invite-${invite.id}` && <IconSpinner size={13} />}Accept invitation</button></div></div>)}</div>}
    {inviteError && <p className="text-xs text-rose">Invitations unavailable: {inviteError}</p>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-night p-5 text-white"><p className="text-[11px] uppercase tracking-wider text-emerald-100/50">Open accounts</p><div className="mt-3 flex items-end justify-between"><p className="font-display text-3xl font-semibold">{accounts ? active.length.toString().padStart(2, "0") : "—"}</p><IconWallet size={24} className="text-emerald-100/40" /></div></div><div className="card p-5"><p className="text-[11px] uppercase tracking-wider text-ink-faint">Balances by currency</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{totals.length ? totals.map(([c, v]) => <div key={c}><p className="text-[10px] text-ink-faint">{c}</p><p className="font-display text-base font-semibold">{money(v, c)}</p></div>) : <p className="text-ink-soft">No funded accounts yet</p>}</div></div><div className="card p-5"><p className="text-[11px] uppercase tracking-wider text-ink-faint">Built around your life</p><p className="mt-3 text-sm font-semibold">Five ways to bank</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">Everyday, savings, fixed term, foreign currency and shared accounts.</p></div></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-lg bg-line-soft/70 p-1">{[false, true].map((value) => <button key={String(value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${closed === value ? "bg-card shadow-sm" : "text-ink-faint"}`} onClick={() => setClosed(value)}>{value ? "Closed" : "Open accounts"}</button>)}</div><select aria-label="Filter account type" value={filter} onChange={(e) => setFilter(e.target.value as AccountType | "all")} className="input w-auto py-2 text-xs"><option value="all">All account types</option>{ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{ACCOUNT_LABELS[type]}</option>)}</select></div>
    {error && <div role="alert" className="card p-6 text-center"><p className="text-sm text-rose">{error}</p><button className="btn-outline mt-3" onClick={() => void load()}>Try again</button></div>}
    {!accounts && !error ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="card h-56 animate-pulse bg-line-soft" />)}</div> : shown.length === 0 && !error ? <EmptyState icon={<IconWallet size={22} />} title={closed ? "No closed accounts" : "A fresh start for your money"} body={closed ? "Closed accounts keep their statements here." : "Open an account to start organizing your spending and savings."} action={!closed && canEdit ? <button className="btn-primary" onClick={() => setOpen(true)}><IconPlus size={16} />Open account</button> : undefined} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((a) => <article key={a.id} className="card flex flex-col overflow-hidden transition hover:border-brand/35"><div className={`h-1 ${a.type === "fixed_deposit" ? "bg-amber/70" : a.type === "foreign_currency" ? "bg-[#7394b1]" : a.type === "joint" ? "bg-[#a67fa0]" : "bg-brand/65"}`} /><div className="flex-1 p-5"><div className="flex items-center justify-between gap-2"><TypeBadge type={a.type} /><span className="text-xs font-medium text-ink-faint">{a.currency}</span></div><button className="mt-4 text-left font-display text-lg font-semibold hover:text-brand" onClick={() => select(a)}>{a.name}</button><p className="mt-1 text-xs text-ink-faint">•••• {a.last4}{!a.isOwner ? " · Joint holder" : a.type === "joint" ? " · Primary owner" : ""}</p><p className="mt-4 font-display text-[28px] font-semibold tracking-tight">{money(a.balanceCents, a.currency)}</p><p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">{a.closedAt ? "Closed · history preserved" : isTermLocked(a) ? <><BankIcon name="lock" size={12} />Matures {fmtDate(a.maturityAt!)}</> : "Available balance"}</p></div><div className="flex border-t border-line-soft"><button onClick={() => select(a)} className="flex flex-1 items-center justify-center gap-2 px-3 py-3 text-xs font-semibold text-ink-soft hover:bg-paper">Account details<BankIcon name="arrow" size={13} /></button><button onClick={() => select(a, "statements")} className="flex flex-1 items-center justify-center gap-2 border-l border-line-soft px-3 py-3 text-xs font-semibold text-brand hover:bg-brand-soft/40"><BankIcon name="document" size={14} />Statements</button></div></article>)}</div>}
    <p className="flex items-center gap-2 text-xs text-ink-faint"><BankIcon name="lock" size={14} />Balances stay in their original currencies. No automatic conversion or real bank deposits.</p>
    <OpenAccountModal open={open} onClose={() => setOpen(false)} onDone={() => void load()} />
    <Modal open={!!selected} onClose={() => { if (!busy) setSelectedId(null); }} title={selected?.name ?? "Account details"} subtitle={selected ? `${ACCOUNT_LABELS[selected.type]} · ${selected.currency}` : undefined} maxW="max-w-3xl">{selected && <>
      <div className="mb-5 flex gap-1 border-b border-line-soft">{["details", "statements"].map((tab) => <button key={tab} onClick={() => setDetailTab(tab)} className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${detailTab === tab ? "border-brand text-brand" : "border-transparent text-ink-faint"}`}>{tab}</button>)}</div>
      {detailTab === "statements" ? <StatementPanel key={selected.id} account={selected} /> : <div className="space-y-5">
        <div className="rounded-xl bg-brand-soft/50 p-5"><p className="text-xs text-brand-deep">{isTermLocked(selected) ? "Locked balance" : "Available balance"}</p><p className="mt-2 font-display text-3xl font-semibold">{money(selected.balanceCents, selected.currency)}</p><div className="mt-4 flex items-center justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wider text-ink-faint">Standard International Account Identifier (IBAN)</p><p className="mt-1 select-all break-all font-mono text-xs">{selected.accountNumber}</p></div><button aria-label="Copy account number" className="btn-outline p-2" onClick={() => void copy(selected.accountNumber)}><BankIcon name="copy" size={16} /></button></div></div>
        <dl className="grid grid-cols-2 gap-4 text-sm">{[["Primary owner", selected.ownerName], ["Opened", fmtDate(selected.createdAt)], ["Currency", selected.currency], ["Status", selected.closedAt ? "Closed" : "Open"]].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-faint">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
        {selected.type === "fixed_deposit" && <div className="rounded-xl border border-amber/25 bg-amber-soft/50 p-4"><h3 className="text-sm font-semibold">Your fixed-term plan</h3><p className="mt-2 text-xs leading-relaxed text-amber">{selected.termMonths} months · {((selected.interestRateBps ?? 0) / 100).toFixed(2)}% indicative p.a. · Maturity {fmtDate(selected.maturityAt!)}. Funds cannot be transferred before maturity. Interest shown is illustrative and is not automatically credited.</p></div>}
        {selected.type === "joint" && <div className="rounded-xl border border-line p-4"><h3 className="mb-3 text-sm font-semibold">Account holders</h3><p className="text-xs">{selected.ownerName} <span className="text-ink-faint">· Primary owner</span></p>{selected.members.map((m) => <p key={m.id} className="mt-2 text-xs">{m.name} <span className="text-ink-faint">· {m.email} · {m.status}</span></p>)}<p className="mt-3 text-[11px] leading-relaxed text-ink-faint">Accepted holders can view history and statements and make payments. Only the primary owner can rename or close this account.</p></div>}
        {selected.isOwner && !selected.closedAt && <><div><label className="label" htmlFor="account-rename">Account nickname</label><div className="flex gap-2"><Input id="account-rename" value={rename} onChange={(e) => setRename(e.target.value)} maxLength={48} /><button className="btn-outline" disabled={!canEdit || !!busy || rename.trim() === selected.name || rename.trim().length < 2} onClick={() => void saveName()}>{busy === "rename" ? <IconSpinner size={15} /> : <IconPencil size={15} />}Save</button></div></div><div className="border-t border-line-soft pt-4">{!closeConfirm ? <button className="text-xs font-semibold text-rose" disabled={!canEdit} onClick={() => setCloseConfirm(true)}>Close this account</button> : <div className="rounded-lg bg-rose-soft p-4 text-xs text-rose"><p className="leading-relaxed">Your balance must be zero and pending payments settled. Linked cards will be disabled. Statements and history will be kept.</p>{selected.balanceCents > 0 && <Link href="/app/payments" className="mt-2 inline-block font-semibold underline">Transfer remaining funds first</Link>}<div className="mt-3 flex gap-2"><button className="btn-outline py-2 text-xs" onClick={() => setCloseConfirm(false)}>Keep account</button><button className="btn-danger py-2 text-xs" disabled={!!busy || selected.balanceCents !== 0 || isTermLocked(selected)} onClick={() => void close()}>{busy === "close" && <IconSpinner size={13} />}Confirm closure</button></div></div>}</div></>}
      </div>}
    </>}</Modal>
  </div>;
}
