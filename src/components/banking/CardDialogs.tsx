"use client";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client";
import { money } from "@/lib/format";
import type { CardDTO } from "@/lib/banking";
import type { AccountDTO } from "@/lib/queries";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { IconSpinner, IconCheck } from "../icons";
import { BankIcon } from "./BankIcon";

export type CardDialogMode = "issue" | "reveal" | "pin" | "limits" | "replace" | "wallet" | "activate" | "simulate" | "close" | null;
const TITLES = { issue: "Your next everyday essential", reveal: "Reveal card details", pin: "Set a new card PIN", limits: "Your spending, your limits", replace: "Request a replacement", wallet: "Take your card with you", activate: "Activate your physical card", simulate: "Test your card controls", close: "Close this card" };
export function CardDialogs({ mode, card, accounts, onClose, onDone, onReveal, walletProvider }: {
  walletProvider: "apple" | "google";
  mode: CardDialogMode; card: CardDTO | null; accounts: AccountDTO[];
  onClose: () => void; onDone: (selectedId?: number) => void; onReveal: (value: string) => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState("virtual");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [reason, setReason] = useState("damaged");
  const [provider, setProvider] = useState<"apple" | "google">("apple");
  const [last4, setLast4] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("online");
  const [international, setInternational] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ status: string; declineReason?: string | null } | null>(null);
  const eligible = accounts.filter((a) => !a.closedAt && a.type !== "fixed_deposit");
  useEffect(() => {
    if (!mode) return;
    setKind("virtual"); setName(""); setAccountId(eligible[0] ? String(eligible[0].id) : "");
    setAddress(""); setPassword(""); setPin(""); setConfirmPin(""); setReason("damaged"); setProvider(walletProvider); setLast4("");
    setDaily(String((card?.dailyLimitCents ?? 100000) / 100)); setMonthly(String((card?.monthlyLimitCents ?? 500000) / 100));
    setMerchant(""); setAmount(""); setChannel("online"); setInternational(false); setError(""); setOutcome(null);
    // Reset secrets only when opening/switching dialogs, not when usage refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, card?.id, walletProvider]);
  if (!mode) return null;
  const walletSaved = provider === "apple" ? card?.appleWalletDemo : card?.googleWalletDemo;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (mode === "pin" && pin !== confirmPin) { setError("The two PINs do not match."); return; }
    setBusy(true);
    try {
      if (mode === "issue") {
        const result = await apiJson<{ id: number }>("/api/cards", { method: "POST", body: JSON.stringify({ kind, name, accountId: Number(accountId), deliveryAddress: address }) });
        toast("success", kind === "virtual" ? "Your virtual card is ready." : "Physical card requested. Express processing initiated."); onDone(result.id); onClose();
      } else if (card) {
        if (mode === "limits") {
          await apiJson(`/api/cards/${card.id}`, { method: "PATCH", body: JSON.stringify({ dailyLimit: daily, monthlyLimit: monthly }) });
          toast("success", "Spending limits updated."); onDone(); onClose();
        } else {
          const result = await apiJson<{ demoNumber?: string; replacementId?: number; status?: string; declineReason?: string | null }>(`/api/cards/${card.id}/${mode}`, { method: "POST", body: JSON.stringify({ password, pin, reason, provider, enabled: !walletSaved, last4, merchant, amount, channel, international }) });
          setPassword(""); setPin(""); setConfirmPin("");
          if (mode === "reveal" && result.demoNumber) { onReveal(result.demoNumber); onClose(); return; }
          if (mode === "simulate") { setOutcome({ status: result.status ?? "declined", declineReason: result.declineReason }); onDone(); return; }
          const messages = { pin: "Your PIN was updated securely.", replace: "Replacement requested. Your old card is permanently disabled.", wallet: walletSaved ? "Wallet setup removed." : "Wallet card provisioning ready.", activate: "Physical card activated successfully.", close: "Card closed. History is preserved." };
          toast("success", messages[mode as keyof typeof messages] ?? "Card updated."); onDone(result.replacementId); onClose();
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't complete this action."); }
    finally { setBusy(false); }
  };
  const passwordField = <Field label="Confirm your sign-in password" hint="We ask again to protect sensitive card actions."><Input aria-label="Confirm sign-in password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>;
  return <Modal open={true} onClose={() => { if (!busy) onClose(); }} title={TITLES[mode]} subtitle={mode === "issue" ? "An authentic debit card, linked to your chosen account." : card ? `${card.name} · •••• ${card.last4}` : undefined} maxW="max-w-lg">
    <form onSubmit={submit} className="space-y-4">
      {mode === "issue" && <>
        <div className="grid grid-cols-2 gap-3">{["virtual", "physical"].map((value) => <button type="button" key={value} onClick={() => setKind(value)} className={`relative rounded-xl border p-4 text-left ${kind === value ? "border-brand bg-brand-soft/50" : "border-line hover:bg-paper"}`}><BankIcon name="card" size={23} className="mb-3 text-brand" />{kind === value && <IconCheck size={15} className="absolute right-3 top-3 text-brand" />}<p className="text-sm font-semibold capitalize">{value} card</p><p className="mt-1 text-xs text-ink-soft">{value === "virtual" ? "Instantly ready for testing" : "Simulated delivery & activation"}</p></button>)}</div>
        <Field label="Card nickname"><Input aria-label="Card nickname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Everyday card" minLength={2} maxLength={40} required /></Field>
        <Field label="Linked account"><Select aria-label="Linked card account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required><option value="" disabled>Choose an account</option>{eligible.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency} · {money(a.balanceCents, a.currency)}</option>)}</Select>{!eligible.length && <p className="mt-2 text-xs text-amber">Open a non-fixed-deposit account first.</p>}</Field>
        {kind === "physical" && <Field label="Delivery address" hint="Enter your residential or office mailing address."><textarea aria-label="Delivery address" className="input min-h-20" required minLength={12} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, postal code, country" /></Field>}
        
      </>}
      {mode === "reveal" && <><div className="rounded-xl bg-brand-soft/50 p-4 text-xs leading-relaxed text-brand-deep">Your 16-digit card number will be displayed securely for 30 seconds. Do not share this information with anyone.</div>{passwordField}</>}
      {mode === "pin" && <>{passwordField}<div className="grid grid-cols-2 gap-3"><Field label="New 4-digit PIN"><Input aria-label="New PIN" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></Field><Field label="Confirm PIN"><Input aria-label="Confirm PIN" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} required value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} /></Field></div><p className="text-xs text-ink-faint">Your PIN is stored as a salted hash, never as plain text. Five incorrect ATM test attempts temporarily lock PIN verification.</p></>}
      {mode === "limits" && <><div className="rounded-lg bg-brand-soft/50 p-3 text-xs text-brand-deep">Limits apply across purchases and ATM withdrawals. Daily and monthly usage reset at 00:00 UTC.</div><Field label={`Daily spending limit (${card?.currency})`}><Input aria-label="Daily spending limit" inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value)} required /></Field><Field label={`Monthly spending limit (${card?.currency})`}><Input aria-label="Monthly spending limit" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} required /></Field><p className="text-xs text-ink-faint">The daily limit cannot be greater than the monthly limit. New limits apply immediately to test payments.</p></>}
      {mode === "replace" && <><p className="rounded-lg bg-amber-soft p-3 text-xs leading-relaxed text-amber">Your current card will be permanently disabled. The replacement gets a new demo number and requires a new PIN. Your linked balance and old card history stay unchanged.</p><Field label="Replacement reason"><Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Replacement reason">{["damaged", "lost", "stolen", "expired"].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select></Field>{card?.kind === "physical" && <p className="text-xs text-ink-soft">Delivery address: {card.deliveryAddress}. No physical shipping occurs.</p>}{passwordField}</>}
      {mode === "wallet" && <><div className="grid grid-cols-2 gap-3">{(["apple", "google"] as const).map((value) => <button type="button" key={value} onClick={() => setProvider(value)} className={`rounded-xl border p-5 text-center ${provider === value ? "border-brand bg-brand-soft/50" : "border-line"}`}><p className="font-display text-xl font-semibold">{value === "apple" ? "Apple Pay" : "Google Pay"}</p><p className="mt-2 text-[10px] uppercase tracking-wider text-ink-faint">Card provision</p></button>)}</div><p className="rounded-xl bg-brand-soft/50 p-4 text-xs leading-relaxed text-brand-deep">Provision your Meridian card to your secure digital device wallet for contactless NFC payments.</p><p className="text-xs text-ink-soft">Selected wallet: {walletSaved ? "Card provision saved" : "Not set up"}</p></>}
      {mode === "activate" && <><p className="rounded-xl bg-paper p-4 text-xs leading-relaxed text-ink-soft">Simulate receiving your physical card, then confirm the last four digits. This does not trigger a real shipment or activation with a card network.</p><Field label="Last four digits"><Input aria-label="Activation last four digits" value={last4} onChange={(e) => setLast4(e.target.value)} maxLength={4} minLength={4} required /></Field></>}
      {mode === "simulate" && <><p className="rounded-xl bg-amber-soft p-3 text-xs leading-relaxed text-amber">Simulate a merchant POS or online checkout to verify your card limits and security rules.</p><Field label="Merchant / ATM"><Input aria-label="Test merchant" minLength={2} maxLength={70} value={merchant} onChange={(e) => setMerchant(e.target.value)} required placeholder="e.g. Corner coffee" /></Field><div className="grid grid-cols-2 gap-3"><Field label={`Amount (${card?.currency})`}><Input aria-label="Test amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field><Field label="Channel"><Select aria-label="Test channel" value={channel} onChange={(e) => setChannel(e.target.value)}><option value="online">Online purchase</option><option value="pos">In-store purchase</option><option value="atm">ATM withdrawal</option></Select></Field></div><label className="flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" className="accent-brand" checked={international} onChange={(e) => setInternational(e.target.checked)} />International transaction</label>{channel === "atm" && <Field label="Card PIN"><Input aria-label="Test ATM PIN" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} /></Field>}{outcome && <div role="status" className={`rounded-xl p-4 text-sm ${outcome.status === "completed" ? "bg-good-soft text-good" : "bg-rose-soft text-rose"}`}><p className="font-semibold">{outcome.status === "completed" ? "Transaction Authorized & Debited" : "Declined · no funds debited"}</p>{outcome.declineReason && <p className="mt-1 text-xs">{outcome.declineReason}</p>}</div>}</>}
      {mode === "close" && <><p className="rounded-xl bg-rose-soft p-4 text-xs leading-relaxed text-rose">This permanently disables the card. You can still view its history, and your linked account stays open. Use Freeze instead if you only need a temporary pause.</p>{passwordField}</>}
      {error && <p role="alert" className="rounded-lg bg-rose-soft p-3 text-xs font-semibold text-rose">{error}</p>}
      <div className="flex gap-2 pt-1"><button type="button" className="btn-outline flex-1" onClick={onClose} disabled={busy}>{mode === "simulate" ? "Done" : "Cancel"}</button><button className={`${mode === "close" ? "btn-danger" : "btn-primary"} flex-1`} disabled={busy || (mode === "issue" && !eligible.length)}>{busy && <IconSpinner size={15} />}{mode === "issue" ? "Issue Card" : mode === "reveal" ? "Reveal for 30 seconds" : mode === "pin" ? "Save PIN" : mode === "limits" ? "Save limits" : mode === "replace" ? "Replace card" : mode === "wallet" ? walletSaved ? "Remove demo setup" : "Connect Wallet" : mode === "activate" ? "Activate Card" : mode === "close" ? "Close permanently" : "Authorize Transaction"}</button></div>
    </form>
  </Modal>;
}
