"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import { fmtDateTime } from "@/lib/format";
import { useToast } from "../ui/Toast";
import { RowSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import {
  IconAlert,
  IconCheck,
  IconSend,
  IconShield,
  IconSwap,
  IconTrash,
  IconWallet,
} from "../icons";

interface Notif {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const TYPE_META: Record<
  string,
  { icon: typeof IconAlert; tone: string; label: string }
> = {
  admin_message: { icon: IconShield, tone: "bg-amber-soft text-amber", label: "Message" },
  security: { icon: IconAlert, tone: "bg-rose-soft text-rose", label: "Security" },
  transfer: { icon: IconSwap, tone: "bg-brand-soft text-brand-deep", label: "Transfer" },
  payment: { icon: IconSend, tone: "bg-brand-soft text-brand-deep", label: "Payment" },
  account: { icon: IconWallet, tone: "bg-good-soft text-good", label: "Account" },
  system: { icon: IconAlert, tone: "bg-line-soft text-ink-soft", label: "System" },
};

export function NotificationsClient() {
  const toast = useToast();
  const [items, setItems] = useState<Notif[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = () => {
    setLoadErr(false);
    apiFetch("/api/notifications", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => setLoadErr(true));
  };

  useEffect(load, []);

  const shown = useMemo(() => {
    if (!items) return [];
    return filter === "unread" ? items.filter((n) => !n.read) : items;
  }, [items, filter]);

  const unreadCount = items?.filter((n) => !n.read).length ?? 0;

  const markAll = async () => {
    setItems((prev) => (prev ? prev.map((n) => ({ ...n, read: true })) : prev));
    try {
      await apiFetch("/api/notifications", { method: "PATCH" });
      toast("success", "All notifications marked as read.");
    } catch {
      load();
    }
  };

  const markOne = async (n: Notif) => {
    if (n.read) return;
    setItems((prev) =>
      prev ? prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : prev,
    );
    try {
      await apiFetch(`/api/notifications/${n.id}`, { method: "PATCH" });
    } catch {
      load();
    }
  };

  const remove = async (n: Notif) => {
    const prev = items ?? [];
    setItems(prev.filter((x) => x.id !== n.id));
    try {
      const r = await apiFetch(`/api/notifications/${n.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
    } catch {
      setItems(prev);
      toast("error", "Couldn't remove that notification.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Your activity log and messages from the Meridian team.
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-outline" onClick={markAll}>
            <IconCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-paper p-1 sm:w-64">
        {(
          [
            ["all", "All"],
            ["unread", `Unread${unreadCount ? ` (${unreadCount})` : ""}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 rounded-md px-3 py-2 text-[13px] font-semibold transition ${
              filter === key
                ? "bg-card text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loadErr ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-rose">
              Couldn't load notifications.
            </p>
            <button className="btn-outline mt-4" onClick={load}>
              Try again
            </button>
          </div>
        ) : items === null ? (
          <div className="divide-y divide-line-soft">
            {Array.from({ length: 6 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            compact
            icon={<IconAlert size={20} />}
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            body={
              filter === "unread"
                ? "You're all caught up."
                : "Activity on your account and messages from the team will appear here."
            }
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {shown.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.system;
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => markOne(n)}
                  className={`flex cursor-pointer gap-3 px-4 py-3.5 transition hover:bg-paper/60 ${
                    n.read ? "" : "bg-brand-soft/25"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {meta.label} · {fmtDateTime(n.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(n);
                    }}
                    className="h-fit rounded-lg p-2 text-ink-faint transition hover:bg-rose-soft hover:text-rose"
                    aria-label="Delete notification"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
