"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, getToken, setToken } from "@/lib/client";
import { initials } from "@/lib/format";
import { ToastProvider } from "@/components/ui/Toast";
import {
  IconArrowDownLeft,
  IconLogOut,
  IconSend,
  IconShield,
  IconUsers,
  LogoMark,
} from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Users", icon: IconUsers },
  { href: "/admin/messages", label: "Broadcast", icon: IconSend },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) {
          setToken(null);
          router.replace("/login");
        } else if (u.role !== "admin") {
          setDenied(true);
        } else {
          setUser({ name: u.name, email: u.email });
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setToken(null);
      window.location.href = "/login";
    }
  };

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-soft text-rose">
            <IconShield size={22} />
          </span>
          <h1 className="mt-4 font-display text-xl font-semibold text-ink">
            Admins only
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            You don't have permission to view the admin console.
          </p>
          <a href="/app" className="btn-primary mt-6 inline-flex">
            Back to my bank
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="flex items-center gap-3 text-ink-soft">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
          <span className="text-sm font-medium">Loading admin console…</span>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-night lg:flex">
          <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
            <LogoMark size={30} />
            <div>
              <p className="font-display text-lg font-semibold leading-none tracking-tight text-white">
                Meridian
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-amber-100/70">
                Admin Console
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-brand text-white shadow-sm"
                        : "text-emerald-100/55 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </a>
                );
              })}
              <a
                href="/app"
                className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-100/55 transition hover:bg-white/5 hover:text-white"
              >
                <IconArrowDownLeft size={18} />
                Back to my bank
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-display text-xs font-semibold text-emerald-100">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-emerald-100/45">
                {user.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-emerald-100/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
            >
              <IconLogOut size={17} />
            </button>
          </div>
        </aside>

        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-night px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="font-display font-semibold text-white">
              Admin Console
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/app" className="text-[13px] font-semibold text-emerald-100/70">
              My bank
            </a>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-emerald-100/70"
              aria-label="Sign out"
            >
              <IconLogOut size={18} />
            </button>
          </div>
        </header>

        {/* Mobile nav tabs */}
        <div className="fixed inset-x-0 top-14 z-30 flex gap-1 border-b border-line bg-card px-4 py-2 lg:hidden">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                  active ? "bg-brand text-white" : "text-ink-soft"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        <main className="pt-[104px] lg:pl-64 lg:pt-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
