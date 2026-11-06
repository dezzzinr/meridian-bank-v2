import { randomInt, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, cards, cardActivity, notifications, transactions } from "@/db/schema";
import { HttpError, str } from "./api";
import { accountAccess, lockedActiveUser, type DBTransaction } from "./banking-server";
import { parseAmount, type CardDTO, type CardActivityDTO } from "./banking";
import { hashPassword, verifyPassword } from "./password";
import type { SessionUser } from "./auth";

export function demoCardNumber() {
  return "0000" + Array.from({ length: 3 }, () => String(randomInt(0, 10000)).padStart(4, "0")).join("");
}
export function spendingPeriods(now = new Date()) {
  return { day: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) };
}
async function usage(cardId: number, tx: Pick<typeof db, "select"> = db) {
  const { day, month } = spendingPeriods();
  const [row] = await tx.select({
    monthly: sql<string>`coalesce(sum(${cardActivity.amountCents}),0)`,
    daily: sql<string>`coalesce(sum(case when ${cardActivity.occurredAt} >= ${day} then ${cardActivity.amountCents} else 0 end),0)`,
  }).from(cardActivity).where(and(eq(cardActivity.cardId, cardId), eq(cardActivity.status, "completed"), gte(cardActivity.occurredAt, month)));
  return { dailySpentCents: Number(row.daily), monthlySpentCents: Number(row.monthly) };
}
export async function listCards(userId: number): Promise<CardDTO[]> {
  const rows = await db.select({ card: cards, accountName: accounts.name, currency: accounts.currency }).from(cards)
    .innerJoin(accounts, eq(cards.accountId, accounts.id)).where(eq(cards.userId, userId)).orderBy(asc(cards.createdAt), asc(cards.id));
  return Promise.all(rows.map(async ({ card: c, accountName, currency }) => ({
    id: c.id, accountId: c.accountId, accountName, currency, kind: c.kind, name: c.name,
    holderName: c.holderName, last4: c.last4, expiryMonth: c.expiryMonth, expiryYear: c.expiryYear, status: c.status,
    onlineEnabled: c.onlineEnabled, internationalEnabled: c.internationalEnabled, atmEnabled: c.atmEnabled,
    dailyLimitCents: c.dailyLimitCents, monthlyLimitCents: c.monthlyLimitCents, ...await usage(c.id),
    pinSet: Boolean(c.pinHash), pinChangedAt: c.pinChangedAt?.toISOString() ?? null,
    appleWalletDemo: c.appleWalletDemo, googleWalletDemo: c.googleWalletDemo,
    deliveryAddress: c.deliveryAddress, replacementReason: c.replacementReason, createdAt: c.createdAt.toISOString(),
  })));
}
export async function listCardActivity(userId: number, cardId: number): Promise<CardActivityDTO[]> {
  const [card] = await db.select({ id: cards.id }).from(cards).where(and(eq(cards.id, cardId), eq(cards.userId, userId)));
  if (!card) throw new HttpError(404, "Card not found.");
  const rows = await db.select().from(cardActivity).where(eq(cardActivity.cardId, cardId)).orderBy(desc(cardActivity.occurredAt), desc(cardActivity.id)).limit(200);
  return rows.map((row) => ({ id: row.id, cardId: row.cardId, merchant: row.merchant, amountCents: row.amountCents, channel: row.channel, international: row.international, status: row.status, declineReason: row.declineReason, reference: row.reference, occurredAt: row.occurredAt.toISOString() }));
}
function notification(tx: DBTransaction, userId: number, title: string, body: string) {
  return tx.insert(notifications).values({ userId, type: "security", title, body });
}
export async function issueCard(user: SessionUser, body: Record<string, unknown>) {
  if (body.kind !== "virtual" && body.kind !== "physical") throw new HttpError(400, "Choose a virtual or physical card.");
  const kind = body.kind;
  const name = str(body.name, 2, 40);
  if (!name) throw new HttpError(400, "Give your card a name (2–40 characters).");
  const accountId = Number(body.accountId);
  if (!Number.isSafeInteger(accountId) || accountId < 1) throw new HttpError(400, "Choose an account.");
  const address = kind === "physical" ? str(body.deliveryAddress, 12, 300) : null;
  if (kind === "physical" && !address) throw new HttpError(400, "Enter a demo delivery address (12–300 characters).");
  return db.transaction(async (tx) => {
    await lockedActiveUser(tx, user.id);
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, accountId), accountAccess(user.id), isNull(accounts.closedAt))).for("update");
    if (!account) throw new HttpError(404, "Linked account not found.");
    if (account.type === "fixed_deposit") throw new HttpError(400, "Cards cannot be linked to fixed deposits.");
    const active = await tx.select({ id: cards.id }).from(cards).where(and(eq(cards.userId, user.id), inArray(cards.status, ["active", "frozen", "awaiting_activation"])));
    if (active.length >= 8) throw new HttpError(400, "You can have up to 8 live demo cards.");
    const number = demoCardNumber();
    const now = new Date();
    const [card] = await tx.insert(cards).values({ userId: user.id, accountId, kind, name, holderName: user.name, demoNumber: number, last4: number.slice(-4), expiryMonth: now.getUTCMonth() + 1, expiryYear: now.getUTCFullYear() + 3, status: kind === "virtual" ? "active" : "awaiting_activation", deliveryAddress: address }).returning({ id: cards.id });
    await notification(tx, user.id, kind === "virtual" ? "Virtual card created" : "Physical card requested", `${name} ending ${number.slice(-4)} is ${kind === "virtual" ? "ready to test" : "awaiting simulated delivery"}. Registered with payment processing gateway.`);
    return card;
  });
}

