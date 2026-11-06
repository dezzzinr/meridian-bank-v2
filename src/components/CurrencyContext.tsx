"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { money as fmtMoney, moneySigned as fmtMoneySigned } from "@/lib/format";
export interface CurrentUser {
  id: number; name: string; email: string; role: "user" | "admin";
  status: "active" | "suspended" | "closed"; currency: string; region: string; createdAt: string;
  avatarUrl?: string | null;
  accountLocked?: boolean;
  twoFactorEnabled?: boolean;
  biometricsEnabled?: boolean;
  hasTransactionPin?: boolean;
  hasSecurityQuestion?: boolean;
}
interface Ctx {
  user: CurrentUser;
  money: (cents: number, currency?: string) => string;
  moneySigned: (cents: number, dir: "in" | "out", currency?: string) => string;
}
const UserCtx = createContext<Ctx | null>(null);
export function useCurrentUser(): Ctx {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useCurrentUser must be used within UserProvider");
  return ctx;
}
export function UserProvider({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const value = useMemo<Ctx>(() => ({
    user, money: (amount, currency) => fmtMoney(amount, currency ?? user.currency),
    moneySigned: (amount, dir, currency) => fmtMoneySigned(amount, dir, currency ?? user.currency),
  }), [user]);
  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}
