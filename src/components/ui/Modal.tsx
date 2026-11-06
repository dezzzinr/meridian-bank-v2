"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconX } from "../icons";

export function Modal({ open, onClose, title, subtitle, children, maxW = "max-w-md" }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; maxW?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter((el) => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => {
      if (!panel.current?.contains(document.activeElement)) (focusable()[0] ?? panel.current)?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key !== "Tab") return;
      const nodes = focusable(); const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (!first) { e.preventDefault(); panel.current?.focus(); return; }
      if (e.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
    <div className="animate-fade absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`animate-rise relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl shadow-ink/20 outline-none sm:rounded-2xl ${maxW}`}>
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4"><div><h2 id={titleId} className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>{subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}</div><button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint transition hover:bg-paper hover:text-ink" aria-label="Close dialog"><IconX size={18} /></button></div>
      <div className="overflow-y-auto px-5 py-4">{children}</div>
    </div>
  </div>;
}