export async function updateCard(user: SessionUser, id: number, body: Record<string, unknown>) {
  const permitted = ["status", "name", "onlineEnabled", "internationalEnabled", "atmEnabled", "dailyLimit", "monthlyLimit"];
  if (Object.keys(body).some((key) => !permitted.includes(key))) throw new HttpError(400, "Unknown card setting.");
  return db.transaction(async (tx) => {
    await lockedActiveUser(tx, user.id);
    const [card] = await tx.select().from(cards).where(and(eq(cards.id, id), eq(cards.userId, user.id))).for("update");
    if (!card) throw new HttpError(404, "Card not found.");
    if (!["active", "frozen"].includes(card.status)) throw new HttpError(409, "Only active or frozen cards can be updated.");
    const [account] = await tx.select({ currency: accounts.currency, closedAt: accounts.closedAt }).from(accounts).where(eq(accounts.id, card.accountId));
    if (!account || account.closedAt) throw new HttpError(409, "The linked account is closed.");
    const patch: Partial<typeof cards.$inferInsert> = {};
    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "frozen") throw new HttpError(400, "Choose freeze or unfreeze.");
      patch.status = body.status;
    }
    if (body.name !== undefined) {
      const name = str(body.name, 2, 40);
      if (!name) throw new HttpError(400, "Card name must be 2–40 characters.");
      patch.name = name;
    }
    for (const key of ["onlineEnabled", "internationalEnabled", "atmEnabled"] as const) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== "boolean") throw new HttpError(400, "Card switches must be on or off.");
        if (key === "atmEnabled" && body[key] && card.kind === "virtual") throw new HttpError(400, "ATM withdrawals require a physical card.");
        patch[key] = body[key];
      }
    }
    const daily = body.dailyLimit === undefined ? card.dailyLimitCents : parseAmount(body.dailyLimit, account.currency);
    const monthly = body.monthlyLimit === undefined ? card.monthlyLimitCents : parseAmount(body.monthlyLimit, account.currency);
    if (daily === null || monthly === null || daily < 100 || monthly < daily) throw new HttpError(400, "Daily limit must be at least 1 and cannot exceed the monthly limit.");
    if (body.dailyLimit !== undefined) patch.dailyLimitCents = daily;
    if (body.monthlyLimit !== undefined) patch.monthlyLimitCents = monthly;
    if (!Object.keys(patch).length) throw new HttpError(400, "No settings to update.");
    await tx.update(cards).set(patch).where(eq(cards.id, id));
    await notification(tx, user.id, patch.status === "frozen" ? "Card frozen" : patch.status === "active" ? "Card unfrozen" : "Card controls updated", `You updated ${card.name}, ending ${card.last4}.`);
    return { ok: true };
  });
}

