import { and, asc, desc, eq, gt, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { accounts, accountMembers, payees, transactions, transfers, users } from "@/db/schema";
import { accountAccess } from "./banking-server";
import { isTermLocked, type AccountType } from "./banking";
import { convert } from "./exchange";

export interface AccountDTO {
  id: number; name: string; type: AccountType; currency: string; accountNumber: string;
  last4: string; balanceCents: number; createdAt: string; closedAt: string | null;
  termMonths: number | null; interestRateBps: number | null; maturityAt: string | null;
  ownerId: number; ownerName: string; isOwner: boolean;
  members: { id: number; name: string; email: string; status: "pending" | "accepted" | "declined" }[];
}
export interface TransactionDTO {
  id: number; accountId: number; accountName: string | null; accountType: AccountType | null;
  currency: string; cardId: number | null;
  kind: "credit" | "debit" | "payment" | "transfer_in" | "transfer_out";
  category: string; description: string; note: string | null; amountCents: number;
  status: "pending" | "completed" | "voided"; occurredAt: string;
  payeeName: string | null; transferId: number | null;
}
export interface TransferDTO {
  id: number; referenceNumber: string; transferType: string; currency: string;
  amountCents: number; feeCents: number; note: string | null;
  status: "pending" | "processing" | "completed" | "voided" | "failed";
  createdAt: string; sourceAccountId: number; sourceAccountName: string | null;
  destinationAccountId: number | null; destinationAccountName: string | null; payeeName: string | null;
  canCancel: boolean;
}
export interface PayeeDTO {
  id: number; name: string; methodType: "bank" | "email" | "mobile";
  methodDetail: string; notes: string | null; createdAt: string;
}
export function toAccountDTO(a: typeof accounts.$inferSelect, viewerId = a.userId, ownerName = ""): AccountDTO {
  return {
    id: a.id, name: a.name, type: a.type, currency: a.currency, accountNumber: a.accountNumber,
    last4: a.last4, balanceCents: a.balanceCents, createdAt: a.createdAt.toISOString(),
    closedAt: a.closedAt?.toISOString() ?? null, termMonths: a.termMonths,
    interestRateBps: a.interestRateBps, maturityAt: a.maturityAt?.toISOString() ?? null,
    ownerId: a.userId, ownerName, isOwner: a.userId === viewerId, members: [],
  };
}

/** Demo settlement is request-driven, not a real payment network. */
export async function settleAgedPending(): Promise<void> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  await db.transaction(async (tx) => {
    const done = await tx.update(transfers).set({ status: "completed", completedAt: new Date() })
      .where(and(eq(transfers.status, "pending"), lt(transfers.createdAt, cutoff), isNull(transfers.scheduledFor)))
      .returning({ id: transfers.id });
    if (done.length) await tx.update(transactions).set({ status: "completed" })
      .where(and(inArray(transactions.transferId, done.map((row) => row.id)), eq(transactions.status, "pending")));
  });
}

export async function listAccounts(userId: number, includeClosed = false): Promise<AccountDTO[]> {
  const rows = await db.select({ account: accounts, ownerName: users.name }).from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(and(accountAccess(userId), includeClosed ? undefined : isNull(accounts.closedAt)))
    .orderBy(asc(accounts.createdAt));
  if (!rows.length) return [];
  const members = await db.select({ accountId: accountMembers.accountId, id: accountMembers.id, name: users.name, email: users.email, status: accountMembers.status })
    .from(accountMembers).innerJoin(users, eq(accountMembers.userId, users.id))
    .where(inArray(accountMembers.accountId, rows.map(({ account }) => account.id)));
  return rows.map(({ account, ownerName }) => ({
    ...toAccountDTO(account, userId, ownerName),
    members: members.filter((member) => member.accountId === account.id).map(({ accountId: _id, ...member }) => member),
  }));
}

export async function listTransactions(userId: number, limit = 300): Promise<TransactionDTO[]> {
  const rows = await db.select({
    id: transactions.id, accountId: transactions.accountId, accountName: accounts.name,
    accountType: accounts.type, currency: accounts.currency, cardId: transactions.cardId,
    kind: transactions.kind, category: transactions.category, description: transactions.description,
    note: transactions.note, amountCents: transactions.amountCents, status: transactions.status,
    occurredAt: transactions.occurredAt, payeeName: payees.name, transferId: transactions.transferId,
  }).from(transactions).innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(payees, eq(transactions.payeeId, payees.id)).where(accountAccess(userId))
    .orderBy(desc(transactions.occurredAt), desc(transactions.id)).limit(Math.max(1, Math.min(500, limit)));
  return rows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() }));
}

export async function listPayees(userId: number): Promise<PayeeDTO[]> {
  const rows = await db.select().from(payees).where(eq(payees.userId, userId)).orderBy(asc(payees.name));
  return rows.map((row) => ({ id: row.id, name: row.name, methodType: row.methodType, methodDetail: row.methodDetail, notes: row.notes, createdAt: row.createdAt.toISOString() }));
}

