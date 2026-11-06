export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-line/70 ${className}`} />
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-line/70" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/5 animate-pulse rounded bg-line/70" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-line/60" />
      </div>
      <div className="h-3.5 w-16 animate-pulse rounded bg-line/70" />
    </div>
  );
}
