import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { HttpError, readBody } from "@/lib/api";
import { CATEGORIES } from "@/lib/format";
import { accountAccess, bankingError, bankingUser, positiveId, privateHeaders } from "@/lib/banking-server";
import { cancelTransfer } from "@/lib/cancel-transfer";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await bankingUser(true);
    const id = positiveId((await ctx.params).id);
    const category = (await readBody(req)).category;
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) throw new HttpError(400, "Unknown category.");
    const [row] = await db.update(transactions).set({ category: String(category) }).where(and(eq(transactions.id, id), inArray(transactions.accountId, db.select({ id: accounts.id }).from(accounts).where(accountAccess(user.id))))).returning({ id: transactions.id, category: transactions.category });
    if (!row) throw new HttpError(404, "Transaction not found.");
    return Response.json(row, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "transactions:update"); }
}
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await bankingUser(true);
    const id = positiveId((await ctx.params).id);
    const [row] = await db.select({ transferId: transactions.transferId }).from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
    if (!row?.transferId) throw new HttpError(409, "Only your pending external payments can be cancelled.");
    return Response.json(await cancelTransfer(user.id, row.transferId), { headers: privateHeaders });
  } catch (error) { return bankingError(error, "transactions:cancel"); }
}
