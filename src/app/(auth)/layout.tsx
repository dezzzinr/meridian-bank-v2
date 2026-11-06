import type { ReactNode } from "react";
import { IconSend, IconShield, IconWallet, LogoMark } from "@/components/icons";

const FEATURES = [
  {
    icon: IconShield,
    title: "Bank-grade security",
    body: "Every session is encrypted and monitored.",
  },
  {
    icon: IconSend,
    title: "Money that moves",
    body: "Instant transfers, fast external payments.",
  },
  {
    icon: IconWallet,
    title: "One clear view",
    body: "Every account, balance and bill in one place.",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-night p-10 lg:flex">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, rgba(15,90,72,0.55), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-48 -left-24 h-[420px] w-[420px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(closest-side, rgba(15,90,72,0.45), transparent)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <LogoMark size={34} />
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            Meridian
          </span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-[1.12] tracking-tight text-white">
            Banking that keeps up with your life.
          </h1>
          <div className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-200">
                  <f.icon size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-[13px] text-emerald-100/50">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-emerald-100/35">
          Protected by 256-bit encryption & multi-factor authentication.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark size={32} />
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Meridian
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
