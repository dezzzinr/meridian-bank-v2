"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { apiFetch, setToken } from "@/lib/client";
import {
  IconAlert,
  IconBell,
  IconChevronDown,
  IconHome,
  IconLogOut,
  IconMenu,
  IconSend,
  IconSearch,
  IconShield,
  IconSettings,
  IconSwap,
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
  status: "pending" | "active" | "suspended" | "closed" | "rejected";
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
  { href: "/app/settings", label: "Settings", icon: IconSettings },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={30} />
      <span className={`font-display text-lg font-semibold tracking-tight ${light ? "text-brand-deep" : "text-white"}`}>
        Meridian
      </span>
    </div>
  );
}

function NavList({
  pathname,
  isAdmin,
  onNavigate,
  light = false,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
  light?: boolean;
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
                ? light ? "bg-[#e1f1e8] text-[#087346]" : "bg-brand text-white shadow-sm"
                : light ? "text-[#68736d] hover:bg-white hover:text-[#1e3127]" : "text-emerald-100/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {item.label}
            {active && <span className={`ml-auto h-1.5 w-1.5 rounded-full ${light ? "bg-[#169257]" : "bg-emerald-300/80"}`} />}
          </a>
        );
      })}
      {isAdmin && (
        <a
          href="/admin"
          onClick={onNavigate}
          className={`mt-1 flex items-center gap-3 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2.5 text-sm font-semibold transition ${
            pathname.startsWith("/admin")
              ? light ? "bg-amber-soft text-amber" : "bg-amber/20 text-amber-100"
              : light ? "text-amber hover:bg-amber-soft" : "text-amber-100/80 hover:bg-amber/20"
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
  light = false,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onLogout: () => void;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="relative">
        <Avatar name={name} size="md" avatarUrl={avatarUrl} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-semibold ${light ? "text-[#27372f]" : "text-white"}`}>{name}</p>
        <p className={`truncate text-[11px] ${light ? "text-[#87918b]" : "text-emerald-100/45"}`}>{email}</p>
      </div>
      <button
        onClick={onLogout}
        className={`rounded-lg p-2 transition ${light ? "text-[#87918b] hover:bg-white hover:text-[#27372f]" : "text-emerald-100/50 hover:bg-white/10 hover:text-white"}`}
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
      <div className="min-h-screen bg-[#fbfcfa]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-[#e7eae7] bg-[#f6f7f5] lg:flex">
          <div className="px-5 pb-7 pt-6">
            <Brand light />
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#a0a9a3]">
              Menu
            </p>
            <NavList pathname={pathname} isAdmin={isAdmin} light />
          </div>
          <div className="border-t border-[#e7eae7] px-3 py-2.5">
            <LanguageSwitcher variant="light" />
          </div>
          <div className="border-t border-[#e7eae7]">
            <UserCard name={user.name} email={user.email} avatarUrl={user.avatarUrl} onLogout={logout} light />
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line-soft bg-white px-4 shadow-sm lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawer(true)}
              className="rounded-lg p-2 text-ink-soft transition hover:bg-brand-soft hover:text-brand-deep"
              aria-label="Open menu"
            >
              <IconMenu size={20} />
            </button>
            <Brand light />
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden sm:inline-flex"><LanguageSwitcher variant="light"/></span>
            <NotificationBell />
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

        <main className="pt-14 lg:pl-56 lg:pt-0">
          <div className="sticky top-0 z-30 hidden h-[58px] items-center justify-between border-b border-[#e7eae7] bg-[#fbfcfa]/90 px-8 backdrop-blur lg:flex">
            <form action="/app/activity" method="get" role="search" className="flex h-9 w-full max-w-[520px] items-center gap-2.5 rounded-xl border border-[#eceeeb] bg-white px-3.5 text-[#8a948e] shadow-[0_1px_2px_rgba(20,40,28,.03)]">
              <IconSearch size={15} />
              <input name="q" aria-label="Search transactions" placeholder="Search transactions, payments, or accounts" className="h-full min-w-0 flex-1 border-0 bg-transparent text-xs text-[#27372f] outline-none placeholder:text-[#a5ada8] focus:ring-0" />
              <span className="rounded border border-[#e8ebe8] px-1.5 py-0.5 text-[9px] font-medium text-[#a5ada8]">Enter</span>
            </form>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <span className="h-6 w-px bg-[#e7eae7]" />
              <a href="/app/profile" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-white">
                <Avatar name={user.name} size="sm" avatarUrl={user.avatarUrl} />
                <div className="leading-tight"><p className="text-[11px] font-semibold text-[#27372f]">{user.name}</p><p className="mt-0.5 text-[9px] text-[#8b958f]">{user.role === "admin" ? "Administrator" : user.status === "active" ? "Active user" : user.status}</p></div>
                <IconChevronDown size={13} className="text-[#8b958f]" />
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-6 sm:px-6 sm:pb-6 lg:px-8 lg:py-7">
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

        <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line-soft bg-white/95 px-2 pt-2 pb-[max(.55rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(16,32,25,.06)] backdrop-blur lg:hidden">
          {[
            { href: "/app", label: "Home", icon: IconHome },
            { href: "/app/accounts", label: "Accounts", icon: IconWallet },
            { href: "/app/cards", label: "Cards", icon: CardNavIcon },
            { href: "/app/activity", label: "Activity", icon: IconSwap },
            { href: "/app/settings", label: "Settings", icon: IconSettings },
          ].map(({ href, label, icon: Icon }) => {
            const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
            return <a key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl py-1 text-[10px] font-semibold transition ${active ? "text-brand" : "text-ink-faint hover:text-ink"}`}>
              <span className={`grid h-7 w-10 place-items-center rounded-full ${active ? "bg-brand-soft" : ""}`}><Icon size={19}/></span>
              <span className="truncate">{label}</span>
            </a>;
          })}
        </nav>
      </div>
    </ToastProvider>
  );
}
