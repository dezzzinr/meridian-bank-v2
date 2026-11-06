import { loadDatabaseEnvironment, printDatabaseTarget } from "./lib/environment";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function main() {
  const target = loadDatabaseEnvironment();
  printDatabaseTarget(target);
  if (!["127.0.0.1", "localhost", "::1"].includes(target.host) && !process.argv.includes("--allow-demo-data")) throw new Error("Remote database detected. This optional demo enhancement requires --allow-demo-data. It is not required for deployment.");
  const { db, pool } = await import("@/db");
  try {
    const { users, accounts, cards, cardActivity, notifications, transactions } = await import("@/db/schema");
    const { demoCardNumber } = await import("@/lib/cards");
    const { generateAccountNumber } = await import("@/lib/ids");
    const { termMaturity } = await import("@/lib/banking");
    const [user] = await db.select().from(users).where(eq(users.email, "demo@meridian.bank"));
    if (!user || user.status !== "active") { console.log("No active demo user found. No changes made."); return; }
    await db.transaction(async (tx) => {
      await tx.select().from(users).where(eq(users.id, user.id)).for("update");
      const [main] = await tx.select().from(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.type, "checking"), isNull(accounts.closedAt)));
      if (!main) { console.log("Demo checking account not found. No changes made."); return; }
      const existing = await tx.select({ id: cards.id }).from(cards).where(eq(cards.userId, user.id));
      if (!existing.length) {
        const now = new Date();
        const a = demoCardNumber(); const b = demoCardNumber();
        const [virtual] = await tx.insert(cards).values([
          { userId: user.id, accountId: main.id, kind: "virtual", name: "Everyday card", holderName: user.name, demoNumber: a, last4: a.slice(-4), expiryMonth: 9, expiryYear: now.getUTCFullYear() + 3, dailyLimitCents: 150000, monthlyLimitCents: 600000, status: "active", onlineEnabled: true },
          { userId: user.id, accountId: main.id, kind: "physical", name: "On-the-go card", holderName: user.name, demoNumber: b, last4: b.slice(-4), expiryMonth: 9, expiryYear: now.getUTCFullYear() + 3, status: "active", deliveryAddress: "Demo delivery only, 18 Maple Street, Seattle", internationalEnabled: false },
        ]).returning({ id: cards.id });
        // Link a few existing demo purchases: balances/history are NOT reset or debited again.
        const purchases = await tx.select().from(transactions).where(and(eq(transactions.accountId, main.id), eq(transactions.kind, "debit"), eq(transactions.status, "completed"), lt(transactions.amountCents, 10000), isNull(transactions.cardId))).orderBy(desc(transactions.occurredAt)).limit(5);
        for (const purchase of purchases) {
          await tx.update(transactions).set({ cardId: virtual.id }).where(eq(transactions.id, purchase.id));
          await tx.insert(cardActivity).values({ userId: user.id, cardId: virtual.id, transactionId: purchase.id, merchant: purchase.description, amountCents: purchase.amountCents, channel: "online", status: "completed", reference: `CARD-${randomUUID().toUpperCase()}`, occurredAt: purchase.occurredAt });
        }
        await tx.insert(notifications).values({ userId: user.id, type: "account", title: "Meet your Meridian cards", body: "Your demo cards are ready in Cards. Freeze them, set a PIN, adjust limits or run a test payment. No real payment card is issued." });
      }
      for (const definition of [
        { name: "European adventures", type: "foreign_currency" as const, currency: "EUR", amount: 125000, months: null },
        { name: "Future fund", type: "fixed_deposit" as const, currency: user.currency, amount: 500000, months: 6 },
      ]) {
        const [found] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.name, definition.name)));
        if (found) continue;
        const number = generateAccountNumber();
        const [created] = await tx.insert(accounts).values({ userId: user.id, name: definition.name, type: definition.type, currency: definition.currency, balanceCents: definition.amount, accountNumber: number, last4: number.slice(-4), termMonths: definition.months, interestRateBps: definition.months ? 400 : null, maturityAt: definition.months ? termMaturity(definition.months) : null }).returning({ id: accounts.id });
        await tx.insert(transactions).values({ userId: user.id, accountId: created.id, kind: "credit", description: "Demo opening deposit", category: "Other", amountCents: definition.amount, status: "completed" });
      }
    });
    console.log("Optional demo enhancement complete. Existing users/history preserved; no balances reset and no roles changed.");
  } finally { await pool.end(); }
}
main().catch((e) => { console.error(e instanceof Error && !e.message.includes("query") ? e.message : "Demo enhancement failed. Verify the schema upgrade first."); process.exitCode = 1; });
