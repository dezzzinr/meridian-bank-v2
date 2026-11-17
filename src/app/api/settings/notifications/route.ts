import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, readBody, requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to sign in.");
  const [settings] = await db.select({ emailEnabled: users.emailNotificationsEnabled }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!settings) return apiError(404, "Account not found.");
  return Response.json({ ...settings, inAppEnabled: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to sign in.");
  const body = await readBody(req);
  if (typeof body.emailEnabled !== "boolean") return apiError(400, "Choose whether email notifications are enabled.");
  await db.update(users).set({ emailNotificationsEnabled: body.emailEnabled }).where(eq(users.id, user.id));
  return Response.json({ ok: true, emailEnabled: body.emailEnabled, inAppEnabled: true });
}
