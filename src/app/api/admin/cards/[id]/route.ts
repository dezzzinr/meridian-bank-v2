import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, notifications } from "@/db/schema";
import { apiError, readBody, requireAdmin, str } from "@/lib/api";
import { positiveId } from "@/lib/banking-server";
import { hashPassword } from "@/lib/password";
import { CARD_STATUSES } from "@/lib/banking";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const cardId = positiveId((await ctx.params).id);
  const body = await readBody(req);

  const [card] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!card) return apiError(404, "Card not found.");

  const patch: Record<string, unknown> = {};

  // Status: active, frozen, closed, awaiting_activation
  if (body.status !== undefined) {
    if (!CARD_STATUSES.includes(body.status as any)) {
      return apiError(400, "Invalid card status.");
    }
    patch.status = body.status;
  }

  // Set / override PIN
  if (body.pin !== undefined) {
    const pinStr = String(body.pin).trim();
    if (pinStr) {
      if (!/^\d{4}$/.test(pinStr)) {
        return apiError(400, "Card PIN must be exactly 4 digits.");
      }
      patch.pinHash = hashPassword(pinStr);
      patch.pinChangedAt = new Date();
      patch.pinFailures = 0;
      patch.pinLockedUntil = null;
    }
  }

  // Limits
  if (body.dailyLimitCents !== undefined) {
    patch.dailyLimitCents = Number(body.dailyLimitCents);
  }
  if (body.monthlyLimitCents !== undefined) {
    patch.monthlyLimitCents = Number(body.monthlyLimitCents);
  }

  // Channel toggles
  if (body.onlineEnabled !== undefined) patch.onlineEnabled = Boolean(body.onlineEnabled);
  if (body.internationalEnabled !== undefined) patch.internationalEnabled = Boolean(body.internationalEnabled);
  if (body.atmEnabled !== undefined) patch.atmEnabled = Boolean(body.atmEnabled);

  if (body.name !== undefined) {
    const name = str(body.name, 2, 40);
    if (!name) return apiError(400, "Card nickname must be 2-40 characters.");
    patch.name = name;
  }

  if (Object.keys(patch).length === 0) {
    return apiError(400, "No fields to update.");
  }

  const [updated] = await db.update(cards).set(patch).where(eq(cards.id, cardId)).returning();

  await db.insert(notifications).values({
    userId: card.userId,
    type: "security",
    title: "Card Settings Adjusted by Bank",
    body: `Settings or PIN for your card ending •••• ${card.last4} were modified by administration.`,
    createdBy: admin.id,
  });

  return Response.json({
    ok: true,
    card: {
      id: updated.id,
      status: updated.status,
      onlineEnabled: updated.onlineEnabled,
      internationalEnabled: updated.internationalEnabled,
      atmEnabled: updated.atmEnabled,
      pinSet: Boolean(updated.pinHash),
    },
  });
}
