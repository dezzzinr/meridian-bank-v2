"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/client";
import { isTermLocked, parseAmount } from "@/lib/banking";
import type { AccountDTO, PayeeDTO } from "@/lib/queries";
import { money } from "@/lib/format";
import { useCurrentUser } from "../CurrencyContext";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { IconSpinner, IconKey, IconUser, IconBuilding, IconGlobe, IconBitcoin, IconSwap, IconChevronDown, IconCheck } from "../icons";
import { BankIcon } from "../banking/BankIcon";

type TransferChannel = "account" | "person" | "external_bank" | "wire" | "international" | "cashapp" | "zelle" | "paypal" | "crypto";
const CHANNELS: { id: TransferChannel; label: string; hint: string; mark: string; tone: string; icon?: typeof IconUser }[] = [
  { id: "account", label: "Between accounts", hint: "Your Meridian accounts", mark: "↔", tone: "bg-brand-soft text-brand", icon: IconSwap },
  { id: "person", label: "To a person", hint: "Someone you know", mark: "", tone: "bg-violet-100 text-violet-700", icon: IconUser },
  { id: "external_bank", label: "External bank", hint: "Another bank account", mark: "", tone: "bg-blue-100 text-blue-700", icon: IconBuilding },
  { id: "wire", label: "Wire transfer", hint: "Bank wire details", mark: "", tone: "bg-slate-100 text-slate-700", icon: IconBuilding },
  { id: "international", label: "International", hint: "A bank in another country", mark: "", tone: "bg-cyan-100 text-cyan-700", icon: IconGlobe },
  { id: "cashapp", label: "Cash App", hint: "Cash App tag", mark: "$", tone: "bg-[#d9fbe8] text-[#00a846]" },
  { id: "zelle", label: "Zelle", hint: "Email or mobile number", mark: "Z", tone: "bg-[#f2e8ff] text-[#6d1ed4]" },
  { id: "paypal", label: "PayPal", hint: "PayPal account", mark: "P", tone: "bg-[#e5f1ff] text-[#0757a5]" },
  { id: "crypto", label: "Cryptocurrency", hint: "Wallet address", mark: "₿", tone: "bg-[#fff1d8] text-[#bd7410]", icon: IconBitcoin },
];

