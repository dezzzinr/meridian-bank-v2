import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { apiError, requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(100);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
    );

  return Response.json({
    unread: count,
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

/** Mark all as read. */
export async function PATCH() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
    );
  return Response.json({ ok: true });
}
