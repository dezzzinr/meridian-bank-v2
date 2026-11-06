import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/auth";
import { apiError, readBody, str } from "@/lib/api";

export async function POST(req: Request) {
  const body = await readBody(req);
  const name = str(body.name, 1, 60);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) return apiError(400, "Please tell us your full name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return apiError(400, "Enter a valid email address.");
  }
  if (password.length < 8) {
    return apiError(400, "Password must be at least 8 characters.");
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return apiError(409, "An account with this email already exists.");
  }

  const rows = await db
    .insert(users)
    .values({ name, email, passwordHash: hashPassword(password) })
    .returning();
  const user = rows[0];

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  return Response.json(
    { id: user.id, name: user.name, email: user.email, token },
    { status: 201 },
  );
}
