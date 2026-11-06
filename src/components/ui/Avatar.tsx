import { avatarTone, initials } from "@/lib/format";

export function Avatar({
  name,
  size = "md",
  avatarUrl,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  avatarUrl?: string | null;
}) {
  const cls =
    size === "sm"
      ? "h-8 w-8 text-[11px]"
      : size === "lg"
        ? "h-11 w-11 text-sm"
        : size === "xl"
          ? "h-16 w-16 text-xl"
          : "h-9 w-9 text-xs";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`flex shrink-0 select-none items-center justify-center rounded-full object-cover border border-line ${cls}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold ${cls} ${avatarTone(name)}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
