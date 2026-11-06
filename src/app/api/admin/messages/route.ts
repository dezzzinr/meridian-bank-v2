import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, readBody, requireAdmin, str } from "@/lib/api";
import { logNotification } from "@/lib/notify";

/**
 * Send an admin message. Either to one user (userId) or to everyone
 * (audience === "all"). Logged as a notification for each recipient.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const body = await readBody(req);
  const title = str(body.title, 1, 120);
  const message = str(body.body, 1, 1000);
  const audience = body.audience === "all" ? "all" : "user";

  if (!title) return apiError(400, "A subject is required.");
  if (!message) return apiError(400, "A message body is required.");

  let recipientIds: number[] = [];

  if (audience === "all") {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.status, ["active", "suspended"]));
    recipientIds = rows.map((r) => r.id);
  } else {
    const userId = Number(body.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return apiError(400, "Choose who to message.");
    }
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) return apiError(404, "That user no longer exists.");
    recipientIds = [target.id];
  }

  for (const id of recipientIds) {
    await logNotification({
      userId: id,
      type: "admin_message",
      title,
      body: message,
      createdBy: admin.id,
    });
  }

  return Response.json({ ok: true, sent: recipientIds.length }, { status: 201 });
}
