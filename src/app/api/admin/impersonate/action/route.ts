import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, notifications, users } from "@/db/schema";
import { apiError, readBody, requireAdmin, str } from "@/lib/api";
import { positiveId } from "@/lib/banking-server";
import { ACCOUNT_TYPES, type AccountType, parseAmount } from "@/lib/banking";
import { generateAccountNumber } from "@/lib/ids";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const body = await readBody(req);
  const action = String(body.action);
  const targetUserId = positiveId(body.userId);

  const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!targetUser) return apiError(404, "Target user not found.");

  // 1. Open account on user's behalf
  if (action === "create_account") {
    const name = str(body.name, 2, 48) || "Checking Account";
    const type = (ACCOUNT_TYPES.includes(body.type as any) ? body.type : "checking") as AccountType;
    const currency = typeof body.currency === "string" ? body.currency : targetUser.currency;
    const amountCents = parseAmount(body.amount || "0", currency) || 0;
    const number = generateAccountNumber();

    const [account] = await db.insert(accounts).values({
      userId: targetUserId,
      name,
      type,
      currency,
      accountNumber: number,
      last4: number.slice(-4),
      balanceCents: amountCents,
    }).returning();

    await db.insert(notifications).values({
      userId: targetUserId,
      type: "account",
      title: "Account Opened by Administration",
      body: `${name} (${currency}) has been opened for you by an administrator. IBAN: ${number}.`,
      createdBy: admin.id,
    });

    return Response.json({ ok: true, account }, { status: 201 });
  }

  // 2. Adjust User Security on user's behalf
  if (action === "update_security") {
    const patch: Record<string, unknown> = {};

    if (body.accountLocked !== undefined) {
      patch.accountLocked = Boolean(body.accountLocked);
      patch.status = body.accountLocked ? "suspended" : "active";
    }

    if (body.twoFactorEnabled !== undefined) {
      patch.twoFactorEnabled = Boolean(body.twoFactorEnabled);
    }

    if (body.biometricsEnabled !== undefined) {
      patch.biometricsEnabled = Boolean(body.biometricsEnabled);
    }

    if (body.transactionPin !== undefined) {
      const pinStr = String(body.transactionPin).trim();
      if (pinStr) {
        if (!/^\d{4}$/.test(pinStr)) return apiError(400, "PIN must be 4 digits.");
        patch.transactionPinHash = hashPassword(pinStr);
      } else {
        patch.transactionPinHash = null;
      }
    }

    if (body.password !== undefined && String(body.password).length >= 8) {
      patch.passwordHash = hashPassword(String(body.password));
    }

    if (Object.keys(patch).length === 0) return apiError(400, "No fields to update.");

    await db.update(users).set(patch).where(eq(users.id, targetUserId));

    await db.insert(notifications).values({
      userId: targetUserId,
      type: "security",
      title: "Security Credentials Updated by Administrator",
      body: "Security settings or credentials on your account were updated by bank operations.",
      createdBy: admin.id,
    });

    return Response.json({ ok: true });
  }

  return apiError(400, "Invalid admin proxy action.");
}
