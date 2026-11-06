import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, notifications, transactions, transfers } from "@/db/schema";
import { HttpError } from "./api";
import { accountAccess, lockedActiveUser } from "./banking-server";
export async function cancelTransfer(userId: number, id: number) {
  return db.transaction(async (tx) => {
    await lockedActiveUser(tx, userId);
    const [lookup] = await tx.select({ accountId: transfers.sourceAccountId }).from(transfers).where(and(eq(transfers.id, id), eq(transfers.userId, userId)));
    if (!lookup) throw new HttpError(404, "Payment not found.");
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, lookup.accountId), accountAccess(userId))).for("update");
    if (!account || account.closedAt) throw new HttpError(409, "The source account is closed or inaccessible.");
    const [transfer] = await tx.select().from(transfers).where(and(eq(transfers.id, id), eq(transfers.userId, userId))).for("update");
    if (!transfer || transfer.status !== "pending" || transfer.destinationAccountId) throw new HttpError(409, "Only pending external payments can be cancelled.");
    await tx.update(transfers).set({ status: "voided" }).where(eq(transfers.id, id));
    await tx.update(transactions).set({ status: "voided" }).where(and(eq(transactions.transferId, id), eq(transactions.status, "pending")));
    await tx.update(accounts).set({ balanceCents: sql`${accounts.balanceCents} + ${transfer.amountCents + transfer.feeCents}` }).where(eq(accounts.id, account.id));
    await tx.insert(notifications).values({ userId, type: "payment", title: "Payment cancelled", body: `${transfer.referenceNumber} was cancelled and the held amount returned to ${account.name}.` });
    return { ok: true };
  });
}
