import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accountMembers, accounts, notifications, users } from "@/db/schema";
import { HttpError, readBody } from "@/lib/api";
import { bankingError, bankingUser, lockedActiveUser, positiveId, privateHeaders } from "@/lib/banking-server";

export async function GET() {
  try {
    const user = await bankingUser();
    const rows = await db.select({ id: accountMembers.id, accountId: accounts.id, accountName: accounts.name, ownerName: users.name, currency: accounts.currency, status: accountMembers.status, createdAt: accountMembers.createdAt })
      .from(accountMembers).innerJoin(accounts, eq(accounts.id, accountMembers.accountId)).innerJoin(users, eq(users.id, accounts.userId))
      .where(and(eq(accountMembers.userId, user.id), eq(accountMembers.status, "pending"), isNull(accounts.closedAt))).orderBy(desc(accountMembers.createdAt));
    return Response.json({ invitations: rows }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "invitations:list"); }
}
export async function PATCH(req: Request) {
  try {
    const user = await bankingUser(true);
    const body = await readBody(req);
    const id = positiveId(body.id);
    if (!["accepted", "declined"].includes(String(body.status))) throw new HttpError(400, "Choose accept or decline.");
    const status = body.status as "accepted" | "declined";
    await db.transaction(async (tx) => {
      await lockedActiveUser(tx, user.id);
      const [invitation] = await tx.select().from(accountMembers).where(and(eq(accountMembers.id, id), eq(accountMembers.userId, user.id))).for("update");
      if (!invitation || invitation.status !== "pending") throw new HttpError(409, "This invitation is no longer pending.");
      const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, invitation.accountId), isNull(accounts.closedAt))).for("update");
      if (!account) throw new HttpError(409, "The account has been closed.");
      await tx.update(accountMembers).set({ status, respondedAt: new Date() }).where(eq(accountMembers.id, id));
      await tx.insert(notifications).values([
        { userId: user.id, type: "account", title: `Invitation ${status}`, body: status === "accepted" ? `You can now access ${account.name}, its balance and statements, and make payments from it.` : `You declined the invitation to ${account.name}.` },
        { userId: account.userId, type: "account", title: `Joint invitation ${status}`, body: `${user.name} ${status} your invitation to ${account.name}.`, createdBy: user.id },
      ]);
    });
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "invitations:respond"); }
}
