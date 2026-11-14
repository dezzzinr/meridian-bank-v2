import { and, eq, isNull } from "drizzle-orm";
import { accounts, transactions, users } from "../src/db/schema";
import { loadDatabaseEnvironment, printDatabaseTarget } from "./lib/environment";

const DEMO_EMAIL = "demo@meridian.bank";
const BATCH_NOTE = "DEMO_HISTORY_2024_2025_V1";
const COUNT = 50;

const examples = [
  { category: "Groceries", descriptions: ["Greenfield Market", "Oak & Grain", "Fresh Basket"] },
  { category: "Dining", descriptions: ["Café Lumière", "Sakura Ramen", "Market Street Kitchen"] },
  { category: "Transport", descriptions: ["Metro Transit", "Shell Fuel", "City Cab"] },
  { category: "Utilities", descriptions: ["City Power & Light", "Ridgeline Water", "Home Internet"] },
  { category: "Shopping", descriptions: ["Aldergrove Outfitters", "Paper & Pine", "Northstar Home"] },
  { category: "Subscriptions", descriptions: ["CineMax Streaming", "Nimbus Cloud", "WaveAudio"] },
  { category: "Salary", descriptions: ["Northwind Labs payroll", "Monthly salary"] },
  { category: "Other", descriptions: ["Savings interest", "Cashback reward", "Refund"] },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(): Date {
  const start = Date.UTC(2024, 0, 1);
  const end = Date.UTC(2025, 11, 31, 23, 59, 59);
  return new Date(start + Math.floor(Math.random() * (end - start + 1)));
}

async function main() {
  const target = loadDatabaseEnvironment();
  printDatabaseTarget(target);
  if (!target.host.toLowerCase().includes("neon")) {
    throw new Error("This script is intended for Neon. Check that DATABASE_URL points to your Neon database before continuing.");
  }

  // Import only after loading .env.local, because the database module reads DATABASE_URL on import.
  const { db, pool } = await import("../src/db");
  try {
  const [user] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (!user) throw new Error(`Could not find ${DEMO_EMAIL}. Update DEMO_EMAIL in this script to your demo user's email.`);

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), isNull(accounts.closedAt)))
    .limit(1);
  if (!account) throw new Error(`No open account found for ${DEMO_EMAIL}.`);

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), eq(transactions.note, BATCH_NOTE)))
      .limit(1);
    if (existing.length) {
      console.log("This demo transaction batch already exists; no rows were added.");
      return;
    }

    const rows = Array.from({ length: COUNT }, () => {
      const sample = examples[randomInt(0, examples.length - 1)];
      const isIncome = sample.category === "Salary" || sample.category === "Other" && Math.random() < 0.35;
      return {
        userId: user.id,
        accountId: account.id,
        kind: isIncome ? "credit" as const : "debit" as const,
        category: sample.category,
        description: sample.descriptions[randomInt(0, sample.descriptions.length - 1)],
        amountCents: randomInt(350, 18500),
        status: "completed" as const,
        occurredAt: randomDate(),
        // Marker lets the script safely avoid adding this batch a second time.
        note: BATCH_NOTE,
      };
    });
    await tx.insert(transactions).values(rows);
    console.log(`Added ${COUNT} fictional transactions to ${account.name} (${account.currency}).`);
    console.log("Account balances were left unchanged.");
  });
  } finally {
    await pool.end();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Could not add demo transactions.");
    process.exitCode = 1;
  });