export async function listTransfers(userId: number): Promise<TransferDTO[]> {
  const accessible = await listAccounts(userId, true);
  const names = new Map(accessible.map((account) => [account.id, account.name]));
  const rows = await db.select({ transfer: transfers, accountName: accounts.name, currency: accounts.currency, payeeName: payees.name })
    .from(transfers).innerJoin(accounts, eq(transfers.sourceAccountId, accounts.id))
    .leftJoin(payees, eq(transfers.payeeId, payees.id))
    .where(or(eq(transfers.userId, userId), accountAccess(userId)))
    .orderBy(desc(transfers.createdAt), desc(transfers.id));
  return rows.map(({ transfer: t, accountName, currency, payeeName }) => ({
    id: t.id, referenceNumber: t.referenceNumber, transferType: t.transferType, currency,
    amountCents: t.amountCents, feeCents: t.feeCents, note: t.note, status: t.status,
    createdAt: t.createdAt.toISOString(), sourceAccountId: t.sourceAccountId, sourceAccountName: accountName,
    destinationAccountId: t.destinationAccountId,
    destinationAccountName: t.destinationAccountId ? names.get(t.destinationAccountId) ?? "Another account" : null,
    payeeName: payeeName ?? t.recipientName ?? "Removed payee", canCancel: t.userId === userId && t.status === "pending",
  }));
}

export interface DashboardData {
  accounts: AccountDTO[]; totalCents: number; savingsCents: number; availableCents: number;
  income30: number; spend30: number; pendingCount: number; pendingCents: number;
  weeks: { label: string; cents: number }[];
  monthly: { label: string; income: number; spend: number }[];
  byCategory: { category: string; cents: number }[];
  recent: TransactionDTO[]; baseCurrency: string; hasForeignCurrency: boolean;
}
const DAY = 86_400_000;
export async function dashboard(userId: number): Promise<DashboardData> {
  await settleAgedPending();
  const acctList = await listAccounts(userId);
  const [owner] = await db.select({ currency: users.currency }).from(users).where(eq(users.id, userId));
  const baseCurrency = owner?.currency ?? "USD";
  const inBase = (amount: number, currency: string) => convert(amount, currency, baseCurrency);
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since6Months = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const rows = await db.select({ transaction: transactions, currency: accounts.currency }).from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(accountAccess(userId), gt(transactions.occurredAt, since6Months), ne(transactions.status, "voided")));
  const txs = rows.map(({ transaction, currency }) => ({ ...transaction, amountCents: inBase(transaction.amountCents, currency) }));
  const spend = (kind: string) => kind === "debit" || kind === "payment";
  const income30 = txs.filter((t) => t.kind === "credit" && t.occurredAt >= since30).reduce((s, t) => s + t.amountCents, 0);
  const spend30 = txs.filter((t) => spend(t.kind) && t.occurredAt >= since30).reduce((s, t) => s + t.amountCents, 0);
  const pending = txs.filter((t) => t.status === "pending" && (spend(t.kind) || t.kind === "transfer_out"));
  const pendingCents = pending.reduce((s, t) => s + t.amountCents, 0);
  const availableCents = acctList.filter((a) => !isTermLocked(a)).reduce((s, a) => s + inBase(a.balanceCents, a.currency), 0);
  const totalCents = acctList.reduce((s, a) => s + inBase(a.balanceCents, a.currency), 0);
  const savingsCents = acctList.filter((a) => ["savings", "fixed_deposit"].includes(a.type)).reduce((s, a) => s + inBase(a.balanceCents, a.currency), 0);
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(now.getTime() - (8 - index) * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    return { label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), cents: txs.filter((t) => spend(t.kind) && t.occurredAt > start && t.occurredAt <= end).reduce((s, t) => s + t.amountCents, 0) };
  });
  const categoryMap = new Map<string, number>();
  txs.filter((t) => spend(t.kind) && t.occurredAt >= since30).forEach((t) => categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amountCents));
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const month = txs.filter((t) => t.occurredAt >= start && t.occurredAt < end);
    return { label: start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), income: month.filter((t) => t.kind === "credit").reduce((s, t) => s + t.amountCents, 0), spend: month.filter((t) => spend(t.kind)).reduce((s, t) => s + t.amountCents, 0) };
  });
  return {
    accounts: acctList, totalCents, savingsCents, availableCents, income30, spend30,
    pendingCount: pending.length, pendingCents, weeks, monthly,
    byCategory: [...categoryMap.entries()].sort((a, b) => b[1] - a[1]).map(([category, cents]) => ({ category, cents })),
    recent: await listTransactions(userId, 6), baseCurrency,
    hasForeignCurrency: acctList.some((a) => a.currency !== baseCurrency),
  };
}
