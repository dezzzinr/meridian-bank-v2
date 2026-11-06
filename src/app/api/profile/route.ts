import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, readBody, requireUser, str } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");

  const body = await readBody(req);
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = str(body.name, 1, 60);
    if (!name) return apiError(400, "Name must be 1-60 characters.");
    patch.name = name;
  }

  if (body.avatarUrl !== undefined) {
    if (typeof body.avatarUrl === "string" && body.avatarUrl.length > 500_000) {
      return apiError(400, "Profile picture exceeds maximum allowed size.");
    }
    patch.avatarUrl = body.avatarUrl || null;
  }

  if (body.newPassword !== undefined) {
    const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body.newPassword === "string" ? body.newPassword : "";
    if (next.length < 8) {
      return apiError(400, "New password must be at least 8 characters.");
    }
    const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!row || !verifyPassword(current, row.passwordHash)) {
      return apiError(400, "Current password is incorrect.");
    }
    patch.passwordHash = hashPassword(next);
  }

  const rows = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, user.id))
    .returning();
  if (rows.length === 0) return apiError(404, "User not found.");
  return Response.json({
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    avatarUrl: rows[0].avatarUrl,
  });
}
