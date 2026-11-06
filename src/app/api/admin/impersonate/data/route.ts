import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, beneficiaries, cards, payees, transactions, transfers, users } from "@/db/schema";
import { apiError, requireAdmin, str } from "@/lib/api";
import { positiveId } from "@/lib/banking-server";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const url = new URL(req.url);
  const userId = positiveId(url.searchParams.get("userId"));

  const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!targetUser) return apiError(404, "User not found.");

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.closedAt)))
    .orderBy(accounts.createdAt);

  const userCards = await db
    .select({
      card: cards,
      accountName: accounts.name,
      currency: accounts.currency,
    })
    .from(cards)
    .innerJoin(accounts, eq(cards.accountId, accounts.id))
    .where(eq(cards.userId, userId))
    .orderBy(desc(cards.createdAt));

  const userPayees = await db
    .select()
    .from(payees)
    .where(eq(payees.userId, userId))
    .orderBy(payees.name);

  const userBeneficiaries = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.userId, userId))
    .orderBy(beneficiaries.recipientName);

  const recentTransactions = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      accountName: accounts.name,
      currency: accounts.currency,
      kind: transactions.kind,
      category: transactions.category,
      description: transactions.description,
      note: transactions.note,
      amountCents: transactions.amountCents,
      status: transactions.status,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.occurredAt))
    .limit(30);

  return Response.json({
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
      currency: targetUser.currency,
      region: targetUser.region,
      avatarUrl: targetUser.avatarUrl,
      accountLocked: targetUser.accountLocked,
      hasTransactionPin: Boolean(targetUser.transactionPinHash),
      hasSecurityQuestion: Boolean(targetUser.securityQuestion),
    },
    accounts: userAccounts,
    cards: userCards.map(({ card, accountName, currency }) => ({
      id: card.id,
      accountId: card.accountId,
      accountName,
      currency,
      kind: card.kind,
      name: card.name,
      holderName: card.holderName,
      demoNumber: card.demoNumber,
      last4: card.last4,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      status: card.status,
      onlineEnabled: card.onlineEnabled,
      internationalEnabled: card.internationalEnabled,
      atmEnabled: card.atmEnabled,
      dailyLimitCents: card.dailyLimitCents,
      monthlyLimitCents: card.monthlyLimitCents,
      pinSet: Boolean(card.pinHash),
    })),
    payees: userPayees,
    beneficiaries: userBeneficiaries,
    transactions: recentTransactions.map((t) => ({
      ...t,
      occurredAt: t.occurredAt.toISOString(),
      reference: `TXN-${String(t.id).padStart(8, "0")}`,
    })),
  });
}
