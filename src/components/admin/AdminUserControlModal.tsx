"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/client";
import { money, fmtDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  IconPlus,
  IconShield,
  IconKey,
  IconClock,
  IconCheck,
  IconX,
  IconSpinner,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { BankIcon } from "@/components/banking/BankIcon";

export function AdminUserControlModal({
  userId,
  userName,
  open,
  onClose,
  onRefresh,
}: {
  userId: number | null;
  userName?: string;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "add_tx" | "issue_card" | "manage_card" | "accounts" | "security">("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 1. Transaction creation state
  const [txAccountId, setTxAccountId] = useState("");
  const [txKind, setTxKind] = useState("credit");
  const [txCategory, setTxCategory] = useState("Salary");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txStatus, setTxStatus] = useState("completed");
  const [txNote, setTxNote] = useState("");
  const [txAdjustBalance, setTxAdjustBalance] = useState(true);

  // 2. Card issuing state
  const [cardAccountId, setCardAccountId] = useState("");
  const [cardName, setCardName] = useState("Meridian Debit");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardKind, setCardKind] = useState<"virtual" | "physical">("virtual");
  const [cardExpiryMonth, setCardExpiryMonth] = useState("12");
  const [cardExpiryYear, setCardExpiryYear] = useState(String(new Date().getFullYear() + 3));
  const [cardPin, setCardPin] = useState("");
  const [cardStatus, setCardStatus] = useState("active");
  const [cardDailyLimit, setCardDailyLimit] = useState("2000");
  const [cardMonthlyLimit, setCardMonthlyLimit] = useState("10000");
  const [cardOnline, setCardOnline] = useState(true);
  const [cardIntl, setCardIntl] = useState(true);
  const [cardAtm, setCardAtm] = useState(true);

  // 3. Card editing state
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [editCardPin, setEditCardPin] = useState("");

  // 4. Create Account state
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("checking");
  const [newAccCurrency, setNewAccCurrency] = useState("USD");
  const [newAccAmount, setNewAccAmount] = useState("0");

  // 5. Security override state
  const [secLock, setSecLock] = useState(false);
  const [sec2FA, setSec2FA] = useState(false);
  const [secPin, setSecPin] = useState("");
  const [secNewPassword, setSecNewPassword] = useState("");

  const loadUserData = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiJson<any>(`/api/admin/impersonate/data?userId=${userId}`);
      setData(res);
      if (res.accounts.length) {
        setTxAccountId(String(res.accounts[0].id));
        setCardAccountId(String(res.accounts[0].id));
        setNewAccCurrency(res.user.currency);
      }
      setCardHolder(res.user.name.toUpperCase());
      setSecLock(Boolean(res.user.accountLocked || res.user.status === "suspended"));
      setSec2FA(Boolean(res.user.twoFactorEnabled));
      if (res.cards.length) {
        setSelectedCardId(res.cards[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load user records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      setActiveTab("overview");
      // Set current datetime for transaction maker
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setTxDate(now.toISOString().slice(0, 16));
      loadUserData();
    }
  }, [open, userId]);

  // Card Number Generator Helper for Admins
  const generatePresetCard = (brand: "visa" | "mastercard" | "amex") => {
    let prefix = "4";
    let len = 16;
    if (brand === "mastercard") prefix = "53";
    if (brand === "amex") { prefix = "37"; len = 15; }

    let num = prefix;
    while (num.length < len) {
      num += Math.floor(Math.random() * 10);
    }
    setCardNumber(num);
  };

  // Submit: Admin Transaction
  const handlePostTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiJson("/api/admin/transactions", {
        method: "POST",
        body: JSON.stringify({
          userId,
          accountId: Number(txAccountId),
          kind: txKind,
          category: txCategory,
          description: txDescription,
          amount: txAmount,
          customDate: txDate ? new Date(txDate).toISOString() : new Date().toISOString(),
          status: txStatus,
          note: txNote,
          adjustBalance: txAdjustBalance,
        }),
      });
      toast("success", "Transaction posted to customer ledger.");
      setTxDescription("");
      setTxAmount("");
      loadUserData();
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Could not post transaction.");
    } finally {
      setBusy(false);
    }
  };

  // Submit: Admin Card Issue
  const handleIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiJson("/api/admin/cards", {
        method: "POST",
        body: JSON.stringify({
          userId,
          accountId: Number(cardAccountId),
          name: cardName,
          holderName: cardHolder,
          cardNumber,
          kind: cardKind,
          expiryMonth: Number(cardExpiryMonth),
          expiryYear: Number(cardExpiryYear),
          pin: cardPin || undefined,
          status: cardStatus,
          dailyLimitCents: (Number(cardDailyLimit) || 1000) * 100,
          monthlyLimitCents: (Number(cardMonthlyLimit) || 5000) * 100,
          onlineEnabled: cardOnline,
          internationalEnabled: cardIntl,
          atmEnabled: cardAtm,
        }),
      });
      toast("success", `Custom card ending in •••• ${cardNumber.slice(-4)} issued.`);
      setCardNumber("");
      setCardPin("");
      loadUserData();
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to issue card.");
    } finally {
      setBusy(false);
    }
  };

  // Submit: Admin Card Update (Freeze, PIN, Lock)
  const handleUpdateCardSettings = async (cardId: number, patch: any) => {
    setBusy(true);
    try {
      await apiJson(`/api/admin/cards/${cardId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      toast("success", "Card controls updated by administrator.");
      loadUserData();
      onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Failed to update card.");
    } finally {
      setBusy(false);
    }
  };

  // Submit: Create Account for User
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiJson("/api/admin/impersonate/action", {
        method: "POST",
        body: JSON.stringify({
          action: "create_account",
          userId,
          name: newAccName,
          type: newAccType,
          currency: newAccCurrency,
          amount: newAccAmount,
        }),
      });
      toast("success", "New account provisioned on user's behalf.");
      setNewAccName("");
      setNewAccAmount("0");
      loadUserData();
      onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Failed to create account.");
    } finally {
      setBusy(false);
    }
  };

  // Submit: Security Override
  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiJson("/api/admin/impersonate/action", {
        method: "POST",
        body: JSON.stringify({
          action: "update_security",
          userId,
          accountLocked: secLock,
          twoFactorEnabled: sec2FA,
          transactionPin: secPin || undefined,
          password: secNewPassword || undefined,
        }),
      });
      toast("success", "Security settings updated.");
      setSecPin("");
      setSecNewPassword("");
      loadUserData();
      onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Failed to update security.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Admin Control Center: ${userName || data?.user?.name || "User"}`}
      subtitle="Perform administrative overrides, post custom transactions, issue custom cards, and manage balances."
      maxW="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-line pb-2">
          {[
            ["overview", "Overview & Accounts"],
            ["add_tx", "Post Transaction (Custom Date)"],
            ["issue_card", "Issue Custom Card"],
            ["manage_card", "Manage User Cards"],
            ["accounts", "Open Account"],
            ["security", "Security Overrides"],
          ].map(([tabKey, label]) => (
            <button
              key={tabKey}
              onClick={() => {
                setError("");
                setActiveTab(tabKey as any);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === tabKey
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink-soft hover:bg-paper hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <IconSpinner size={24} className="text-brand" />
          </div>
        ) : (
          <div>
            {error && (
              <p className="mb-4 rounded-lg bg-rose-soft p-3 text-xs font-medium text-rose">
                {error}
              </p>
            )}

            {/* TAB 1: OVERVIEW & ACCOUNTS */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="card p-4 bg-paper/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Status</p>
                    <p className="mt-1 text-sm font-bold capitalize text-ink flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${data?.user?.status === "active" ? "bg-good" : "bg-rose"}`} />
                      {data?.user?.status}
                    </p>
                  </div>
                  <div className="card p-4 bg-paper/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Default Currency</p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {data?.user?.currency} · {data?.user?.region}
                    </p>
                  </div>
                  <div className="card p-4 bg-paper/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Cards Active</p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {data?.cards?.length || 0} Card{data?.cards?.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-sm mb-2">Live Accounts & Balances</h3>
                  <div className="divide-y divide-line-soft card overflow-hidden">
                    {data?.accounts?.map((acc: any) => (
                      <div key={acc.id} className="flex items-center justify-between p-3.5 text-xs">
                        <div>
                          <p className="font-bold text-ink">{acc.name} <span className="font-normal text-ink-faint capitalize">({acc.type})</span></p>
                          <p className="font-mono text-[11px] text-ink-faint">{acc.accountNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold text-sm text-ink">{money(acc.balanceCents, acc.currency)}</p>
                          <p className="text-[10px] text-ink-faint uppercase">{acc.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-sm mb-2">Recent Transactions</h3>
                  <div className="divide-y divide-line-soft card overflow-hidden max-h-48 overflow-y-auto text-xs">
                    {data?.transactions?.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-semibold text-ink">{t.description}</p>
                          <p className="text-[10px] text-ink-faint">{fmtDateTime(t.occurredAt)} · {t.reference}</p>
                        </div>
                        <span className={`font-mono font-bold ${t.kind === "credit" ? "text-good" : "text-ink"}`}>
                          {t.kind === "credit" ? "+" : "-"}{money(t.amountCents, t.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: POST TRANSACTION (WITH CUSTOM DATE & TIME) */}
            {activeTab === "add_tx" && (
              <form onSubmit={handlePostTransaction} className="space-y-3 card p-4">
                <div className="rounded-lg bg-amber-soft p-3 text-xs text-amber font-medium">
                  <strong>Administrator Transaction Override:</strong> Choose any historical, present, or future timestamp. You can credit or debit directly.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Target Account">
                    <Select
                      value={txAccountId}
                      onChange={(e) => setTxAccountId(e.target.value)}
                      required
                      className="text-xs"
                    >
                      {data?.accounts?.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency}) - {money(a.balanceCents, a.currency)}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Transaction Type">
                    <Select
                      value={txKind}
                      onChange={(e) => setTxKind(e.target.value)}
                      className="text-xs"
                    >
                      <option value="credit">Credit (Money In / Deposit)</option>
                      <option value="debit">Debit (Money Out / Withdrawal)</option>
                      <option value="payment">Payment</option>
                      <option value="transfer_in">Transfer In</option>
                      <option value="transfer_out">Transfer Out</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Amount">
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="text-xs"
                    />
                  </Field>

                  <Field label="Category">
                    <Input
                      placeholder="e.g. Wire Deposit, Salary, Refund"
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="text-xs"
                    />
                  </Field>

                  <Field label="Status">
                    <Select
                      value={txStatus}
                      onChange={(e) => setTxStatus(e.target.value)}
                      className="text-xs"
                    >
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="voided">Voided / Failed</option>
                    </Select>
                  </Field>
                </div>

                {/* Exact Date & Time Picker */}
                <Field label="Custom Date & Timestamp" hint="Pick any date/time in the past or future for this entry.">
                  <Input
                    required
                    type="datetime-local"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="text-xs font-mono"
                  />
                </Field>

                <Field label="Description / Merchant">
                  <Input
                    required
                    placeholder="e.g. International Inward Remittance / Federal Treasury"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="text-xs"
                  />
                </Field>

                <Field label="Internal Admin Note (optional)">
                  <Input
                    placeholder="e.g. Approved per support ticket #48102"
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                    className="text-xs"
                  />
                </Field>

                <label className="flex items-center gap-2 pt-1 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={txAdjustBalance}
                    onChange={(e) => setTxAdjustBalance(e.target.checked)}
                    className="rounded border-line text-brand focus:ring-brand"
                  />
                  <span className="font-medium">Directly adjust account balance (increase or decrease funds)</span>
                </label>

                <button disabled={busy} className="btn-primary w-full py-2.5 text-xs font-semibold">
                  {busy ? <IconSpinner size={14} /> : "Post Transaction to Ledger"}
                </button>
              </form>
            )}

            {/* TAB 3: ISSUE CUSTOM CARD (ANY CARD NUMBER, VISA/MC/AMEX) */}
            {activeTab === "issue_card" && (
              <form onSubmit={handleIssueCard} className="space-y-3 card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-2">
                  <p className="text-xs font-bold text-ink">Card Quick Presets:</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => generatePresetCard("visa")}
                      className="btn-outline py-1 px-2.5 text-[11px]"
                    >
                      Generate Visa
                    </button>
                    <button
                      type="button"
                      onClick={() => generatePresetCard("mastercard")}
                      className="btn-outline py-1 px-2.5 text-[11px]"
                    >
                      Generate Mastercard
                    </button>
                    <button
                      type="button"
                      onClick={() => generatePresetCard("amex")}
                      className="btn-outline py-1 px-2.5 text-[11px]"
                    >
                      Generate Amex
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Link to Account">
                    <Select
                      value={cardAccountId}
                      onChange={(e) => setCardAccountId(e.target.value)}
                      required
                      className="text-xs"
                    >
                      {data?.accounts?.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency}) - {money(a.balanceCents, a.currency)}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Card Format">
                    <Select
                      value={cardKind}
                      onChange={(e) => setCardKind(e.target.value as any)}
                      className="text-xs"
                    >
                      <option value="virtual">Virtual Card</option>
                      <option value="physical">Physical Card (Embossed)</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Custom Card Number (12-19 Digits)" hint="Type any custom card number or click a generator above.">
                    <Input
                      required
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                      className="font-mono text-xs tracking-wider"
                    />
                  </Field>

                  <Field label="Cardholder Name">
                    <Input
                      required
                      placeholder="FIRSTNAME LASTNAME"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="text-xs uppercase font-mono"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Field label="Expiry Month">
                    <Select value={cardExpiryMonth} onChange={(e) => setCardExpiryMonth(e.target.value)} className="text-xs font-mono">
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Expiry Year">
                    <Select value={cardExpiryYear} onChange={(e) => setCardExpiryYear(e.target.value)} className="text-xs font-mono">
                      {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i)).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Set 4-Digit PIN (optional)">
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value.replace(/\D/g, ""))}
                      className="text-xs font-mono text-center tracking-widest"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Daily Limit ($ / Currency)">
                    <Input
                      value={cardDailyLimit}
                      onChange={(e) => setCardDailyLimit(e.target.value)}
                      className="text-xs"
                    />
                  </Field>
                  <Field label="Monthly Limit">
                    <Input
                      value={cardMonthlyLimit}
                      onChange={(e) => setCardMonthlyLimit(e.target.value)}
                      className="text-xs"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-4 text-xs pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={cardOnline} onChange={(e) => setCardOnline(e.target.checked)} />
                    Online Payments
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={cardIntl} onChange={(e) => setCardIntl(e.target.checked)} />
                    International Payments
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={cardAtm} onChange={(e) => setCardAtm(e.target.checked)} />
                    ATM Withdrawals
                  </label>
                </div>

                <button disabled={busy} className="btn-primary w-full py-2.5 text-xs font-semibold">
                  {busy ? <IconSpinner size={14} /> : "Issue Custom Card for Customer"}
                </button>
              </form>
            )}

            {/* TAB 4: MANAGE USER CARDS (LOCK, FREEZE, PIN OVERRIDE) */}
            {activeTab === "manage_card" && (
              <div className="space-y-4">
                {data?.cards?.length === 0 ? (
                  <p className="card p-6 text-center text-xs text-ink-faint">No cards currently issued to this user.</p>
                ) : (
                  <div className="space-y-3">
                    {data?.cards?.map((c: any) => (
                      <div key={c.id} className="card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <BankIcon name="card" size={16} className="text-brand" />
                            <p className="font-bold text-ink">{c.name} (•••• {c.last4})</p>
                            <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold uppercase">{c.kind}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                              c.status === "active" ? "bg-good-soft text-good" : "bg-rose-soft text-rose"
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <p className="text-ink-faint mt-1">
                            Expires: {String(c.expiryMonth).padStart(2, "0")}/{c.expiryYear} · Cardholder: {c.holderName}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.status === "active" ? (
                            <button
                              onClick={() => handleUpdateCardSettings(c.id, { status: "frozen" })}
                              className="btn-outline py-1 px-2.5 text-[11px] text-amber hover:bg-amber-soft"
                            >
                              Freeze Card
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateCardSettings(c.id, { status: "active" })}
                              className="btn-outline py-1 px-2.5 text-[11px] text-good hover:bg-good-soft"
                            >
                              Unfreeze Card
                            </button>
                          )}

                          <button
                            onClick={() => {
                              const newPin = prompt(`Enter new 4-digit PIN for card ending in •••• ${c.last4}:`);
                              if (newPin && /^\d{4}$/.test(newPin)) {
                                handleUpdateCardSettings(c.id, { pin: newPin });
                              } else if (newPin !== null) {
                                alert("PIN must be 4 digits.");
                              }
                            }}
                            className="btn-outline py-1 px-2.5 text-[11px]"
                          >
                            Set PIN
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Permanently lock and disable card ending in ${c.last4}?`)) {
                                handleUpdateCardSettings(c.id, { status: "closed" });
                              }
                            }}
                            className="rounded-lg px-2.5 py-1 text-[11px] text-rose hover:bg-rose-soft"
                          >
                            Lock / Terminate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: OPEN NEW ACCOUNT FOR USER */}
            {activeTab === "accounts" && (
              <form onSubmit={handleCreateAccount} className="space-y-3 card p-4">
                <Field label="Account Nickname">
                  <Input
                    required
                    placeholder="e.g. High-Yield Wealth Reserve"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="text-xs"
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Account Type">
                    <Select
                      value={newAccType}
                      onChange={(e) => setNewAccType(e.target.value)}
                      className="text-xs"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="foreign_currency">Foreign Currency</option>
                      <option value="fixed_deposit">Fixed Deposit</option>
                    </Select>
                  </Field>

                  <Field label="Currency">
                    <Select
                      value={newAccCurrency}
                      onChange={(e) => setNewAccCurrency(e.target.value)}
                      className="text-xs"
                    >
                      {["USD", "EUR", "GBP", "NGN", "KES", "CAD", "AUD", "JPY"].map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Initial Balance">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newAccAmount}
                      onChange={(e) => setNewAccAmount(e.target.value)}
                      className="text-xs"
                    />
                  </Field>
                </div>

                <button disabled={busy} className="btn-primary w-full py-2.5 text-xs font-semibold">
                  {busy ? <IconSpinner size={14} /> : "Create Account on User's Behalf"}
                </button>
              </form>
            )}

            {/* TAB 6: SECURITY OVERRIDES */}
            {activeTab === "security" && (
              <form onSubmit={handleUpdateSecurity} className="space-y-3 card p-4">
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-lg border border-line bg-paper/50 cursor-pointer text-xs">
                    <div>
                      <p className="font-bold text-ink">Account Freeze / Lock</p>
                      <p className="text-ink-faint text-[11px]">Suspend or restore all banking access for this user.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={secLock}
                      onChange={(e) => setSecLock(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-brand"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-line bg-paper/50 cursor-pointer text-xs">
                    <div>
                      <p className="font-bold text-ink">Two-Factor Authentication (2FA)</p>
                      <p className="text-ink-faint text-[11px]">Enforce or clear 2FA requirement on login.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={sec2FA}
                      onChange={(e) => setSec2FA(e.target.checked)}
                      className="h-4 w-4 rounded border-line text-brand"
                    />
                  </label>

                  <Field label="Override Transaction PIN (4 Digits)" hint="Leave blank to preserve current PIN.">
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={secPin}
                      onChange={(e) => setSecPin(e.target.value.replace(/\D/g, ""))}
                      className="text-xs font-mono tracking-widest text-center"
                    />
                  </Field>

                  <Field label="Reset Password on User's Behalf" hint="Set a new password immediately (min 8 characters).">
                    <Input
                      type="password"
                      placeholder="New password for user"
                      value={secNewPassword}
                      onChange={(e) => setSecNewPassword(e.target.value)}
                      className="text-xs"
                    />
                  </Field>
                </div>

                <button disabled={busy} className="btn-primary w-full py-2.5 text-xs font-semibold">
                  {busy ? <IconSpinner size={14} /> : "Apply Security Credentials"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
