import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { apiError, readBody, requireAdmin } from "@/lib/api";
import { isValidCurrency, regionForCurrency } from "@/lib/currency";
import { logNotification } from "@/lib/notify";

interface Ctx {
  params: Promise<{ id: string }>;
}

const STATUSES = ["active", "suspended", "closed"] as const;

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const { id } = await ctx.params;
  const userId = Number(id);
  const body = await readBody(req);

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return apiError(404, "User not found.");

  const patch: Record<string, unknown> = {};
  const events: { title: string; body: string; type: "account" | "security" | "system" }[] =
    [];

  // Status change
  if (body.status !== undefined) {
    const status = String(body.status);
    if (!(STATUSES as readonly string[]).includes(status)) {
      return apiError(400, "Unknown status.");
    }
    if (target.id === admin.id && status !== "active") {
      return apiError(400, "You can't suspend or close your own admin account.");
    }
    if (status !== target.status) {
      patch.status = status;
      const label =
        status === "active"
          ? "reactivated"
          : status === "suspended"
            ? "suspended"
            : "closed";
      events.push({
        type: status === "active" ? "account" : "security",
        title: `Account ${label}`,
        body:
          status === "active"
            ? "Your account is active again. Welcome back!"
            : status === "suspended"
              ? "Your account has been suspended by an administrator. You can sign in but cannot make transactions until it is reactivated."
              : "Your account has been closed by an administrator.",
      });
    }
  }

  // Role change
  if (body.role !== undefined) {
    const role = body.role === "admin" ? "admin" : "user";
    if (target.id === admin.id && role !== "admin") {
      return apiError(400, "You can't remove your own admin role.");
    }
    if (role !== target.role) patch.role = role;
  }

  // Currency / region change
  if (body.currency !== undefined) {
    if (!isValidCurrency(body.currency)) {
      return apiError(400, "Unsupported currency.");
    }
    if (body.currency !== target.currency) {
      const region = regionForCurrency(body.currency);
      patch.currency = body.currency;
      patch.region = region;
      events.push({
        type: "account",
        title: "Region updated",
        body: `An administrator set your region to ${region}. New default accounts use ${body.currency}. Existing accounts keep their original currencies.`,
      });
    }
  }

  if (Object.keys(patch).length === 0) {
    return apiError(400, "No changes to apply.");
  }

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning();

  // If closed, end their active sessions so they're signed out.
  if (patch.status === "closed") {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  for (const ev of events) {
    await logNotification({
      userId,
      type: ev.type,
      title: ev.title,
      body: ev.body,
      createdBy: admin.id,
    });
  }

  return Response.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    currency: updated.currency,
    region: updated.region,
  });
}