async function reauthenticate(tx: DBTransaction, card: typeof cards.$inferSelect, passwordHash: string, password: unknown) {
  if (card.authLockedUntil && card.authLockedUntil > new Date()) return "Too many attempts. Try again in 15 minutes.";
  if (typeof password !== "string" || password.length > 256 || !verifyPassword(password, passwordHash)) {
    const failures = card.authLockedUntil ? 1 : card.authFailures + 1;
    await tx.update(cards).set({ authFailures: failures, authLockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(cards.id, card.id));
    return "Incorrect password. Card details and settings were not changed.";
  }
  await tx.update(cards).set({ authFailures: 0, authLockedUntil: null }).where(eq(cards.id, card.id));
  return null;
}
export async function cardAction(user: SessionUser, id: number, action: string, body: Record<string, unknown>) {
  if (!["reveal", "pin", "replace", "wallet", "activate", "close"].includes(action)) throw new HttpError(404, "Unknown card action.");
  return db.transaction(async (tx) => {
    const owner = await lockedActiveUser(tx, user.id);
    const [lookup] = await tx.select({ accountId: cards.accountId }).from(cards).where(and(eq(cards.id, id), eq(cards.userId, user.id)));
    if (!lookup) throw new HttpError(404, "Card not found.");
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, lookup.accountId), accountAccess(user.id), isNull(accounts.closedAt))).for("update");
    const [card] = await tx.select().from(cards).where(and(eq(cards.id, id), eq(cards.userId, user.id))).for("update");
    if (!account || !card) throw new HttpError(404, "Card or linked account not found.");
    if (["closed", "replaced"].includes(card.status)) throw new HttpError(409, "This card is no longer usable. Its history is retained.");
    if (["reveal", "pin", "replace", "close"].includes(action)) {
      const error = await reauthenticate(tx, card, owner.passwordHash, body.password);
      if (error) return { error, status: 403 as const };
    }
    if (action === "reveal") {
      if (card.status === "awaiting_activation") throw new HttpError(409, "Activate this physical demo card first.");
      await notification(tx, user.id, "Card details viewed", `Details for demo card ending ${card.last4} were revealed after password confirmation.`);
      return { demoNumber: card.demoNumber, expiresInSeconds: 30, demo: true };
    }
    if (action === "pin") {
      if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) throw new HttpError(400, "Your PIN must contain exactly four digits.");
      await tx.update(cards).set({ pinHash: hashPassword(body.pin), pinChangedAt: new Date(), pinFailures: 0, pinLockedUntil: null }).where(eq(cards.id, id));
      await notification(tx, user.id, "Card PIN updated", `A new PIN was set for ${card.name}, ending ${card.last4}.`);
      return { ok: true };
    }
    if (action === "activate") {
      if (card.kind !== "physical" || card.status !== "awaiting_activation") throw new HttpError(409, "This card is not awaiting activation.");
      if (body.last4 !== card.last4) throw new HttpError(400, "Enter the last four characters shown on this demo card.");
      await tx.update(cards).set({ status: "active" }).where(eq(cards.id, id));
      await notification(tx, user.id, "Physical card activated", `Activation confirmed for card ending ${card.last4}. `);
      return { ok: true };
    }
    if (action === "wallet") {
      if (card.status !== "active") throw new HttpError(409, "Unfreeze or activate your card before setting up a demo wallet.");
      if (body.provider !== "apple" && body.provider !== "google") throw new HttpError(400, "Choose Apple Pay or Google Pay.");
      const enabled = body.enabled !== false;
      await tx.update(cards).set(body.provider === "apple" ? { appleWalletDemo: enabled } : { googleWalletDemo: enabled }).where(eq(cards.id, id));
      await notification(tx, user.id, "Demo wallet updated", `${body.provider === "apple" ? "Apple Pay" : "Google Pay"} demo setup ${enabled ? "saved" : "removed"} for card ending ${card.last4}. `);
      return { ok: true, demo: true };
    }
    if (action === "close") {
      await tx.update(cards).set({ status: "closed", appleWalletDemo: false, googleWalletDemo: false }).where(eq(cards.id, id));
      await notification(tx, user.id, "Card closed", `Card ending ${card.last4} is permanently disabled. The linked account and history are unchanged.`);
      return { ok: true };
    }
    if (!["lost", "stolen", "damaged", "expired"].includes(String(body.reason))) throw new HttpError(400, "Select a replacement reason.");
    const number = demoCardNumber();
    const now = new Date();
    await tx.update(cards).set({ status: "replaced", replacementReason: String(body.reason), appleWalletDemo: false, googleWalletDemo: false }).where(eq(cards.id, id));
    const [replacement] = await tx.insert(cards).values({
      userId: user.id, accountId: card.accountId, kind: card.kind, name: card.name, holderName: owner.name,
      demoNumber: number, last4: number.slice(-4), expiryMonth: now.getUTCMonth() + 1, expiryYear: now.getUTCFullYear() + 3,
      status: card.kind === "virtual" ? "active" : "awaiting_activation", deliveryAddress: card.deliveryAddress,
      dailyLimitCents: card.dailyLimitCents, monthlyLimitCents: card.monthlyLimitCents,
      onlineEnabled: card.onlineEnabled, internationalEnabled: card.internationalEnabled, atmEnabled: card.atmEnabled,
    }).returning({ id: cards.id });
    await notification(tx, user.id, "Replacement card requested", `Card ending ${card.last4} is disabled. Replacement demo card ending ${number.slice(-4)} ${card.kind === "virtual" ? "is ready" : "awaits simulated delivery"}. Set a new PIN before ATM testing.`);
    return { ok: true, replacementId: replacement.id };
  });
}

