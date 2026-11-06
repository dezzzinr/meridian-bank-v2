import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, loginHistory, otps, sessions, trustedDevices, users } from "@/db/schema";
import { HttpError, readBody, str } from "@/lib/api";
import { bankingError, bankingUser, lockedActiveUser, privateHeaders } from "@/lib/banking-server";
import { hashPassword, verifyPassword } from "@/lib/password";
import { randomBytes, randomInt } from "node:crypto";

export async function GET() {
  try {
    const user = await bankingUser();

    // Fetch security summary: sessions, devices, login audit logs
    const [userRecord] = await db
      .select({
        twoFactorEnabled: users.twoFactorEnabled,
        biometricsEnabled: users.biometricsEnabled,
        hasPin: sql<boolean>`${users.transactionPinHash} IS NOT NULL`,
        securityQuestion: users.securityQuestion,
        accountLocked: users.accountLocked,
      })
      .from(users)
      .where(eq(users.id, user.id));

    const activeSessions = await db
      .select({
        id: sessions.id,
        deviceName: sessions.deviceName,
        ipAddress: sessions.ipAddress,
        lastActiveAt: sessions.lastActiveAt,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .orderBy(desc(sessions.lastActiveAt));

    const history = await db
      .select()
      .from(loginHistory)
      .where(eq(loginHistory.userId, user.id))
      .orderBy(desc(loginHistory.createdAt))
      .limit(20);

    const devices = await db
      .select()
      .from(trustedDevices)
      .where(eq(trustedDevices.userId, user.id))
      .orderBy(desc(trustedDevices.lastUsedAt));

    return Response.json({
      settings: userRecord,
      sessions: activeSessions,
      history,
      trustedDevices: devices,
    }, { headers: privateHeaders });
  } catch (error) {
    return bankingError(error, "security:get");
  }
}

export async function POST(req: Request) {
  try {
    const user = await bankingUser();
    const body = await readBody(req);
    const action = String(body.action);

    if (action === "toggle_2fa") {
      const enabled = Boolean(body.enabled);
      await db.update(users).set({ twoFactorEnabled: enabled }).where(eq(users.id, user.id));
      return Response.json({ ok: true, twoFactorEnabled: enabled });
    }

    if (action === "toggle_biometrics") {
      const enabled = Boolean(body.enabled);
      await db.update(users).set({ biometricsEnabled: enabled }).where(eq(users.id, user.id));
      return Response.json({ ok: true, biometricsEnabled: enabled });
    }

    if (action === "set_pin") {
      const pin = String(body.pin || "");
      if (!/^\d{4}$/.test(pin)) throw new HttpError(400, "Transaction PIN must be exactly 4 digits.");
      await db.update(users).set({ transactionPinHash: hashPassword(pin) }).where(eq(users.id, user.id));
      return Response.json({ ok: true });
    }

    if (action === "set_security_question") {
      const question = str(body.question, 5, 120);
      const answer = str(body.answer, 2, 80);
      if (!question || !answer) throw new HttpError(400, "Valid question and answer are required.");
      await db.update(users).set({
        securityQuestion: question,
        securityAnswerHash: hashPassword(answer.toLowerCase().trim()),
      }).where(eq(users.id, user.id));
      return Response.json({ ok: true });
    }

    if (action === "request_otp") {
      const purpose = str(body.purpose, 2, 40) || "verification";
      const code = String(randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      await db.insert(otps).values({
        userId: user.id,
        action: purpose,
        code,
        expiresAt,
      });

      return Response.json({ ok: true, code, message: `One-Time Passcode generated: ${code}` });
    }

    if (action === "verify_otp") {
      const code = String(body.code || "").trim();
      const purpose = str(body.purpose, 2, 40) || "verification";
      const [otp] = await db
        .select()
        .from(otps)
        .where(and(eq(otps.userId, user.id), eq(otps.action, purpose), eq(otps.code, code), isNull(otps.consumedAt)))
        .orderBy(desc(otps.createdAt))
        .limit(1);

      if (!otp || otp.expiresAt < new Date()) {
        throw new HttpError(400, "Invalid or expired OTP code.");
      }

      await db.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, otp.id));
      return Response.json({ ok: true, verified: true });
    }

    if (action === "freeze_account" || action === "lock_account") {
      const locked = Boolean(body.locked ?? true);
      await db.update(users).set({
        accountLocked: locked,
        status: locked ? "suspended" : "active",
      }).where(eq(users.id, user.id));
      return Response.json({ ok: true, accountLocked: locked });
    }

    if (action === "add_trusted_device") {
      const deviceName = str(body.deviceName, 2, 50) || "Current Device";
      const fingerprint = str(body.fingerprint, 4, 100) || randomBytes(8).toString("hex");

      await db.insert(trustedDevices).values({
        userId: user.id,
        deviceName,
        deviceFingerprint: fingerprint,
      }).onConflictDoUpdate({
        target: [trustedDevices.userId, trustedDevices.deviceFingerprint],
        set: { lastUsedAt: new Date() },
      });

      return Response.json({ ok: true, fingerprint });
    }

    if (action === "logout_all") {
      await db.delete(sessions).where(eq(sessions.userId, user.id));
      return Response.json({ ok: true, loggedOut: true });
    }

    throw new HttpError(400, "Unknown security action.");
  } catch (error) {
    return bankingError(error, "security:action");
  }
}
