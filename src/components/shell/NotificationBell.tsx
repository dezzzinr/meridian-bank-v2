"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { fmtDateTime } from "@/lib/format";
import { IconBell, IconCheck } from "../icons";

interface Notif {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const TYPE_DOT: Record<string, string> = {
  admin_message: "bg-amber",
  security: "bg-rose",
  transfer: "bg-brand",
  payment: "bg-brand",
  account: "bg-good",
  system: "bg-ink-faint",
};

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    apiFetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setItems(d.notifications ?? []);
          setUnread(d.unread ?? 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAll = async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiFetch("/api/notifications", { method: "PATCH" });
    } catch {
      load();
    }
  };

  const openPanel = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPanel}
        className={`relative rounded-lg p-2 transition ${
          dark
            ? "text-emerald-100/70 hover:bg-white/10 hover:text-white"
            : "text-ink-soft hover:bg-card hover:text-ink"
        }`}
        aria-label="Notifications"
      >
        <IconBell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink">
              Notifications
            </p>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-[12px] font-semibold text-brand transition hover:text-brand-deep"
              >
                <IconCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-ink-soft">You're all caught up.</p>
              </div>
            ) : (
              items.slice(0, 15).map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-line-soft px-4 py-3 last:border-0 ${
                    n.read ? "" : "bg-brand-soft/30"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      TYPE_DOT[n.type] ?? "bg-ink-faint"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {fmtDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <a
            href="/app/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line-soft px-4 py-2.5 text-center text-[13px] font-semibold text-brand transition hover:bg-paper"
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
}
