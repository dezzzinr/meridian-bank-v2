"use client";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client";
import { ACCOUNT_TYPES, ACCOUNT_LABELS, ACCOUNT_DESCRIPTIONS, TERM_RATES, termMaturity, type AccountType } from "@/lib/banking";
import { CURRENCIES } from "@/lib/currency";
import { useCurrentUser } from "../CurrencyContext";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { IconSpinner, IconCheck } from "../icons";
import { BankIcon } from "../banking/BankIcon";

export function OpenAccountModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [type, setType] = useState<AccountType>("checking");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [amount, setAmount] = useState("");
  const [jointEmail, setJointEmail] = useState("");
  const [term, setTerm] = useState(6);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setType("checking"); setName(""); setAmount(""); setJointEmail(""); setCurrency(user.currency === "EUR" ? "USD" : "EUR"); setTerm(6); setError(""); } }, [open, user.currency]);
  const code = type === "foreign_currency" ? currency : user.currency;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      await apiJson("/api/accounts", { method: "POST", body: JSON.stringify({ name, type, currency: code, amount: amount || "0", termMonths: term, jointEmail }) });
      toast("success", type === "joint" ? "Account opened and invitation sent." : `${name} is ready.`);
      window.dispatchEvent(new Event("meridian:banking-updated")); onDone?.(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't open your account."); }
    finally { setBusy(false); }
  };
  return <Modal open={open} onClose={() => { if (!busy) onClose(); }} title="A place for every plan" subtitle="Choose the account that fits what comes next." maxW="max-w-xl">
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">{ACCOUNT_TYPES.map((value) => <button type="button" key={value} onClick={() => setType(value)} className={`relative rounded-xl border p-3 text-left transition ${type === value ? "border-brand bg-brand-soft/50 ring-1 ring-brand/20" : "border-line hover:bg-paper"} ${value === "joint" ? "col-span-2" : ""}`}>
        <BankIcon name={value === "foreign_currency" ? "globe" : value === "fixed_deposit" ? "lock" : "wallet"} size={19} className="mb-2 text-brand" />
        {type === value && <IconCheck size={14} className="absolute right-3 top-3 text-brand" />}<p className="text-xs font-semibold">{ACCOUNT_LABELS[value]}</p><p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{ACCOUNT_DESCRIPTIONS[value]}</p>
      </button>)}</div>
      <Field label="Account name"><Input aria-label="Account name" required minLength={2} maxLength={48} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Everyday essentials" /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Currency">{type === "foreign_currency" ? <Select aria-label="Account currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.filter((c) => c.code !== user.currency).map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</Select> : <Input value={`${user.currency} · ${user.region}`} disabled aria-label="Account currency" />}</Field><Field label={`Opening deposit (${code})`}><Input aria-label="Opening balance" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={code === "JPY" ? "0" : "0.00"} required={type === "fixed_deposit"} /></Field></div>
      {type === "fixed_deposit" && <><Field label="Deposit term"><Select value={term} onChange={(e) => setTerm(Number(e.target.value))} aria-label="Deposit term">{[3, 6, 12].map((m) => <option key={m} value={m}>{m} months · {(TERM_RATES[m] / 100).toFixed(2)}% indicative p.a.</option>)}</Select></Field><p className="rounded-lg bg-amber-soft p-3 text-xs leading-relaxed text-amber">Funds are locked until {termMaturity(term).toLocaleDateString()}. Guaranteed yield. Funds remain locked until maturity date.</p></>}
      {type === "joint" && <Field label="Invite a co-holder" hint="An active registered customer must accept in their Accounts page before they can access the shared balance, statements and payments."><Input aria-label="Co-holder email" type="email" required value={jointEmail} onChange={(e) => setJointEmail(e.target.value)} placeholder="customer@example.com" /></Field>}
      <p className="rounded-lg bg-paper p-3 text-[11px] leading-relaxed text-ink-soft">Each account holds independent balances in its native currency with zero international conversion fees.</p>
      {error && <p role="alert" className="rounded-lg bg-rose-soft p-3 text-xs font-semibold text-rose">{error}</p>}
      <div className="flex gap-2"><button type="button" className="btn-outline flex-1" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-primary flex-1" disabled={busy || user.status !== "active"}>{busy && <IconSpinner size={15} />}Open account</button></div>
    </form>
  </Modal>;
}
