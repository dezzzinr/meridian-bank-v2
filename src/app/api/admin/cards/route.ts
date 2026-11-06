import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, cards, notifications } from "@/db/schema";
import { apiError, readBody, requireAdmin, str } from "@/lib/api";
import { positiveId } from "@/lib/banking-server";
import { hashPassword } from "@/lib/password";
import { CARD_STATUSES, type CardStatus } from "@/lib/banking";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const body = await readBody(req);
  const userId = positiveId(body.userId);
  const accountId = positiveId(body.accountId);
  const name = str(body.name, 2, 40) || "Debit Card";
  const holderName = str(body.holderName, 2, 60);
  const kind = body.kind === "physical" ? "physical" : "virtual";
  const status = (CARD_STATUSES.includes(body.status as any) ? body.status : "active") as CardStatus;

  // Custom or generated Card Number (Visa / Mastercard / Amex / Custom)
  const rawNumber = String(body.cardNumber || "").replace(/\D/g, "");
  if (rawNumber.length < 12 || rawNumber.length > 19) {
    return apiError(400, "Card number must contain between 12 and 19 digits.");
  }

  const last4 = rawNumber.slice(-4);
  const expiryMonth = Number(body.expiryMonth);
  const expiryYear = Number(body.expiryYear);

  if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) {
    return apiError(400, "Valid expiry month (1-12) required.");
  }

  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(expiryYear) || expiryYear < currentYear || expiryYear > currentYear + 20) {
    return apiError(400, `Valid expiry year (${currentYear}-${currentYear + 20}) required.`);
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) return apiError(404, "Target user account not found.");

  const existingCard = await db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.demoNumber, rawNumber))
    .limit(1);

  if (existingCard.length > 0) {
    return apiError(409, "A card with this exact card number already exists in the system.");
  }

  // Optional custom PIN
  let pinHash: string | null = null;
  if (body.pin) {
    const pinStr = String(body.pin).trim();
    if (!/^\d{4}$/.test(pinStr)) {
      return apiError(400, "PIN must be exactly 4 digits.");
    }
    pinHash = hashPassword(pinStr);
  }

  const dailyLimitCents = Number(body.dailyLimitCents) || 200000;
  const monthlyLimitCents = Number(body.monthlyLimitCents) || 800000;
  const onlineEnabled = body.onlineEnabled !== false;
  const internationalEnabled = Boolean(body.internationalEnabled);
  const atmEnabled = body.atmEnabled !== false;

  const [created] = await db
    .insert(cards)
    .values({
      userId,
      accountId: account.id,
      kind,
      name,
      holderName: holderName || "CARDHOLDER",
      demoNumber: rawNumber,
      last4,
      expiryMonth,
      expiryYear,
      status,
      onlineEnabled,
      internationalEnabled,
      atmEnabled,
      dailyLimitCents,
      monthlyLimitCents,
      pinHash,
      pinChangedAt: pinHash ? new Date() : null,
      deliveryAddress: body.deliveryAddress ? str(body.deliveryAddress, 5, 200) : null,
    })
    .returning();

  await db.insert(notifications).values({
    userId,
    type: "security",
    title: "New Card Issued by Bank",
    body: `${name} (${kind.toUpperCase()}) ending in •••• ${last4} was issued by administration.`,
    createdBy: admin.id,
  });

  return Response.json({
    ok: true,
    card: {
      id: created.id,
      last4: created.last4,
      name: created.name,
      status: created.status,
    },
  }, { status: 201 });
}
