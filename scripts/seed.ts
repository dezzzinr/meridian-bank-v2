import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  accounts,
  notifications,
  payees,
  sessions,
  transactions,
  transfers,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { generateAccountNumber, generateRefNumber } from "../src/lib/ids";

const DAY = 86_400_000;
const ago = (days: number, hours = 0) =>
  new Date(Date.now() - days * DAY - hours * 3_600_000);

type AcctKey = "a1" | "a2" | "a3" | "b1" | "b2";

const ACCT_NAMES: Record<AcctKey, string> = {
  a1: "Everyday Checking",
  a2: "High-Yield Savings",
  a3: "Trip Fund",
  b1: "Personal Checking",
  b2: "Backup Savings",
};

interface Leg {
  daysAgo: number;
  account: AcctKey;
  kind: "credit" | "debit" | "payment";
  category: string;
  description: string;
  amount: number; // dollars
  payee?: string;
  note?: string;
  pending?: boolean;
  hoursAgo?: number;
}

async function main() {
  // Wipe
  await db.delete(notifications);
  await db.delete(sessions);
  await db.delete(transactions);
  await db.delete(transfers);
  await db.delete(payees);
  await db.delete(accounts);
  await db.delete(users);

  // Users
  const [demo] = await db
    .insert(users)
    .values({
      name: "Dana Whitfield",
      email: "demo@meridian.bank",
      passwordHash: hashPassword("demo1234"),
      role: "admin",
      currency: "USD",
      region: "United States",
    })
    .returning();
  const [sam] = await db
    .insert(users)
    .values({
      name: "Sam Okafor",
      email: "sam@meridian.bank",
      passwordHash: hashPassword("demo1234"),
      role: "user",
      currency: "NGN",
      region: "Nigeria",
    })
    .returning();

  // Payees
  const demoPayees = [
    { key: "jordan", name: "Jordan Ellis", methodType: "bank", methodDetail: "1004558830", notes: "Apartment split" },
    { key: "cafe", name: "Café Lumière", methodType: "bank", methodDetail: "1008732210", notes: null },
    { key: "power", name: "City Power & Light", methodType: "bank", methodDetail: "2001174455", notes: "Auto-pay monthly" },
    { key: "water", name: "Ridgeline Water & Sewer", methodType: "bank", methodDetail: "2009021177", notes: null },
    { key: "nimbus", name: "Nimbus Cloud", methodType: "bank", methodDetail: "3010093204", notes: "Team plan" },
    { key: "metro", name: "Metro Transit", methodType: "mobile", methodDetail: "+1 555 0142", notes: "Rider card" },
    { key: "mom", name: "E. Whitfield (Mom)", methodType: "email", methodDetail: "ellen.whitfield@example.com", notes: null },
  ] as const;
  const payeeIds: Record<string, number> = {};
  for (const p of demoPayees) {
    const [row] = await db
      .insert(payees)
      .values({
        userId: demo.id,
        name: p.name,
        methodType: p.methodType,
        methodDetail: p.methodDetail,
        notes: p.notes,
      })
      .returning();
    payeeIds[p.key] = row.id;
  }
  await db
    .insert(payees)
    .values({
      userId: sam.id,
      name: "A. Okafor",
      methodType: "email",
      methodDetail: "amina.okafor@example.com",
      notes: "Weekly grocery split",
    });

  // Accounts (starting balances in cents)
  const starts: Record<AcctKey, number> = {
    a1: 640_000,
    a2: 2_250_000,
    a3: 185_000,
    b1: 210_000,
    b2: 800_000,
  };
  const acctIds: Record<AcctKey, number> = {
    a1: 0, a2: 0, a3: 0, b1: 0, b2: 0,
  };
  const owner: Record<AcctKey, number> = {
    a1: demo.id, a2: demo.id, a3: demo.id, b1: sam.id, b2: sam.id,
  };
  const acctDefs: { key: AcctKey; type: "checking" | "savings"; last4: string }[] = [
    { key: "a1", type: "checking", last4: "4821" },
    { key: "a2", type: "savings", last4: "7734" },
    { key: "a3", type: "savings", last4: "2096" },
    { key: "b1", type: "checking", last4: "7302" },
    { key: "b2", type: "savings", last4: "5581" },
  ];
  for (const def of acctDefs) {
    const [row] = await db
      .insert(accounts)
      .values({
        userId: owner[def.key],
        name: ACCT_NAMES[def.key],
        currency: def.key.startsWith("b") ? "NGN" : "USD",
        accountNumber: generateAccountNumber(),
        type: def.type,
        last4: def.last4,
        balanceCents: starts[def.key],
      })
      .returning();
    acctIds[def.key] = row.id;
  }

  const delta: Record<number, number> = {};
  const bump = (account: AcctKey, cents: number) => {
    const id = acctIds[account];
    delta[id] = (delta[id] ?? 0) + cents;
  };
  const cents = (dollars: number) => Math.round(dollars * 100);

  // Internal transfers
  const internalTransfers: {
    daysAgo: number;
    from: AcctKey;
    to: AcctKey;
    amount: number;
    note: string | null;
  }[] = [
    { daysAgo: 60, from: "a1", to: "a2", amount: 1500, note: "Monthly sweep" },
    { daysAgo: 29, from: "a1", to: "a2", amount: 1200, note: "Monthly sweep" },
    { daysAgo: 12, from: "a1", to: "a2", amount: 1000, note: "Monthly sweep" },
    { daysAgo: 10, from: "a2", to: "a3", amount: 800, note: "Trip top-up" },
    { daysAgo: 20, from: "b1", to: "b2", amount: 500, note: null },
  ];
  for (const tr of internalTransfers) {
    const [t] = await db
      .insert(transfers)
      .values({
        userId: owner[tr.from],
        sourceAccountId: acctIds[tr.from],
        destinationAccountId: acctIds[tr.to],
        transferType: "internal",
        referenceNumber: generateRefNumber(),
        amountCents: cents(tr.amount),
        note: tr.note,
        status: "completed",
      })
      .returning();
    const ts = ago(tr.daysAgo);
    await db.insert(transactions).values([
      {
        userId: owner[tr.from],
        accountId: acctIds[tr.from],
        transferId: t.id,
        kind: "transfer_out",
        category: "Transfers",
        description: `Transfer to ${ACCT_NAMES[tr.to]}`,
        note: tr.note,
        amountCents: cents(tr.amount),
        status: "completed",
        occurredAt: ts,
      },
      {
        userId: owner[tr.to],
        accountId: acctIds[tr.to],
        transferId: t.id,
        kind: "transfer_in",
        category: "Transfers",
        description: `Transfer from ${ACCT_NAMES[tr.from]}`,
        note: tr.note,
        amountCents: cents(tr.amount),
        status: "completed",
        occurredAt: ts,
      },
    ]);
    bump(tr.from, -cents(tr.amount));
    bump(tr.to, cents(tr.amount));
  }

  // Everyday transactions
  const legs: Leg[] = [
    // Salary
    { daysAgo: 70, account: "a1", kind: "credit", category: "Salary", description: "Northwind Labs payroll", amount: 4250 },
    { daysAgo: 40, account: "a1", kind: "credit", category: "Salary", description: "Northwind Labs payroll", amount: 4250 },
    { daysAgo: 9, account: "a1", kind: "credit", category: "Salary", description: "Northwind Labs payroll", amount: 4250 },
    // Rent
    { daysAgo: 66, account: "a1", kind: "debit", category: "Rent", description: "Harbor Flats — rent", amount: 1650 },
    { daysAgo: 36, account: "a1", kind: "debit", category: "Rent", description: "Harbor Flats — rent", amount: 1650 },
    { daysAgo: 6, account: "a1", kind: "debit", category: "Rent", description: "Harbor Flats — rent", amount: 1650 },
    // Groceries
    { daysAgo: 58, account: "a1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 86.4 },
    { daysAgo: 49, account: "a1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 72.15 },
    { daysAgo: 41, account: "a1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 93.08 },
    { daysAgo: 34, account: "a1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 68.4 },
    { daysAgo: 26, account: "a1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 81.22 },
    { daysAgo: 17, account: "a1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 77.9 },
    { daysAgo: 8, account: "a1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 90.35 },
    // Dining
    { daysAgo: 52, account: "a1", kind: "debit", category: "Dining", description: "Sakura Ramen", amount: 24.5 },
    { daysAgo: 44, account: "a1", kind: "debit", category: "Dining", description: "Café Lumière", amount: 18.75, payee: "cafe" },
    { daysAgo: 33, account: "a1", kind: "debit", category: "Dining", description: "Sakura Ramen", amount: 31.2 },
    { daysAgo: 22, account: "a1", kind: "debit", category: "Dining", description: "Café Lumière", amount: 22.0, payee: "cafe" },
    { daysAgo: 11, account: "a1", kind: "debit", category: "Dining", description: "Sakura Ramen", amount: 42.8 },
    { daysAgo: 3, account: "a1", kind: "debit", category: "Dining", description: "Café Lumière", amount: 19.4, payee: "cafe" },
    // Utilities
    { daysAgo: 63, account: "a1", kind: "debit", category: "Utilities", description: "City Power & Light", amount: 96.2, payee: "power" },
    { daysAgo: 33, account: "a1", kind: "debit", category: "Utilities", description: "City Power & Light", amount: 104.8, payee: "power" },
    { daysAgo: 3, account: "a1", kind: "debit", category: "Utilities", description: "City Power & Light", amount: 88.4, payee: "power" },
    { daysAgo: 48, account: "a1", kind: "debit", category: "Utilities", description: "Ridgeline Water & Sewer", amount: 36.9, payee: "water" },
    // Subscriptions
    { daysAgo: 55, account: "a1", kind: "debit", category: "Subscriptions", description: "Nimbus Cloud", amount: 29.0, payee: "nimbus" },
    { daysAgo: 25, account: "a1", kind: "debit", category: "Subscriptions", description: "Nimbus Cloud", amount: 29.0, payee: "nimbus" },
    { daysAgo: 15, account: "a1", kind: "debit", category: "Subscriptions", description: "CineMax Streaming", amount: 15.99 },
    { daysAgo: 5, account: "a1", kind: "debit", category: "Subscriptions", description: "CineMax Streaming", amount: 15.99 },
    { daysAgo: 18, account: "a1", kind: "debit", category: "Subscriptions", description: "WaveAudio", amount: 10.99 },
    // Transport
    { daysAgo: 46, account: "a1", kind: "debit", category: "Transport", description: "Metro Transit top-up", amount: 40.0, payee: "metro" },
    { daysAgo: 20, account: "a1", kind: "debit", category: "Transport", description: "Shell Fuel", amount: 54.3 },
    // Health & shopping
    { daysAgo: 38, account: "a1", kind: "debit", category: "Health", description: "Riverside Pharmacy", amount: 24.15 },
    { daysAgo: 28, account: "a1", kind: "debit", category: "Shopping", description: "Aldergrove Outfitters", amount: 129.0 },
    { daysAgo: 14, account: "a1", kind: "debit", category: "Shopping", description: "Paper & Pine Stationers", amount: 64.5 },
    // Savings account credits
    { daysAgo: 50, account: "a2", kind: "credit", category: "Other", description: "Savings interest", amount: 12.04 },
    { daysAgo: 20, account: "a2", kind: "credit", category: "Other", description: "Savings interest", amount: 11.86 },
    { daysAgo: 24, account: "a2", kind: "credit", category: "Other", description: "Tax refund", amount: 310.44 },
    // Sam's life
    { daysAgo: 12, account: "b1", kind: "credit", category: "Salary", description: "Copperline Studio payroll", amount: 4850 },
    { daysAgo: 8, account: "b1", kind: "debit", category: "Rent", description: "Beacon House — rent", amount: 1400 },
    { daysAgo: 4, account: "b1", kind: "debit", category: "Groceries", description: "Greenfield Market", amount: 64.1 },
    { daysAgo: 2, account: "b1", kind: "debit", category: "Dining", description: "Café Lumière", amount: 32.7 },
  ];

  for (const leg of legs) {
    await db.insert(transactions).values({
      userId: owner[leg.account],
      accountId: acctIds[leg.account],
      payeeId: leg.payee ? payeeIds[leg.payee] : null,
      kind: leg.kind,
      category: leg.category,
      description: leg.description,
      note: leg.note ?? null,
      amountCents: cents(leg.amount),
      status: "completed",
      occurredAt: ago(leg.daysAgo, leg.hoursAgo ?? 0),
    });
    if (leg.kind === "credit") bump(leg.account, cents(leg.amount));
    else bump(leg.account, -cents(leg.amount));
  }

  // One pending external payment (settles after 10 min for the demo)
  const [pendingTr] = await db
    .insert(transfers)
    .values({
      userId: demo.id,
      sourceAccountId: acctIds.a1,
      payeeId: payeeIds.jordan,
        transferType: "to_payee",
        referenceNumber: generateRefNumber(),
      amountCents: cents(240),
      note: "Dinner split — Saturday",
      status: "pending",
    })
    .returning();
  await db.insert(transactions).values({
    userId: demo.id,
    accountId: acctIds.a1,
    transferId: pendingTr.id,
    payeeId: payeeIds.jordan,
    kind: "payment",
    category: "Dining",
    description: "Payment to Jordan Ellis",
    note: "Dinner split — Saturday",
    amountCents: cents(240),
    status: "pending",
    occurredAt: ago(0, 0.1), // ~6 minutes ago
  });
  bump("a1", -cents(240));

  // Apply final balances
  for (const key of Object.keys(acctIds) as AcctKey[]) {
    const id = acctIds[key];
    await db
      .update(accounts)
      .set({ balanceCents: starts[key] + (delta[id] ?? 0) })
      .where(eq(accounts.id, id));
  }

  // Demo notifications
  await db.insert(notifications).values([
    {
      userId: demo.id,
      type: "admin_message",
      title: "Welcome to Meridian",
      body: "You have admin access — open the Admin Console from the sidebar to manage users and send messages.",
      createdBy: demo.id,
    },
    {
      userId: demo.id,
      type: "security",
      title: "New sign-in",
      body: "We noticed a new sign-in to your account. If this wasn't you, change your password.",
    },
    {
      userId: sam.id,
      type: "account",
      title: "Region set",
      body: "An administrator set your region to Nigeria. Balances now display in NGN.",
      createdBy: demo.id,
    },
  ]);

  console.log("Seed complete.");
  const check = (key: AcctKey) =>
    `${ACCT_NAMES[key]}: $${((starts[key] + (delta[acctIds[key]] ?? 0)) / 100).toLocaleString("en-US")}`;
  console.log(`  Dana (demo@meridian.bank / demo1234)`);
  console.log("   " + check("a1"));
  console.log("   " + check("a2"));
  console.log("   " + check("a3"));
  console.log(`  Sam (sam@meridian.bank / demo1234)`);
  console.log("   " + check("b1"));
  console.log("   " + check("b2"));
  await db.$client.end();
}

main().catch(async (e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