export function NewTransferModal({ accounts, open, onClose, onDone }: { accounts: AccountDTO[]; open: boolean; onClose: () => void; onDone?: () => void }) {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [sourceId, setSourceId] = useState(0);
  const [channel, setChannel] = useState<TransferChannel>("account");
  const [mobileTypeOpen, setMobileTypeOpen] = useState(false);
  const [tab, setTab] = useState<"account" | "payee" | "new_recipient">("account");
  const [destId, setDestId] = useState(0);
  const [payees, setPayees] = useState<PayeeDTO[] | null>(null);
  const [payeeError, setPayeeError] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [transactionPin, setTransactionPin] = useState("");

  // New recipient fields
  const [recipientName, setRecipientName] = useState("");
  const [recipientAccountNo, setRecipientAccountNo] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [recipientCountry, setRecipientCountry] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [saveAsPayee, setSaveAsPayee] = useState(true);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);

  const eligible = accounts.filter((a) => !a.closedAt && !isTermLocked(a));

  useEffect(() => {
    if (open) {
      setSourceId(accounts.find((a) => !a.closedAt && !isTermLocked(a))?.id ?? 0);
      setTab("account");
      setChannel("account");
      setMobileTypeOpen(false);
      setDestId(0);
      setAmount("");
      setNote("");
      setTransactionPin("");
      setRecipientName("");
      setRecipientAccountNo("");
      setRecipientBank("");
      setRoutingNumber("");
      setRecipientCountry("");
      setSwiftCode("");
      setSaveAsPayee(true);
      setError("");
      setReview(false);
      setPayees(null);
    }
  }, [open, accounts]);

  const loadPayees = async () => {
    setPayeeError("");
    try {
      const response = await apiJson<{ payees: PayeeDTO[] }>("/api/payees");
      setPayees(response.payees);
    } catch (e) {
      setPayeeError(e instanceof Error ? e.message : "Couldn't load payees.");
    }
  };

  useEffect(() => {
    if (open && tab === "payee" && !payees) void loadPayees();
  }, [open, tab, payees]);

  const source = accounts.find((a) => a.id === sourceId);
  const channelInfo = CHANNELS.find((item) => item.id === channel)!;
  const chooseChannel = (next: TransferChannel) => {
    setChannel(next);
    setTab(next === "account" ? "account" : "new_recipient");
    setDestId(0);
    setError("");
    setMobileTypeOpen(false);
  };
  const destinations = accounts.filter(
    (a) => a.id !== sourceId && !a.closedAt && a.currency === source?.currency && a.type !== "fixed_deposit"
  );

  let destName = "";
  if (tab === "account") {
    destName = destinations.find((a) => a.id === destId)?.name || "";
  } else if (tab === "payee") {
    destName = payees?.find((p) => p.id === destId)?.name || "";
  } else {
    destName = recipientName ? `${recipientName} (${recipientAccountNo})` : "";
  }

  const cents = parseAmount(amount, source?.currency ?? user.currency);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!source || !eligible.some((a) => a.id === source.id)) return setError("Choose an available source account.");
    if (!user.hasTransactionPin) return setError("Set an authorization PIN in Security Center before sending money.");
    if (tab === "account" && !destId) return setError("Choose a destination account.");
    if (tab === "payee" && !destId) return setError("Choose a saved payee.");
    if (tab === "new_recipient") {
      if (!recipientName.trim()) return setError("Recipient full name is required.");
      if (!recipientAccountNo.trim()) return setError("Recipient Account Number / IBAN is required.");
      if (channel === "international" && !recipientCountry.trim()) return setError("Enter the recipient's country.");
      if (channel === "wire" && !swiftCode.trim()) return setError("Enter the recipient bank's SWIFT/BIC code.");
    }
    if (channel === "person" && tab !== "account") {
      if (!recipientBank.trim()) return setError("Enter the recipient's bank name.");
      if (!/^\d{9}$/.test(routingNumber)) return setError("Enter a 9-digit routing number.");
      if (!recipientAccountNo.trim()) return setError("Enter the recipient's account number.");
      if (!note.trim()) return setError("Enter a reference for this transfer.");
    }

    if (!cents || cents <= 0) return setError("Enter a valid positive amount.");
    if (cents > source.balanceCents) return setError(`Available balance is ${money(source.balanceCents, source.currency)}.`);

    if (!review) {
      setReview(true);
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      return setError("Please enter your 4-digit authorization PIN.");
    }

    setBusy(true);
    try {
      const payload: any = {
        sourceAccountId: sourceId,
        destinationType: tab,
        transferChannel: channel,
        amount,
        note: note.trim() || null,
        transactionPin: transactionPin || undefined,
      };

      if (tab === "account" || tab === "payee") {
        payload.destinationId = destId;
        if (tab === "payee" && channel === "person") {
          payload.recipientBank = recipientBank.trim();
          payload.routingNumber = routingNumber.trim();
          payload.recipientAccountNo = recipientAccountNo.trim();
        }
      } else {
        payload.recipientName = recipientName.trim();
        payload.recipientAccountNo = recipientAccountNo.trim();
        payload.recipientBank = recipientBank.trim() || undefined;
        payload.routingNumber = routingNumber.trim() || undefined;
        payload.recipientCountry = recipientCountry.trim() || undefined;
        payload.swiftCode = swiftCode.trim() || undefined;
        payload.saveAsPayee = saveAsPayee && channel !== "person";
      }

      const result = await apiJson<{ referenceNumber: string }>("/api/transfers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast(
        "success",
        `${money(cents, source.currency)} ${tab === "account" ? "transferred" : "sent"} to ${destName}. Ref: ${result.referenceNumber}`
      );
      onClose();
      onDone?.();
      window.dispatchEvent(new Event("meridian:banking-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't complete transfer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose(); }}
      title={review ? "Review your payment" : "Transfer & Pay"}
      subtitle={review ? "Check every detail before you confirm." : "Choose how you want to send money."}
    >
      <form onSubmit={submit} className="space-y-4">
        {!user.hasTransactionPin && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Set an authorization PIN before sending money. <Link href="/app/security" className="font-semibold underline">Set it in Security Center</Link>.
          </div>
        )}
        {!review ? (
          <>
            <Field label="From">
              <Select
                aria-label="Source account"
                value={sourceId || ""}
                onChange={(e) => {
                  setSourceId(Number(e.target.value));
                  setDestId(0);
                }}
                required
              >
                <option value="" disabled>Choose an account</option>
                {eligible.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {money(a.balanceCents, a.currency)} · {a.currency}
                  </option>
                ))}
              </Select>
              {!eligible.length && (
                <p className="mt-2 text-xs text-amber">No spendable accounts available.</p>
              )}
            </Field>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-ink-soft">Transfer type</legend>
              <div className="relative sm:hidden">
                <button type="button" aria-haspopup="true" aria-expanded={mobileTypeOpen} onClick={() => setMobileTypeOpen((value) => !value)} className="input flex h-auto min-h-12 w-full items-center gap-3 py-2.5 text-left">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${channelInfo.tone}`}>
                    {channelInfo.icon ? <channelInfo.icon size={17} /> : channelInfo.mark}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{channelInfo.label}</span><span className="block truncate text-[11px] text-ink-faint">{channelInfo.hint}</span></span>
                  <IconChevronDown size={17} className={`shrink-0 text-ink-faint transition-transform ${mobileTypeOpen ? "rotate-180" : ""}`} />
                </button>
                {mobileTypeOpen && <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-card p-1.5 shadow-xl" role="group" aria-label="Transfer type options">
                  {CHANNELS.map((option) => {
                    const ActiveIcon = option.icon;
                    const selected = channel === option.id;
                    return <button key={option.id} type="button" aria-pressed={selected} onClick={() => chooseChannel(option.id)} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${selected ? "bg-brand-soft/60" : "hover:bg-paper"}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${option.tone}`}>{ActiveIcon ? <ActiveIcon size={17} /> : option.mark}</span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink">{option.label}</span><span className="block truncate text-[10px] text-ink-faint">{option.hint}</span></span>
                      {selected && <IconCheck size={16} className="shrink-0 text-brand" />}
                    </button>;
                  })}
                </div>}
              </div>
              <div className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-3">
                {CHANNELS.map((option) => {
                  const ActiveIcon = option.icon;
                  const selected = channel === option.id;
                  return <button key={option.id} type="button" aria-pressed={selected}
                    onClick={() => chooseChannel(option.id)}
                    className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-left transition ${selected ? "border-brand bg-brand-soft/60 ring-1 ring-brand/20" : "border-line-soft bg-card hover:border-brand/40"}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${option.tone}`}>
                      {ActiveIcon ? <ActiveIcon size={17} /> : option.mark}
                    </span>
                    <span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-ink">{option.label}</span><span className="mt-0.5 block truncate text-[9px] text-ink-faint">{option.hint}</span></span>
                  </button>;
                })}
              </div>
            </fieldset>

            {tab === "account" && (
              <Field label="Destination account">
                <Select
                  aria-label="Destination account"
                  required
                  value={destId || ""}
                  onChange={(e) => setDestId(Number(e.target.value))}
                >
                  <option value="" disabled>Choose an account</option>
                  {destinations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.currency}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Transfers are instant between matching currencies.
                </p>
              </Field>
            )}

            {tab === "payee" && (
              <Field label="Saved recipient">
                <div className="mb-2 flex justify-end"><button type="button" className="text-[11px] font-semibold text-brand underline" onClick={() => { setTab("new_recipient"); setDestId(0); }}>Enter new details</button></div>
                {payeeError ? (
                  <p className="text-xs text-rose">
                    {payeeError}
                    <button type="button" className="ml-2 underline" onClick={() => void loadPayees()}>
                      Retry
                    </button>
                  </p>
                ) : !payees ? (
                  <p className="flex gap-2 text-xs text-ink-faint">
                    <IconSpinner size={14} />Loading payees…
                  </p>
                ) : (
                  <>
                    <Select
                      aria-label="Payee"
                      required
                      value={destId || ""}
                      onChange={(e) => setDestId(Number(e.target.value))}
                    >
                      <option value="" disabled>{payees.length ? "Choose a recipient" : "No saved payees"}</option>
                      {payees.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.methodDetail}
                        </option>
                      ))}
                    </Select>
                    {!payees.length && (
                      <p className="mt-1 text-xs text-ink-faint">
                        Tip: You can select "New recipient" above to pay anyone directly!
                      </p>
                    )}
                  </>
                )}
                {channel === "person" && <div className="mt-3 grid gap-2 border-t border-line-soft pt-3">
                  <Field label="Bank name"><Input required placeholder="Recipient bank" value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)} /></Field>
                  <Field label="Routing number"><Input required inputMode="numeric" maxLength={9} placeholder="9 digits" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))} /></Field>
                  <Field label="Account number"><Input required inputMode="numeric" placeholder="Recipient account number" value={recipientAccountNo} onChange={(e) => setRecipientAccountNo(e.target.value)} /></Field>
                </div>}
              </Field>
            )}

            {tab === "new_recipient" && (
              <div className="space-y-3 rounded-xl border border-line-soft bg-paper/50 p-3.5">
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-ink-soft">{channelInfo.label} details</p>
                  {channel === "person" && <button type="button" className="text-[11px] font-semibold text-brand underline" onClick={() => { setTab("payee"); setDestId(0); }}>Choose saved payee</button>}
                  {tab === "payee" && <button type="button" className="text-[11px] font-semibold text-brand underline" onClick={() => { setTab("new_recipient"); setDestId(0); }}>Enter new details</button>}
                </div>
                <Field label="Recipient Full Name">
                  <Input
                    required
                    placeholder={channel === "crypto" ? "Wallet owner" : "Recipient name"}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </Field>
                {channel === "person" ? <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Bank name"><Input required placeholder="Recipient bank" value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)} /></Field>
                    <Field label="Routing number"><Input required inputMode="numeric" maxLength={9} placeholder="9 digits" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))} /></Field>
                  </div>
                  <Field label="Account number"><Input required inputMode="numeric" placeholder="Recipient account number" value={recipientAccountNo} onChange={(e) => setRecipientAccountNo(e.target.value)} /></Field>
                </> : <div className="grid gap-2 sm:grid-cols-2">
                  <Field label={channel === "cashapp" ? "Cash App tag" : channel === "zelle" ? "Email or phone number" : channel === "paypal" ? "PayPal email or phone" : channel === "crypto" ? "Wallet address" : "Account Number / IBAN"}>
                    <Input required placeholder={channel === "cashapp" ? "$cashtag" : channel === "crypto" ? "Wallet address" : channel === "zelle" || channel === "paypal" ? "name@example.com or phone" : "Account number or IBAN"} value={recipientAccountNo} onChange={(e) => setRecipientAccountNo(e.target.value)} />
                  </Field>
                  {["external_bank", "wire", "international"].includes(channel) && <Field label={channel === "international" ? "Recipient bank" : "Bank name"}><Input placeholder="Bank name" value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)} /></Field>}
                </div>}
                {channel === "international" && <div className="grid gap-2 sm:grid-cols-2"><Field label="Recipient country"><Input required value={recipientCountry} onChange={(e) => setRecipientCountry(e.target.value)} placeholder="Country" /></Field><Field label="SWIFT/BIC (optional)"><Input value={swiftCode} onChange={(e) => setSwiftCode(e.target.value.toUpperCase())} placeholder="Bank SWIFT/BIC" /></Field></div>}
                {channel === "wire" && <Field label="SWIFT/BIC"><Input required value={swiftCode} onChange={(e) => setSwiftCode(e.target.value.toUpperCase())} placeholder="Bank SWIFT/BIC" /></Field>}
                {["external_bank", "wire", "international"].includes(channel) && <label className="flex items-center gap-2 pt-1 text-xs text-ink-soft cursor-pointer">
                  <input type="checkbox" checked={saveAsPayee} onChange={(e) => setSaveAsPayee(e.target.checked)} className="rounded border-line text-brand focus:ring-brand" />
                  <span>Save this recipient for later</span>
                </label>}
                <p className="rounded-lg bg-amber/10 px-3 py-2 text-[10px] leading-relaxed text-ink-soft">Demo only: this app does not connect to external bank, wallet, or payment networks. These details are recorded as simulated activity and are not sent to a provider.</p>
              </div>
            )}

            <Field label={`Amount (${source?.currency ?? user.currency})`}>
              <Input
                aria-label="Transfer amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>

            <Field label={channel === "person" ? "Reference" : "Payment reference / Note (optional)"}>
              <Input
                value={note}
                required={channel === "person"}
                maxLength={140}
                onChange={(e) => setNote(e.target.value)}
                placeholder={channel === "person" ? "Payment reference" : "e.g. Invoice #402, Gift, Dinner"}
              />
            </Field>
          </>
        ) : (
          <>
            <div className="rounded-xl bg-brand-soft/50 p-5 text-center">
              <BankIcon name="arrow" size={24} className="mx-auto mb-2 text-brand" />
              <p className="font-display text-3xl font-semibold">
                {money(cents ?? 0, source?.currency)}
              </p>
              <p className="mt-2 text-sm text-brand-deep">{channelInfo.label} · {destName}</p>
            </div>

            <dl className="space-y-2.5 text-xs">
              {[
                ["Source account", `${source?.name} (${source?.accountNumber})`],
                ["Recipient", destName],
                ["Transfer type", channelInfo.label],
                ...(channel === "person" ? [["Bank name", recipientBank], ["Routing number", routingNumber], ["Account number", recipientAccountNo]] : []),
                ["Processing", tab === "account" ? "Instant demo transfer" : "Demo only — not sent externally"],
                ["Fee", "No fee in this demo"],
                ["Reference note", note || "None"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-line-soft pb-2">
                  <dt className="text-ink-faint">{label}</dt>
                  <dd className="font-semibold text-ink text-right">{val}</dd>
                </div>
              ))}
            </dl>

            {user.hasTransactionPin && (
              <div className="pt-2">
                <Field label="Enter Authorization PIN" hint="Your 4-digit authorization PIN is required to approve this transfer.">
                  <div className="relative">
                    <Input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      inputMode="numeric"
                      required
                      autoFocus
                      placeholder="••••"
                      value={transactionPin}
                      onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, ""))}
                      className="pr-10 font-mono tracking-widest text-center text-lg"
                    />
                    <IconKey size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  </div>
                </Field>
              </div>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-rose-soft p-3 text-xs text-rose font-medium">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="btn-outline flex-1"
            disabled={busy}
            onClick={() => (review ? setReview(false) : onClose())}
          >
            {review ? "Back" : "Cancel"}
          </button>
          <button disabled={busy || !source || user.status !== "active" || !user.hasTransactionPin} className="btn-primary flex-1">
            {busy && <IconSpinner size={15} />}
            {review ? "Authorize & Send" : "Review Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
