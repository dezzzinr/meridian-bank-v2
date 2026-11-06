"use client";

import { apiFetch } from "@/lib/client";
import { useEffect, useMemo, useState } from "react";
import type { PayeeDTO } from "@/lib/queries";
import { maskMethod } from "@/lib/format";
import { useToast } from "../ui/Toast";
import { RowSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Field";
import { PayeeModal } from "../modals/PayeeModal";
import {
  IconAlert,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSpinner,
  IconTrash,
  IconUsers,
} from "../icons";

export function PayeesClient() {
  const toast = useToast();
  const [items, setItems] = useState<PayeeDTO[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; initial: PayeeDTO | null }>({
    open: false,
    initial: null,
  });
  const [deleting, setDeleting] = useState<PayeeDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoadErr(false);
    apiFetch("/api/payees", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setItems(d.payees ?? []))
      .catch(() => setLoadErr(true));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.methodDetail.toLowerCase().includes(needle) ||
        (p.notes ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  const onSaved = (p: PayeeDTO) => {
    setItems((prev) => {
      const list = prev ?? [];
      const exists = list.some((x) => x.id === p.id);
      const next = exists ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusy(true);
    setItems((prev) =>
      prev ? prev.filter((x) => x.id !== target.id) : prev,
    );
    try {
      const res = await apiFetch(`/api/payees/${target.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't remove the payee.");
      toast("success", `${target.name} removed from your payees.`);
      setDeleting(null);
    } catch (e) {
      setItems((prev) => (prev ? [...prev, target].sort((a, b) => a.name.localeCompare(b.name)) : [target]));
      toast("error", e instanceof Error ? e.message : "Couldn't remove the payee.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Payees
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            People and businesses you pay regularly.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setModal({ open: true, initial: null })}
        >
          <IconPlus size={16} /> Add payee
        </button>
      </div>

      {items && items.length > 0 && (
        <div className="card mb-4 p-3">
          <div className="relative">
            <IconSearch
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search payees…"
              className="input pl-9"
            />
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loadErr ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-rose">
              Couldn't load your payees.
            </p>
            <button className="btn-outline mt-4" onClick={load}>
              Try again
            </button>
          </div>
        ) : items === null ? (
          <div className="divide-y divide-line-soft">
            {Array.from({ length: 5 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon={<IconUsers size={20} />}
            title="No payees yet"
            body="Add the people and businesses you pay often, and sending money takes just a few taps."
            action={
              <button
                className="btn-primary"
                onClick={() => setModal({ open: true, initial: null })}
              >
                <IconPlus size={16} /> Add your first payee
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon={<IconSearch size={20} />}
            title="No payees match"
            body={`Nothing found for “${q.trim()}”. Try a different search.`}
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {maskMethod(p.methodType, p.methodDetail)}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setModal({ open: true, initial: p })}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-paper hover:text-ink"
                    aria-label={`Edit ${p.name}`}
                  >
                    <IconPencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-rose-soft hover:text-rose"
                    aria-label={`Remove ${p.name}`}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PayeeModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        initial={modal.initial}
        onSaved={onSaved}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Remove payee"
        subtitle="Their payment history stays in your activity."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-rose-soft p-3.5 text-rose">
            <IconAlert size={18} className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-relaxed">
              Remove <span className="font-semibold">{deleting?.name}</span> from
              your payees? You can always add them again later.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-outline flex-1"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              Keep
            </button>
            <button className="btn-danger flex-1" onClick={confirmDelete} disabled={busy}>
              {busy && <IconSpinner size={15} />} Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
