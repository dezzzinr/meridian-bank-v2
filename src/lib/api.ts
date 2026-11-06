import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function apiError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Returns the user only if they are an active admin. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || user.status !== "active") return null;
  return user;
}

/**
 * For actions that move money or change data: only "active" users may
 * proceed. Suspended/closed users are blocked with a clear message.
 */
export function assertActive(
  user: SessionUser,
): { ok: true } | { ok: false; message: string } {
  if (user.status === "active") return { ok: true };
  if (user.status === "suspended") {
    return {
      ok: false,
      message:
        "Your account is suspended. Please contact support before making transactions.",
    };
  }
  return {
    ok: false,
    message: "Your account is closed and can no longer make transactions.",
  };
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = (await req.json()) as Record<string, unknown>;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

/** Parse a dollar amount ("120.5" or 120.5) into integer cents. */
export function parseDollars(value: unknown): number | null {
  if (typeof value === "number" || typeof value === "string") {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    const cents = Math.round(n * 100);
    if (cents > 100_000_000_00) return null; // $100M cap
    return cents;
  }
  return null;
}

export function str(v: unknown, min = 0, max = Infinity): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length < min || s.length > max) return null;
  return s;
}
