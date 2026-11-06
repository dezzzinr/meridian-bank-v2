import { categoryStyle } from "@/lib/format";
import { ACCOUNT_LABELS, type AccountType } from "@/lib/banking";
import { IconCheck, IconClock, IconX } from "../icons";
const BASE = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";
export function StatusBadge({ status }: { status: "pending" | "processing" | "completed" | "voided" | "failed" }) {
  if (status === "pending") return <span className={`${BASE} bg-amber-soft text-amber`}><IconClock size={11} /> Pending</span>;
  if (status === "processing") return <span className={`${BASE} bg-brand-soft text-brand-deep`}><IconClock size={11} /> Processing</span>;
  if (status === "failed") return <span className={`${BASE} bg-rose-soft text-rose`}><IconX size={11} /> Failed</span>;
  if (status === "voided") return <span className={`${BASE} bg-line-soft text-ink-faint`}><IconX size={11} /> Voided</span>;
  return <span className={`${BASE} bg-good-soft text-good`}><IconCheck size={11} /> Completed</span>;
}
export function CategoryPill({ category }: { category: string }) {
  return <span className={`${BASE} ${categoryStyle(category)}`}>{category}</span>;
}
export function TypeBadge({ type }: { type: AccountType }) {
  return <span className={`${BASE} ${type === "fixed_deposit" ? "bg-amber-soft text-amber" : type === "foreign_currency" ? "bg-[#e8eef7] text-[#31517a]" : type === "joint" ? "bg-[#f3e8f2] text-[#7a3a68]" : "bg-brand-soft text-brand-deep"}`}>{ACCOUNT_LABELS[type]}</span>;
}
