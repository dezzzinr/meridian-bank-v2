import { and, eq, exists, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, accountMembers, users } from "@/db/schema";
import { getSessionUser } from "./auth";
import { HttpError } from "./api";
import { apiFailure } from "./api-failure";

export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function bankingUser(write = false) {
  const user = await getSessionUser();
  if (!user || user.status === "closed") throw new HttpError(401, "Please sign in again.");
  if (write && user.status !== "active") throw new HttpError(403, "Your account is suspended. An administrator must reactivate it before you make changes.");
  return user;
}
export function accountAccess(userId: number) {
  return or(eq(accounts.userId, userId), exists(db.select({ one: sql`1` }).from(accountMembers).where(and(
    eq(accountMembers.accountId, accounts.id), eq(accountMembers.userId, userId), eq(accountMembers.status, "accepted"),
  ))))!;
}
export function positiveId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "Invalid record identifier.");
  return id;
}
export function bankingError(error: unknown, operation: string) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  return apiFailure(error, operation);
}
export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };
export async function lockedActiveUser(tx: DBTransaction, id: number) {
  const [user] = await tx.select().from(users).where(eq(users.id, id)).for("update");
  if (!user || user.status !== "active") throw new HttpError(403, "Your account is not active. No changes were made.");
  return user;
}
