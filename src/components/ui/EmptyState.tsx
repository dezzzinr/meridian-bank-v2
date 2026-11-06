import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-card/70 text-center ${
        compact ? "px-6 py-10" : "px-6 py-16"
      }`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
