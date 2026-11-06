"use client";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client";
import { isTermLocked, parseAmount } from "@/lib/banking";
import type { AccountDTO, PayeeDTO } from "@/lib/queries";
import { money } from "@/lib/format";
import { useCurrentUser } from "../CurrencyContext";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { IconClock, IconSpinner, IconPlus, IconKey } from "../icons";
import { BankIcon } from "../banking/BankIcon";

export function NewTransferModal({ accounts, open, onClose, onDone }: { accounts: AccountDTO[]; open: boolean; onClose: () => void; onDone?: () => void }) {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [sourceId, setSourceId] = useState(0);
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
  const [saveAsPayee, setSaveAsPayee] = useState(true);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);

  const eligible = accounts.filter((a) => !a.closedAt && !isTermLocked(a));

  useEffect(() => {
    if (open) {
      setSourceId(accounts.find((a) => !a.closedAt && !isTermLocked(a))?.id ?? 0);
      setTab("account");
      setDestId(0);
      setAmount("");
      setNote("");
      setTransactionPin("");
      setRecipientName("");
      setRecipientAccountNo("");
      setRecipientBank("");
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
    if (tab === "account" && !destId) return setError("Choose a destination account.");
    if (tab === "payee" && !destId) return setError("Choose a saved payee.");
    if (tab === "new_recipient") {
      if (!recipientName.trim()) return setError("Recipient full name is required.");
      if (!recipientAccountNo.trim()) return setError("Recipient Account Number / IBAN is required.");
    }

    if (!cents || cents <= 0) return setError("Enter a valid positive amount.");
    if (cents > source.balanceCents) return setError(`Available balance is ${money(source.balanceCents, source.currency)}.`);

    if (!review) {
      setReview(true);
      return;
    }

    if (user.hasTransactionPin && !transactionPin) {
      return setError("Please enter your 4-digit transaction PIN.");
    }

    setBusy(true);
    try {
      const payload: any = {
        sourceAccountId: sourceId,
        destinationType: tab,
        amount,
        note: note.trim() || null,
        transactionPin: transactionPin || undefined,
      };

      if (tab === "account" || tab === "payee") {
        payload.destinationId = destId;
      } else {
        payload.recipientName = recipientName.trim();
        payload.recipientAccountNo = recipientAccountNo.trim();
        payload.recipientBank = recipientBank.trim() || undefined;
        payload.saveAsPayee = saveAsPayee;
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
      subtitle={review ? "Check every detail before you confirm." : "Transfer between accounts, saved payees, or to any recipient."}
    >
      <form onSubmit={submit} className="space-y-4">
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

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-paper p-1">
              {(
                [
                  ["account", "My account"],
                  ["payee", "Saved payee"],
                  ["new_recipient", "New recipient"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-md p-2 text-xs font-semibold ${
                    tab === value ? "bg-card shadow-sm text-brand font-bold" : "text-ink-faint"
                  }`}
                  onClick={() => {
                    setTab(value);
                    setDestId(0);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

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
              </Field>
            )}

            {tab === "new_recipient" && (
              <div className="space-y-3 rounded-xl border border-line-soft bg-paper/50 p-3.5">
                <p className="text-xs font-semibold text-ink-soft">Recipient Banking Details</p>
                <Field label="Recipient Full Name">
                  <Input
                    required
                    placeholder="e.g. Elena Rostova"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Account Number / IBAN">
                    <Input
                      required
                      placeholder="e.g. MR20000100019283..."
                      value={recipientAccountNo}
                      onChange={(e) => setRecipientAccountNo(e.target.value)}
                    />
                  </Field>
                  <Field label="Bank Name (optional)">
                    <Input
                      placeholder="e.g. Standard Chartered"
                      value={recipientBank}
                      onChange={(e) => setRecipientBank(e.target.value)}
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 pt-1 text-xs text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsPayee}
                    onChange={(e) => setSaveAsPayee(e.target.checked)}
                    className="rounded border-line text-brand focus:ring-brand"
                  />
                  <span>Save to my Payees for quick transfers in future</span>
                </label>
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

            <Field label="Payment reference / Note (optional)">
              <Input
                value={note}
                maxLength={140}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Invoice #402, Gift, Dinner"
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
              <p className="mt-2 text-sm text-brand-deep">To {destName}</p>
            </div>

            <dl className="space-y-2.5 text-xs">
              {[
                ["Source account", `${source?.name} (${source?.accountNumber})`],
                ["Recipient", destName],
                ["Transfer speed", tab === "account" ? "Instant transfer" : "Standard secure network"],
                ["Fee", "Free ($0.00)"],
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
                <Field label="Enter Transaction PIN" hint="Your secure 4-digit transfer PIN is required to authorize this debit.">
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
          <button disabled={busy || !source || user.status !== "active"} className="btn-primary flex-1">
            {busy && <IconSpinner size={15} />}
            {review ? "Authorize & Send" : "Review Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
