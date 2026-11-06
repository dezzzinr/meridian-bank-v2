import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { accounts, cards, notifications, transfers } from "@/db/schema";
import { HttpError, readBody, str } from "@/lib/api";
import { bankingError, bankingUser, lockedActiveUser, positiveId, privateHeaders } from "@/lib/banking-server";
import { listAccounts, toAccountDTO } from "@/lib/queries";
import { isTermLocked } from "@/lib/banking";

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await bankingUser();
    const id = positiveId((await ctx.params).id);
    const account = (await listAccounts(user.id, true)).find((a) => a.id === id);
    if (!account) throw new HttpError(404, "Account not found.");
    return Response.json({ account }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "accounts:detail"); }
}
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await bankingUser(true);
    const id = positiveId((await ctx.params).id);
    const name = str((await readBody(req)).name, 2, 48);
    if (!name) throw new HttpError(400, "Account name must be 2–48 characters.");
    const [account] = await db.update(accounts).set({ name }).where(and(eq(accounts.id, id), eq(accounts.userId, user.id), isNull(accounts.closedAt))).returning();
    if (!account) throw new HttpError(404, "Only the primary owner can rename an open account.");
    return Response.json(toAccountDTO(account, user.id, user.name), { headers: privateHeaders });
  } catch (error) { return bankingError(error, "accounts:rename"); }
}
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await bankingUser(true);
    const id = positiveId((await ctx.params).id);
    await db.transaction(async (tx) => {
      await lockedActiveUser(tx, user.id);
      const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.id))).for("update");
      if (!account || account.closedAt) throw new HttpError(404, "Only the primary owner can close an open account.");
      if (isTermLocked(account)) throw new HttpError(409, "This fixed deposit cannot be closed before maturity.");
      if (account.balanceCents !== 0) throw new HttpError(409, "Transfer the remaining balance out before closing this account.");
      const pending = await tx.select({ id: transfers.id }).from(transfers).where(and(or(eq(transfers.sourceAccountId, id), eq(transfers.destinationAccountId, id)), inArray(transfers.status, ["pending", "processing"])));
      if (pending.length) throw new HttpError(409, "Wait until pending payments have settled before closing the account.");
      await tx.update(accounts).set({ closedAt: new Date() }).where(eq(accounts.id, id));
      await tx.update(cards).set({ status: "closed", appleWalletDemo: false, googleWalletDemo: false }).where(eq(cards.accountId, id));
      await tx.insert(notifications).values({ userId: user.id, type: "account", title: "Account closed", body: `${account.name} was closed. Your statements and transaction history are retained.` });
    });
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "accounts:close"); }
}
