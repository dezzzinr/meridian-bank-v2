import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, notifications, payees, transactions, transfers, users } from "@/db/schema";
import { HttpError, readBody, str } from "@/lib/api";
import { accountAccess, bankingUser, bankingError, lockedActiveUser, positiveId, privateHeaders } from "@/lib/banking-server";
import { isTermLocked, parseAmount } from "@/lib/banking";
import { listTransfers, settleAgedPending } from "@/lib/queries";
import { money } from "@/lib/format";
import { generateRefNumber } from "@/lib/ids";
import { verifyPassword } from "@/lib/password";

export async function GET() {
  try {
    const user = await bankingUser();
    await settleAgedPending();
    return Response.json({ transfers: await listTransfers(user.id) }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "transfers:list"); }
}

export async function POST(req: Request) {
  try {
    const user = await bankingUser(true);
    const body = await readBody(req);
    const sourceId = positiveId(body.sourceAccountId);
    const kind = body.destinationType as "account" | "payee" | "new_recipient";
    const note = body.note == null ? null : str(body.note, 0, 140);
    if (body.note != null && note === null) throw new HttpError(400, "Note must be 140 characters or fewer.");

    // Transaction PIN enforcement if user set one
    if (user.hasTransactionPin && body.transactionPin) {
      const [u] = await db.select({ pinHash: users.transactionPinHash }).from(users).where(eq(users.id, user.id));
      if (u?.pinHash && !verifyPassword(String(body.transactionPin), u.pinHash)) {
        throw new HttpError(403, "Invalid transaction PIN entered.");
      }
    }

    const result = await db.transaction(async (tx) => {
      const owner = await lockedActiveUser(tx, user.id);

      // Verify transaction PIN strictly if set
      if (owner.transactionPinHash) {
        if (!body.transactionPin || !verifyPassword(String(body.transactionPin), owner.transactionPinHash)) {
          throw new HttpError(403, "Incorrect transaction PIN. Transfer cancelled.");
        }
      }

      // 1. Source Account verification
      const [source] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, sourceId), accountAccess(user.id), isNull(accounts.closedAt)))
        .for("update");

      if (!source) throw new HttpError(404, "Source account not found.");
      if (isTermLocked(source)) throw new HttpError(409, "Your fixed deposit is locked until its maturity date.");

      const amount = parseAmount(body.amount, source.currency);
      if (!amount) throw new HttpError(400, "Enter a positive amount in the source account's currency.");
      if (amount > source.balanceCents) throw new HttpError(400, "Insufficient available balance.");

      let destAccount: typeof accounts.$inferSelect | null = null;
      let payeeRow: typeof payees.$inferSelect | null = null;
      let recipientLabel = "";
      let transferType = "internal";
      let status: "completed" | "pending" = "pending";

      if (kind === "account") {
        const destId = positiveId(body.destinationId);
        if (destId === source.id) throw new HttpError(400, "Cannot transfer to the same account.");

        const [dest] = await tx
          .select()
          .from(accounts)
          .where(and(eq(accounts.id, destId), accountAccess(user.id), isNull(accounts.closedAt)))
          .for("update");

        if (!dest) throw new HttpError(404, "Destination account not found.");
        if (dest.currency !== source.currency) throw new HttpError(400, "Transfers between different currencies are not permitted.");
        if (dest.type === "fixed_deposit") throw new HttpError(409, "Fixed deposits cannot be topped up.");

        destAccount = dest;
        recipientLabel = dest.name;
        transferType = "internal";
        status = "completed";
      } else if (kind === "payee") {
        const payeeId = positiveId(body.destinationId);
        const [p] = await tx.select().from(payees).where(and(eq(payees.id, payeeId), eq(payees.userId, user.id)));
        if (!p) throw new HttpError(404, "Selected payee not found.");
        payeeRow = p;
        recipientLabel = p.name;
        transferType = "to_payee";
        status = "pending";
      } else if (kind === "new_recipient") {
        // Direct transfer to new recipient without requiring prior saved payee
        const recipientName = str(body.recipientName, 2, 70);
        const recipientAccountNo = str(body.recipientAccountNo, 4, 34);
        const recipientBank = str(body.recipientBank, 2, 70) || "Direct Bank Transfer";
        const saveAsPayee = Boolean(body.saveAsPayee);

        if (!recipientName) throw new HttpError(400, "Recipient name is required (2-70 characters).");
        if (!recipientAccountNo) throw new HttpError(400, "Recipient account number or IBAN is required.");

        recipientLabel = `${recipientName} (${recipientAccountNo})`;
        transferType = "to_payee";
        status = "pending";

        if (saveAsPayee) {
          const [newP] = await tx.insert(payees).values({
            userId: user.id,
            name: recipientName,
            methodType: "bank",
            methodDetail: `${recipientBank} - ${recipientAccountNo}`,
            notes: "Created during direct transfer",
          }).returning();
          payeeRow = newP;
        }
      } else {
        throw new HttpError(400, "Invalid transfer type.");
      }

      // Record transfer
      const [transfer] = await tx.insert(transfers).values({
        userId: user.id,
        sourceAccountId: source.id,
        destinationAccountId: destAccount?.id,
        payeeId: payeeRow?.id,
        transferType: transferType as any,
        referenceNumber: generateRefNumber(),
        amountCents: amount,
        note,
        status,
        completedAt: status === "completed" ? new Date() : null,
      }).returning();

      // Record transaction for source
      await tx.insert(transactions).values({
        userId: user.id,
        accountId: source.id,
        transferId: transfer.id,
        payeeId: payeeRow?.id,
        kind: destAccount ? "transfer_out" : "payment",
        category: destAccount ? "Transfers" : "Other",
        description: `${destAccount ? "Transfer" : "Payment"} to ${recipientLabel}`,
        note,
        amountCents: amount,
        status: status === "completed" ? "completed" : "pending",
      });

      // Deduct balance
      await tx.update(accounts).set({ balanceCents: sql`${accounts.balanceCents} - ${amount}` }).where(eq(accounts.id, source.id));

      // Credit destination if internal
      if (destAccount) {
        await tx.update(accounts).set({ balanceCents: sql`${accounts.balanceCents} + ${amount}` }).where(eq(accounts.id, destAccount.id));
        await tx.insert(transactions).values({
          userId: user.id,
          accountId: destAccount.id,
          transferId: transfer.id,
          kind: "transfer_in",
          category: "Transfers",
          description: `Transfer from ${source.name}`,
          note,
          amountCents: amount,
          status: "completed",
        });
      }

      // Notification
      await tx.insert(notifications).values({
        userId: user.id,
        type: destAccount ? "transfer" : "payment",
        title: destAccount ? "Transfer completed" : "Payment processing",
        body: `${money(amount, source.currency)} from ${source.name} to ${recipientLabel}. Ref: ${transfer.referenceNumber}.`,
      });

      return transfer;
    });

    return Response.json(
      { id: result.id, status: result.status, referenceNumber: result.referenceNumber },
      { status: 201, headers: privateHeaders }
    );
  } catch (error) {
    return bankingError(error, "transfers:create");
  }
}
