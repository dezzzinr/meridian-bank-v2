import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { apiError, requireUser } from "@/lib/api";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Mark a single notification as read. */
export async function PATCH(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  const { id } = await ctx.params;
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, Number(id)),
        eq(notifications.userId, user.id),
      ),
    )
    .returning();
  if (rows.length === 0) return apiError(404, "Notification not found.");
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  const { id } = await ctx.params;
  const rows = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, Number(id)),
        eq(notifications.userId, user.id),
      ),
    )
    .returning();
  if (rows.length === 0) return apiError(404, "Notification not found.");
  return Response.json({ ok: true });
}
