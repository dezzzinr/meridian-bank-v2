"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { initials } from "@/lib/format";
import { apiFetch, setToken } from "@/lib/client";
import {
  IconAlert,
  IconBell,
  IconHome,
  IconLogOut,
  IconMenu,
  IconSend,
  IconShield,
  IconSwap,
  IconUser,
  IconUsers,
  IconWallet,
  IconX,
  LogoMark,
} from "../icons";
import { ToastProvider } from "../ui/Toast";
import { NotificationBell } from "./NotificationBell";
import { BankIcon } from "../banking/BankIcon";
const CardNavIcon = ({ size = 18, className }: { size?: number; className?: string }) => <BankIcon name="card" size={size} className={className} />;

import { Avatar } from "../ui/Avatar";

interface ShellUser {
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "closed";
  avatarUrl?: string | null;
}

const NAV = [
  { href: "/app", label: "Overview", icon: IconHome },
  { href: "/app/accounts", label: "Accounts", icon: IconWallet },
  { href: "/app/cards", label: "Cards", icon: CardNavIcon },
  { href: "/app/activity", label: "Activity", icon: IconSwap },
  { href: "/app/payments", label: "Payments", icon: IconSend },
  { href: "/app/payees", label: "Payees", icon: IconUsers },
  { href: "/app/notifications", label: "Notifications", icon: IconBell },
  { href: "/app/security", label: "Security Center", icon: IconShield },
  { href: "/app/profile", label: "Profile", icon: IconUser },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={30} />
      <span className="font-display text-lg font-semibold tracking-tight text-white">
        Meridian
      </span>
    </div>
  );
}

function NavList({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const items = [...NAV];
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand text-white shadow-sm"
                : "text-emerald-100/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {item.label}
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
            )}
          </a>
        );
      })}
      {isAdmin && (
        <a
          href="/admin"
          onClick={onNavigate}
          className={`mt-1 flex items-center gap-3 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2.5 text-sm font-semibold transition ${
            pathname.startsWith("/admin")
              ? "bg-amber/20 text-amber-100"
              : "text-amber-100/80 hover:bg-amber/20"
          }`}
        >
          <IconShield size={18} className="shrink-0" />
          Admin Console
        </a>
      )}
    </nav>
  );
}

function UserCard({
  name,
  email,
  avatarUrl,
  onLogout,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="relative">
        <Avatar name={name} size="md" avatarUrl={avatarUrl} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">{name}</p>
        <p className="truncate text-[11px] text-emerald-100/45">{email}</p>
      </div>
      <button
        onClick={onLogout}
        className="rounded-lg p-2 text-emerald-100/50 transition hover:bg-white/10 hover:text-white"
        aria-label="Sign out"
        title="Sign out"
      >
        <IconLogOut size={17} />
      </button>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setToken(null);
      window.location.href = "/login";
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-night lg:flex">
          <div className="px-5 pb-6 pt-6">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/30">
              Menu
            </p>
            <NavList pathname={pathname} isAdmin={isAdmin} />
          </div>
          <div className="border-t border-white/10">
            <UserCard name={user.name} email={user.email} avatarUrl={user.avatarUrl} onLogout={logout} />
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-night px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawer(true)}
              className="rounded-lg p-2 text-emerald-100/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Open menu"
            >
              <IconMenu size={20} />
            </button>
            <Brand />
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell dark />
            <div className="ml-1">
              <Avatar name={user.name} size="sm" avatarUrl={user.avatarUrl} />
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="animate-fade absolute inset-0 bg-ink/55"
              onClick={() => setDrawer(false)}
            />
            <div className="animate-drawer-left absolute inset-y-0 left-0 flex w-[280px] flex-col bg-night">
              <div className="flex items-center justify-between px-5 pb-5 pt-5">
                <Brand />
                <button
                  onClick={() => setDrawer(false)}
                  className="rounded-lg p-2 text-emerald-100/60 hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                >
                  <IconX size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3">
                <NavList
                  pathname={pathname}
                  isAdmin={isAdmin}
                  onNavigate={() => setDrawer(false)}
                />
              </div>
              <div className="border-t border-white/10">
                <UserCard name={user.name} email={user.email} avatarUrl={user.avatarUrl} onLogout={logout} />
              </div>
            </div>
          </div>
        )}

        <main className="pt-14 lg:pl-64 lg:pt-0">
          {/* Desktop top-right notification bell */}
          <div className="sticky top-0 z-30 hidden justify-end border-b border-line-soft bg-paper/80 px-6 py-2.5 backdrop-blur lg:flex">
            <NotificationBell />
          </div>

          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
            {user.status === "suspended" && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber/30 bg-amber-soft px-4 py-3 text-amber">
                <IconAlert size={18} className="mt-0.5 shrink-0" />
                <p className="text-[13px] leading-relaxed">
                  <span className="font-semibold">
                    Your account is suspended.
                  </span>{" "}
                  You can view everything, but transfers and payments are
                  disabled until an administrator reactivates your account.
                </p>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
