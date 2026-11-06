import { and, desc, eq, gte, lte, sql, or } from "drizzle-orm";
import { db } from "@/db";
import { accounts, payees, scheduledTransfers, transactions } from "@/db/schema";
import { bankingError, bankingUser, privateHeaders, accountAccess } from "@/lib/banking-server";

export async function GET(req: Request) {
  try {
    const user = await bankingUser();
    const url = new URL(req.url);

    const query = url.searchParams.get("q")?.toLowerCase().trim() || "";
    const category = url.searchParams.get("category") || "all";
    const status = url.searchParams.get("status") || "all";
    const type = url.searchParams.get("type") || "all"; // 'income', 'expense', 'all'
    const accountId = Number(url.searchParams.get("accountId") || 0);
    const startDate = url.searchParams.get("from");
    const endDate = url.searchParams.get("to");

    // Fetch transactions
    let conditions = [accountAccess(user.id)];

    if (category !== "all") {
      conditions.push(eq(transactions.category, category));
    }

    if (status !== "all") {
      conditions.push(eq(transactions.status, status as any));
    }

    if (type === "income") {
      conditions.push(sql`${transactions.kind} IN ('credit', 'transfer_in')`);
    } else if (type === "expense") {
      conditions.push(sql`${transactions.kind} IN ('debit', 'payment', 'transfer_out')`);
    }

    if (accountId > 0) {
      conditions.push(eq(transactions.accountId, accountId));
    }

    if (startDate) {
      conditions.push(gte(transactions.occurredAt, new Date(`${startDate}T00:00:00Z`)));
    }

    if (endDate) {
      conditions.push(lte(transactions.occurredAt, new Date(`${endDate}T23:59:59Z`)));
    }

    const rows = await db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        accountName: accounts.name,
        accountNumber: accounts.accountNumber,
        currency: accounts.currency,
        kind: transactions.kind,
        category: transactions.category,
        description: transactions.description,
        note: transactions.note,
        amountCents: transactions.amountCents,
        status: transactions.status,
        occurredAt: transactions.occurredAt,
        payeeName: payees.name,
        transferId: transactions.transferId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(payees, eq(transactions.payeeId, payees.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt))
      .limit(300);

    // Filter in-memory for description query search
    const filteredRows = query
      ? rows.filter(
          (t) =>
            t.description.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query) ||
            (t.note && t.note.toLowerCase().includes(query)) ||
            (t.payeeName && t.payeeName.toLowerCase().includes(query)) ||
            String(t.id).includes(query)
        )
      : rows;

    // Also fetch scheduled / recurring transactions
    const scheduled = await db
      .select({
        id: scheduledTransfers.id,
        transferType: scheduledTransfers.transferType,
        recipientName: scheduledTransfers.recipientName,
        amountCents: scheduledTransfers.amountCents,
        frequency: scheduledTransfers.frequency,
        nextRunAt: scheduledTransfers.nextRunAt,
        note: scheduledTransfers.note,
        active: scheduledTransfers.active,
      })
      .from(scheduledTransfers)
      .where(eq(scheduledTransfers.userId, user.id));

    return Response.json({
      transactions: filteredRows.map((r) => ({
        ...r,
        reference: `TXN-${String(r.id).padStart(8, "0")}`,
        occurredAt: r.occurredAt.toISOString(),
      })),
      scheduled: scheduled.map((s) => ({
        ...s,
        nextRunAt: s.nextRunAt.toISOString(),
      })),
    }, { headers: privateHeaders });
  } catch (error) {
    return bankingError(error, "transactions:management");
  }
}
