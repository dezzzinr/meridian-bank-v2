"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { IconAlert, IconCheck, IconInfo, IconX } from "../icons";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastCtx = createContext<(type: ToastType, message: string) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastCtx);
}

const STYLES: Record<ToastType, { ring: string; icon: ReactNode }> = {
  success: {
    ring: "border-good/30 bg-good-soft text-good",
    icon: <IconCheck size={15} className="shrink-0" />,
  },
  error: {
    ring: "border-rose/30 bg-rose-soft text-rose",
    icon: <IconAlert size={15} className="shrink-0" />,
  },
  info: {
    ring: "border-line bg-card text-ink-soft",
    icon: <IconInfo size={15} className="shrink-0" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] flex-col gap-2 sm:w-[380px]">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-rise pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-card p-3 shadow-lg shadow-ink/10"
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${STYLES[t.type].ring}`}
            >
              {STYLES[t.type].icon}
            </span>
            <p className="flex-1 pt-0.5 text-sm font-medium leading-snug text-ink">
              {t.message}
            </p>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="rounded-md p-1 text-ink-faint transition hover:bg-paper hover:text-ink"
              aria-label="Dismiss"
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
