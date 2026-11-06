import { randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "meridian_session";
export const SESSION_HEADER = "x-meridian-session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "closed";
  currency: string;
  region: string;
  avatarUrl?: string | null;
  accountLocked?: boolean;
  twoFactorEnabled?: boolean;
  biometricsEnabled?: boolean;
  hasTransactionPin?: boolean;
  hasSecurityQuestion?: boolean;
  createdAt: Date;
}

/**
 * Resolve the session token from the custom header (used by client
 * components — works even when cookies are blocked, e.g. embedded
 * previews/iframes) or from the httpOnly cookie (top-level tabs).
 */
export async function getSessionToken(): Promise<string | null> {
  const [store, h] = await Promise.all([cookies(), headers()]);
  return h.get(SESSION_HEADER) ?? store.get(SESSION_COOKIE)?.value ?? null;
}

export async function createSession(userId: number): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, token, expiresAt });
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      currency: users.currency,
      region: users.region,
      avatarUrl: users.avatarUrl,
      accountLocked: users.accountLocked,
      twoFactorEnabled: users.twoFactorEnabled,
      biometricsEnabled: users.biometricsEnabled,
      transactionPinHash: users.transactionPinHash,
      securityQuestion: users.securityQuestion,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    currency: r.currency,
    region: r.region,
    avatarUrl: r.avatarUrl,
    accountLocked: r.accountLocked,
    twoFactorEnabled: r.twoFactorEnabled,
    biometricsEnabled: r.biometricsEnabled,
    hasTransactionPin: Boolean(r.transactionPinHash),
    hasSecurityQuestion: Boolean(r.securityQuestion),
    createdAt: r.createdAt,
  };
}
