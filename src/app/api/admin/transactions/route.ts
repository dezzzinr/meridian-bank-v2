import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, notifications, transactions, users } from "@/db/schema";
import { apiError, readBody, requireAdmin, str } from "@/lib/api";
import { positiveId } from "@/lib/banking-server";
import { parseAmount } from "@/lib/banking";
import { money } from "@/lib/format";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const body = await readBody(req);
  const userId = positiveId(body.userId);
  const accountId = positiveId(body.accountId);
  const kind = String(body.kind || "credit") as "credit" | "debit" | "payment" | "transfer_in" | "transfer_out";
  const category = str(body.category, 1, 50) || "Other";
  const description = str(body.description, 2, 100);
  const note = body.note ? str(body.note, 0, 140) : null;
  const status = (["completed", "pending", "voided"].includes(String(body.status))
    ? body.status
    : "completed") as "completed" | "pending" | "voided";

  if (!description) return apiError(400, "Description is required (2-100 characters).");

  // Validate custom timestamp
  let customDate = new Date();
  if (body.customDate) {
    const parsed = new Date(String(body.customDate));
    if (isNaN(parsed.getTime())) {
      return apiError(400, "Invalid timestamp provided.");
    }
    customDate = parsed;
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) return apiError(404, "Target user account not found.");

  const amountCents = parseAmount(body.amount, account.currency);
  if (!amountCents || amountCents <= 0) {
    return apiError(400, "Valid positive transaction amount is required.");
  }

  const isCredit = kind === "credit" || kind === "transfer_in";

  // Check if balance adjustment is requested (defaults to true for completed transactions)
  const adjustBalance = body.adjustBalance !== false && status === "completed";

  const result = await db.transaction(async (tx) => {
    // Insert transaction with customized historical or future date
    const [txRow] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: account.id,
        kind,
        category,
        description,
        note: note || (admin ? `Admin posted (${admin.name})` : null),
        amountCents,
        status,
        occurredAt: customDate,
      })
      .returning();

    // Adjust balance if requested and completed
    if (adjustBalance) {
      if (isCredit) {
        await tx
          .update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} + ${amountCents}` })
          .where(eq(accounts.id, account.id));
      } else {
        await tx
          .update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} - ${amountCents}` })
          .where(eq(accounts.id, account.id));
      }
    }

    // Log notification for the user
    await tx.insert(notifications).values({
      userId,
      type: "account",
      title: isCredit ? "Account Credited" : "Account Debited",
      body: `${isCredit ? "+" : "-"}${money(amountCents, account.currency)} on ${account.name}: ${description}. Ref: TXN-${String(txRow.id).padStart(8, "0")}`,
      createdBy: admin.id,
    });

    return txRow;
  });

  return Response.json({
    ok: true,
    transaction: {
      id: result.id,
      reference: `TXN-${String(result.id).padStart(8, "0")}`,
      amountCents: result.amountCents,
      occurredAt: result.occurredAt.toISOString(),
      status: result.status,
    },
  }, { status: 201 });
}