/** Sandbox authorizations enforce every control in a single atomic transaction. */
export async function simulateCardPayment(user: SessionUser, id: number, body: Record<string, unknown>) {
  const merchant = str(body.merchant, 2, 70);
  const channel = String(body.channel);
  if (!merchant || !["pos", "online", "atm"].includes(channel) || typeof body.international !== "boolean") throw new HttpError(400, "Enter a merchant and valid payment channel.");
  return db.transaction(async (tx) => {
    await lockedActiveUser(tx, user.id);
    const [lookup] = await tx.select({ accountId: cards.accountId }).from(cards).where(and(eq(cards.id, id), eq(cards.userId, user.id)));
    if (!lookup) throw new HttpError(404, "Card not found.");
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, lookup.accountId), accountAccess(user.id))).for("update");
    const [card] = await tx.select().from(cards).where(and(eq(cards.id, id), eq(cards.userId, user.id))).for("update");
    if (!card || !account) throw new HttpError(404, "Card not found.");
    const amount = parseAmount(body.amount, account.currency);
    if (!amount || amount <= 0) throw new HttpError(400, "Enter a valid amount greater than zero.");
    const spent = await usage(id, tx);
    let reason: string | null = null;
    if (account.closedAt) reason = "Linked account is closed.";
    else if (card.status !== "active") reason = `Card is ${card.status.replaceAll("_", " ")}.`;
    else if (Date.now() >= Date.UTC(card.expiryYear, card.expiryMonth, 1)) reason = "Card has expired.";
    else if (channel === "online" && !card.onlineEnabled) reason = "Online payments are disabled.";
    else if (channel === "atm" && (card.kind !== "physical" || !card.atmEnabled)) reason = "ATM withdrawals are disabled.";
    else if (body.international && !card.internationalEnabled) reason = "International payments are disabled.";
    else if (spent.dailySpentCents + amount > card.dailyLimitCents) reason = "Daily spending limit exceeded.";
    else if (spent.monthlySpentCents + amount > card.monthlyLimitCents) reason = "Monthly spending limit exceeded.";
    else if (account.balanceCents < amount) reason = "Insufficient available balance.";
    if (!reason && channel === "atm") {
      if (!card.pinHash) reason = "Set a PIN before testing ATM withdrawals.";
      else if (card.pinLockedUntil && card.pinLockedUntil > new Date()) reason = "PIN temporarily locked. Wait 15 minutes or reset your PIN.";
      else if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin) || !verifyPassword(body.pin, card.pinHash)) {
        const failures = card.pinLockedUntil ? 1 : card.pinFailures + 1;
        await tx.update(cards).set({ pinFailures: failures, pinLockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(cards.id, id));
        reason = "Incorrect PIN.";
      } else await tx.update(cards).set({ pinFailures: 0, pinLockedUntil: null }).where(eq(cards.id, id));
    }
    let transactionId: number | null = null;
    if (!reason) {
      const [row] = await tx.insert(transactions).values({ userId: user.id, accountId: account.id, cardId: card.id, kind: "debit", category: channel === "atm" ? "Other" : "Shopping", description: merchant, note: "Simulated card transaction", amountCents: amount, status: "completed" }).returning({ id: transactions.id });
      transactionId = row.id;
      await tx.update(accounts).set({ balanceCents: sql`${accounts.balanceCents} - ${amount}` }).where(eq(accounts.id, account.id));
    }
    const [activity] = await tx.insert(cardActivity).values({
      cardId: id, userId: user.id, transactionId, merchant, amountCents: amount,
      channel: channel as "pos" | "online" | "atm", international: body.international === true,
      status: reason ? "declined" : "completed", declineReason: reason, reference: `CARD-${randomUUID().toUpperCase()}`,
    }).returning({ id: cardActivity.id, status: cardActivity.status, declineReason: cardActivity.declineReason });
    await notification(tx, user.id, reason ? "Demo card payment declined" : "Demo card payment completed", `${merchant} · card ending ${card.last4}.${reason ? ` ${reason} No funds were debited.` : " Your simulated balance was updated."}`);
    return activity;
  });
}
