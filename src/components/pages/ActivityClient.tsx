"use client";

import { apiFetch } from "@/lib/client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountDTO, TransactionDTO } from "@/lib/queries";
import {
  CATEGORIES,
  dayKey,
  dayLabel,
  fmtDateTime,
  money,
  moneySigned,
} from "@/lib/format";
import { useToast } from "../ui/Toast";
import { RowSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { CategoryPill, StatusBadge } from "../ui/Badge";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconSearch,
  IconSwap,
  IconX,
  IconShare,
  IconClock,
  IconInfo,
  IconCheck,
} from "../icons";
import { BankIcon } from "../banking/BankIcon";

const dirOf = (t: TransactionDTO): "in" | "out" =>
  t.kind === "credit" || t.kind === "transfer_in" ? "in" : "out";

export function ActivityClient() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<{
    transactions: TransactionDTO[];
    accounts: AccountDTO[];
  } | null>(null);

  const [loadErr, setLoadErr] = useState(false);
  const [q, setQ] = useState("");
  const [accId, setAccId] = useState(0);
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [voidingId, setVoidingId] = useState<number | null>(null);
  const [savingCatId, setSavingCatId] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const load = () => {
    setLoadErr(false);
    apiFetch("/api/transactions", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setLoadErr(true));
  };

  useEffect(load, []);

  const selected = data?.transactions.find((t) => t.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();

    return data.transactions.filter((t) => {
      if (accId && t.accountId !== accId) return false;
      if (dir !== "all" && dirOf(t) !== dir) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;

      if (startDate) {
        const itemDate = t.occurredAt.slice(0, 10);
        if (itemDate < startDate) return false;
      }

      if (endDate) {
        const itemDate = t.occurredAt.slice(0, 10);
        if (itemDate > endDate) return false;
      }

      if (needle) {
        const hay = [
          t.description,
          t.category,
          t.payeeName ?? "",
          t.accountName ?? "",
          t.note ?? "",
          `TXN-${String(t.id).padStart(8, "0")}`,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, accId, dir, statusFilter, categoryFilter, startDate, endDate]);

  const groups = useMemo(() => {
    const m = new Map<string, TransactionDTO[]>();
    for (const t of filtered) {
      const k = dayKey(t.occurredAt);
      const arr = m.get(k);
      if (arr) arr.push(t);
      else m.set(k, [t]);
    }
    return [...m.entries()];
  }, [filtered]);

  const voidTx = async (t: TransactionDTO) => {
    setVoidingId(t.id);
    const prevStatus = t.status;
    setData((d) =>
      d
        ? {
            ...d,
            transactions: d.transactions.map((x) =>
              x.id === t.id ? { ...x, status: "voided" as const } : x
            ),
          }
        : d
    );
    try {
      const res = await apiFetch(`/api/transactions/${t.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't void the payment.");
      toast(
        "success",
        `Payment voided — ${money(t.amountCents, t.currency)} returned to ${t.accountName ?? "your account"}.`
      );
      router.refresh();
    } catch (e) {
      setData((d) =>
        d
          ? {
              ...d,
              transactions: d.transactions.map((x) =>
                x.id === t.id ? { ...x, status: prevStatus } : x
              ),
            }
          : d
      );
      toast("error", e instanceof Error ? e.message : "Couldn't void the payment.");
    } finally {
      setVoidingId(null);
    }
  };

  const recategorize = async (t: TransactionDTO, category: string) => {
    setSavingCatId(t.id);
    const prev = t.category;
    setData((d) =>
      d
        ? {
            ...d,
            transactions: d.transactions.map((x) =>
              x.id === t.id ? { ...x, category } : x
            ),
          }
        : d
    );
    try {
      const res = await apiFetch(`/api/transactions/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't update the category.");
      toast("success", `Recategorized as ${category}.`);
    } catch (e) {
      setData((d) =>
        d
          ? {
              ...d,
              transactions: d.transactions.map((x) =>
                x.id === t.id ? { ...x, category: prev } : x
              ),
            }
          : d
      );
      toast("error", e instanceof Error ? e.message : "Couldn't update the category.");
    } finally {
      setSavingCatId(null);
    }
  };

  const downloadReceipt = async (t: TransactionDTO) => {
    setDownloadingPdf(true);
    try {
      const res = await apiFetch(`/api/transactions/${t.id}/receipt?format=pdf`);
      if (!res.ok) throw new Error("Could not generate receipt PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt-TXN-${String(t.id).padStart(8, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 20000);
      toast("success", "Official receipt PDF downloaded.");
    } catch (err) {
      toast("error", "Failed to download receipt.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const shareReceipt = (t: TransactionDTO) => {
    const text = `Meridian Bank Transaction Receipt\nRef: TXN-${String(t.id).padStart(8, "0")}\nAmount: ${money(t.amountCents, t.currency)}\nDate: ${fmtDateTime(t.occurredAt)}\nMerchant/Description: ${t.description}\nStatus: ${t.status.toUpperCase()}`;
    if (navigator.share) {
      navigator.share({ title: `Transaction Receipt #${t.id}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast("success", "Receipt summary copied to clipboard.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Transaction Management
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Search, filter, view references and download official receipts for all activity.
          </p>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="card mb-4 p-4 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reference, merchant, note, or ID…"
              className="input pl-9"
            />
          </div>
          <select
            value={accId}
            onChange={(e) => setAccId(Number(e.target.value))}
            className="input sm:w-48"
            aria-label="Filter by account"
          >
            <option value={0}>All accounts</option>
            {(data?.accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
          <select
            value={dir}
            onChange={(e) => setDir(e.target.value as "all" | "in" | "out")}
            className="input sm:w-36"
            aria-label="Filter by direction"
          >
            <option value="all">Money flow</option>
            <option value="in">Income (+)</option>
            <option value="out">Expense (-)</option>
          </select>
        </div>

        {/* Extended filters row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input py-1.5 text-xs"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input py-1.5 text-xs"
            >
              <option value="all">All status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="voided">Voided / Failed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input py-1.5 text-xs"
            />
          </div>
        </div>

        {(q || accId || dir !== "all" || statusFilter !== "all" || categoryFilter !== "all" || startDate || endDate) && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-ink-soft font-medium">
              Found {filtered.length} matching transaction{filtered.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => {
                setQ("");
                setAccId(0);
                setDir("all");
                setStatusFilter("all");
                setCategoryFilter("all");
                setStartDate("");
                setEndDate("");
              }}
              className="text-rose hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {loadErr ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-rose">
              Couldn't load your activity.
            </p>
            <button className="btn-outline mt-4" onClick={load}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="divide-y divide-line-soft">
            {Array.from({ length: 8 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon={<IconSearch size={20} />}
            title={data.transactions.length === 0 ? "No activity yet" : "Nothing matches your filters"}
            body={
              data.transactions.length === 0
                ? "Once money moves through your accounts, it will show up here."
                : "Try adjusting your search keywords, category, or date range."
            }
          />
        ) : (
          <div>
            {groups.map(([key, rows]) => (
              <div key={key}>
                <div className="sticky top-0 z-10 border-b border-line-soft bg-paper/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint backdrop-blur">
                  {dayLabel(rows[0]!.occurredAt)}
                </div>
                <div className="divide-y divide-line-soft">
                  {rows.map((t) => {
                    const d = dirOf(t);
                    const voided = t.status === "voided";
                    const refNumber = `TXN-${String(t.id).padStart(8, "0")}`;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper/70"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            voided
                              ? "bg-line-soft text-ink-faint"
                              : d === "in"
                              ? "bg-good-soft text-good"
                              : "bg-line-soft text-ink-soft"
                          }`}
                        >
                          {voided ? (
                            <IconX size={15} />
                          ) : d === "in" ? (
                            <IconArrowDownLeft size={15} />
                          ) : (
                            <IconArrowUpRight size={15} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm font-semibold ${
                              voided ? "text-ink-faint line-through" : "text-ink"
                            }`}
                          >
                            {t.description}
                          </span>
                          <span className="block truncate text-xs text-ink-faint">
                            {refNumber} · {t.accountName}
                            {t.payeeName ? ` · ${t.payeeName}` : ""}
                            {t.note ? ` · “${t.note}”` : ""}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`font-display text-sm font-semibold tracking-tight ${
                              voided
                                ? "text-ink-faint line-through"
                                : d === "in"
                                ? "text-good"
                                : "text-ink"
                            }`}
                          >
                            {moneySigned(t.amountCents, d, t.currency)}
                          </span>
                          {t.status !== "completed" ? (
                            <StatusBadge status={t.status} />
                          ) : (
                            <CategoryPill category={t.category} />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Detail & Receipt Drawer */}
      {selected && (
        <div className="fixed inset-0 z-[55]">
          <div
            className="animate-fade absolute inset-0 bg-ink/40"
            onClick={() => setSelectedId(null)}
          />
          <div className="animate-drawer absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink">
                Transaction Details
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper hover:text-ink"
                aria-label="Close details"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <p
                  className={`font-display text-3xl font-bold tracking-tight ${
                    selected.status === "voided"
                      ? "text-ink-faint line-through"
                      : dirOf(selected) === "in"
                      ? "text-good"
                      : "text-ink"
                  }`}
                >
                  {moneySigned(selected.amountCents, dirOf(selected), selected.currency)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={selected.status} />
                  {selected.status === "completed" && (
                    <CategoryPill category={selected.category} />
                  )}
                </div>
              </div>

              {/* Receipt Action Buttons */}
              <div className="flex gap-2 border-y border-line-soft py-3">
                <button
                  onClick={() => downloadReceipt(selected)}
                  disabled={downloadingPdf}
                  className="btn-outline flex-1 py-2 text-xs"
                >
                  <BankIcon name="download" size={14} />
                  {downloadingPdf ? "Generating..." : "Download Receipt (PDF)"}
                </button>
                <button
                  onClick={() => shareReceipt(selected)}
                  className="btn-outline py-2 px-3 text-xs"
                  title="Share / Copy Receipt"
                >
                  <IconShare size={14} />
                </button>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-4 border-b border-line-soft pb-2">
                  <dt className="text-ink-faint">Reference Number</dt>
                  <dd className="font-mono font-bold text-ink">
                    TXN-{String(selected.id).padStart(8, "0")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-line-soft pb-2">
                  <dt className="text-ink-faint">Description</dt>
                  <dd className="text-right font-semibold text-ink">
                    {selected.description}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-line-soft pb-2">
                  <dt className="text-ink-faint">Source Account</dt>
                  <dd className="font-medium text-ink">
                    {selected.accountName ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-line-soft pb-2">
                  <dt className="text-ink-faint">Timestamp</dt>
                  <dd className="font-medium text-ink">
                    {fmtDateTime(selected.occurredAt)}
                  </dd>
                </div>
                {selected.payeeName && (
                  <div className="flex justify-between gap-4 border-b border-line-soft pb-2">
                    <dt className="text-ink-faint">Recipient Payee</dt>
                    <dd className="font-medium text-ink">{selected.payeeName}</dd>
                  </div>
                )}
                {selected.note && (
                  <div className="flex justify-between gap-4 border-b border-line-soft pb-2">
                    <dt className="text-ink-faint">Note</dt>
                    <dd className="text-right font-medium text-ink">
                      {selected.note}
                    </dd>
                  </div>
                )}
              </dl>

              <div>
                <p className="label">Recategorize</p>
                <div className="relative">
                  <select
                    value={selected.category}
                    disabled={selected.status === "voided" || savingCatId === selected.id}
                    onChange={(e) => recategorize(selected, e.target.value)}
                    className="input pr-8 text-xs"
                    aria-label="Recategorize"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {savingCatId === selected.id && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
                      <IconSwap size={14} className="animate-spin" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selected.status === "pending" && (
              <div className="border-t border-line-soft p-4">
                <button
                  className="btn-danger w-full py-2.5 text-xs font-semibold"
                  onClick={() => voidTx(selected)}
                  disabled={voidingId === selected.id}
                >
                  {voidingId === selected.id ? "Voiding…" : "Void pending payment"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
