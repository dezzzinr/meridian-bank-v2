const formatterCache = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  let f = formatterCache.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-US", { style: "currency", currency });
    } catch {
      f = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    }
    formatterCache.set(currency, f);
  }
  return f;
}

/**
 * The active display currency. Set once per session from the signed-in
 * user's region so every `money()` call renders in their currency without
 * threading the code through every component. Server code always passes
 * an explicit currency, so this only affects the browser.
 */
let activeCurrency = "USD";

export function setActiveCurrency(currency: string): void {
  if (currency) activeCurrency = currency;
}

/**
 * Format an integer minor-unit amount (e.g. cents). Uses the active
 * session currency unless one is passed explicitly.
 */
export function money(cents: number, currency?: string): string {
  const sign = cents < 0 ? "-" : "";
  return sign + formatter(currency ?? activeCurrency).format(Math.abs(cents) / 100);
}

export function moneySigned(
  cents: number,
  dir: "in" | "out",
  currency?: string,
): string {
  return (
    (dir === "in" ? "+" : "-") +
    formatter(currency ?? activeCurrency).format(Math.abs(cents) / 100)
  );
}

export function fmtDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | Date): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

export function dayKey(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayLabel(iso: string | Date): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const AVATAR_TONES = [
  "bg-brand-soft text-brand-deep",
  "bg-amber-soft text-amber",
  "bg-[#e8eef7] text-[#31517a]",
  "bg-[#f3e8f2] text-[#7a3a68]",
  "bg-[#efece4] text-[#6b5d3f]",
  "bg-rose-soft text-rose",
];

export function avatarTone(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length]!;
}

export function maskMethod(type: string, detail: string): string {
  if (type === "email") return detail;
  if (type === "mobile") return detail;
  const digits = detail.replace(/\D/g, "");
  return "Bank ••" + (digits.slice(-4) || "0000");
}

export const CATEGORIES = [
  "Salary",
  "Rent",
  "Groceries",
  "Dining",
  "Utilities",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Health",
  "Travel",
  "Transfers",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<string, string> = {
  Salary: "bg-good-soft text-good",
  Rent: "bg-[#f3e8f2] text-[#7a3a68]",
  Groceries: "bg-brand-soft text-brand-deep",
  Dining: "bg-amber-soft text-amber",
  Utilities: "bg-[#e8eef7] text-[#31517a]",
  Transport: "bg-[#efece4] text-[#6b5d3f]",
  Subscriptions: "bg-[#ece8f6] text-[#4d3f85]",
  Shopping: "bg-rose-soft text-rose",
  Health: "bg-[#e6f2ef] text-[#1f6b58]",
  Travel: "bg-[#e4f0f4] text-[#20606f]",
  Transfers: "bg-line-soft text-ink-soft",
  Other: "bg-line-soft text-ink-soft",
};

export function categoryStyle(category: string): string {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other!;
}

export const METHOD_LABELS: Record<string, string> = {
  bank: "Bank account",
  email: "Email",
  mobile: "Mobile",
};
