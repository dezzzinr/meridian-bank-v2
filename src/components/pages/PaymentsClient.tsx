"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiJson, ApiRequestError } from "@/lib/client";
import type { AccountDTO, TransferDTO } from "@/lib/queries";
import { dayLabel } from "@/lib/format";
import { useCurrentUser } from "../CurrencyContext";
import { useToast } from "../ui/Toast";
import { RowSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";
import { NewTransferModal } from "../modals/NewTransferModal";
import { IconAlert, IconInfo, IconSend, IconSpinner, IconX } from "../icons";

function requestError(error: unknown): ApiRequestError {
  return error instanceof ApiRequestError
    ? error
    : new ApiRequestError("An unexpected error occurred. Please try again.");
}

function LoadError({
  title, error, retry, loading,
}: {
  title: string;
  error: ApiRequestError;
  retry: () => void;
  loading: boolean;
}) {
  return (
    <div role="alert" className="flex flex-col items-center px-5 py-8 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-soft text-rose">
        <IconAlert size={18} />
      </span>
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">{error.message}</p>
      {error.hint && <p className="mt-2 max-w-xl break-words text-xs leading-relaxed text-ink-soft">{error.hint}</p>}
      <p className="mt-3 break-all font-mono text-[11px] text-ink-faint">
        {error.code}{error.status > 0 ? ` · HTTP ${error.status}` : ""}
        {error.errorId ? ` · Reference ${error.errorId}` : ""}
      </p>
      <div className="mt-4 flex items-center gap-2">
        {error.status === 401 && <Link href="/login" className="btn-primary">Sign in again</Link>}
        <button className="btn-outline" onClick={retry} disabled={loading}>
          {loading && <IconSpinner size={15} />}
          {loading ? "Retrying…" : "Try again"}
        </button>
      </div>
    </div>
  );
}

export function PaymentsClient() {
  const toast = useToast();
  const { user, money } = useCurrentUser();
  const [items, setItems] = useState<TransferDTO[] | null>(null);
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [historyError, setHistoryError] = useState<ApiRequestError | null>(null);
  const [accountsError, setAccountsError] = useState<ApiRequestError | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    setHistoryLoading(true);
    try {
      const result = await apiJson<{ transfers: TransferDTO[] }>("/api/transfers", { cache: "no-store", signal });
      if (!Array.isArray(result.transfers)) throw new ApiRequestError("Payment history returned an unexpected response.", 200, "INVALID_RESPONSE");
      if (!signal?.aborted) {
        setItems(result.transfers);
        setHistoryError(null);
      }
    } catch (error) {
      if (!signal?.aborted) setHistoryError(requestError(error));
    } finally {
      if (!signal?.aborted) setHistoryLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    setAccountsLoading(true);
    try {
      const result = await apiJson<{ accounts: AccountDTO[] }>("/api/accounts", { cache: "no-store", signal });
      if (!Array.isArray(result.accounts)) throw new ApiRequestError("Accounts returned an unexpected response.", 200, "INVALID_RESPONSE");
      if (!signal?.aborted) {
        setAccounts(result.accounts);
        setAccountsError(null);
      }
    } catch (error) {
      if (!signal?.aborted) setAccountsError(requestError(error));
    } finally {
      if (!signal?.aborted) setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHistory(controller.signal);
    void loadAccounts(controller.signal);
    return () => controller.abort();
  }, [loadHistory, loadAccounts]);

  // A failed accounts request must not hide successfully loaded payment history.
  const canSend = user.status === "active" && accounts.length > 0 && !accountsLoading && !accountsError;

  const cancel = async (transfer: TransferDTO) => {
    if (user.status !== "active" || cancellingId !== null) return;
    const dest = transfer.destinationAccountName ?? transfer.payeeName ?? "payee";
    setCancellingId(transfer.id);
    setItems((prev) => prev?.map((item) => item.id === transfer.id ? { ...item, status: "voided" } : item) ?? null);
    try {
      await apiJson(`/api/transfers/${transfer.id}`, { method: "DELETE" });
      toast("success", `Payment to ${dest} cancelled — ${money(transfer.amountCents, transfer.currency)} returned.`);
      await loadAccounts();
    } catch (error) {
      setItems((prev) => prev?.map((item) => item.id === transfer.id ? { ...item, status: transfer.status } : item) ?? null);
      toast("error", requestError(error).message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Payments</h1>
          <p className="mt-1 text-sm text-ink-soft">Transfers between your accounts and payments to people and businesses.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setOpen(true)}
          disabled={!canSend}
          title={user.status !== "active" ? "An administrator must reactivate your account before you can send payments." : accountsError ? "Accounts must load before creating a payment." : undefined}
        >
          <IconSend size={15} /> New payment
        </button>
      </div>

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand-soft/60 px-4 py-3">
        <IconInfo size={16} className="mt-0.5 shrink-0 text-brand-deep" />
        <p className="text-[13px] leading-relaxed text-brand-deep">
          Transfers between your own accounts are instant. Payments to external payees process as <span className="font-semibold">pending</span> and settle within minutes — you can cancel a pending payment while your account is active.
        </p>
      </div>

      {accountsError && (
        <div className="card mb-4 border-amber/30">
          <LoadError title="Accounts couldn't be loaded" error={accountsError} retry={() => void loadAccounts()} loading={accountsLoading} />
          <p className="px-5 pb-4 text-center text-xs text-ink-soft">Payment history loads independently below. New payments are unavailable until accounts can be loaded.</p>
        </div>
      )}

      <section className="card overflow-hidden" aria-label="Payment history" aria-busy={historyLoading}>
        {historyError && (
          <LoadError
            title={items === null ? "Couldn't load your payments" : "Couldn't refresh your payments"}
            error={historyError}
            retry={() => void loadHistory()}
            loading={historyLoading}
          />
        )}
        {items === null ? (
          !historyError && <div className="divide-y divide-line-soft">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}</div>
        ) : items.length === 0 ? (
          !historyError && <EmptyState
            compact
            icon={<IconSend size={20} />}
            title="No payments yet"
            body={user.status === "active" ? "When you transfer money or pay someone, it will show up here." : "There are no payments to display. Your history remains accessible while your account is suspended."}
            action={canSend ? <button className="btn-primary" onClick={() => setOpen(true)}><IconSend size={15} /> Make your first payment</button> : undefined}
          />
        ) : (
          <>
            {historyError && <p className="border-t border-line-soft px-4 py-2 text-xs text-ink-faint">Showing your last successfully loaded payment history.</p>}
            <div className="divide-y divide-line-soft">
              {items.map((transfer) => {
                const dest = transfer.destinationAccountName ?? transfer.payeeName ?? "Removed payee";
                return (
                  <div key={transfer.id} className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar name={dest} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${transfer.status === "voided" ? "text-ink-faint line-through" : "text-ink"}`}>
                        {transfer.destinationAccountName ? `To ${dest}` : dest}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        From {transfer.sourceAccountName} · {dayLabel(transfer.createdAt)}{transfer.note ? ` · “${transfer.note}”` : ""}
                      </p>
                      {transfer.referenceNumber && <p className="mt-1 truncate font-mono text-[10px] text-ink-faint">{transfer.referenceNumber}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`font-display text-sm font-semibold tracking-tight ${transfer.status === "voided" ? "text-ink-faint line-through" : "text-ink"}`}>
                        -{money(transfer.amountCents, transfer.currency)}
                      </span>
                      <StatusBadge status={transfer.status} />
                      {transfer.canCancel && user.status === "active" && (
                        <button onClick={() => void cancel(transfer)} disabled={cancellingId !== null} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-rose transition hover:bg-rose-soft disabled:opacity-60">
                          {cancellingId === transfer.id ? <IconSpinner size={11} /> : <IconX size={11} />} Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <NewTransferModal
        accounts={accounts}
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          void loadHistory();
          void loadAccounts();
        }}
      />
    </div>
  );
}
