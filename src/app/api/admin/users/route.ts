import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { apiError, readBody, requireAdmin, str } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { isValidCurrency, regionForCurrency } from "@/lib/currency";
import { logNotification } from "@/lib/notify";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const rows = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, currency: users.currency, region: users.region, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
  const balances = await db.select({ userId: accounts.userId, currency: accounts.currency, cents: sql<string>`coalesce(sum(${accounts.balanceCents}),0)`, count: sql<number>`count(*)::int` }).from(accounts).groupBy(accounts.userId, accounts.currency);
  return Response.json({
    users: rows.map((u) => {
      const owned = balances.filter((b) => b.userId === u.id);
      return { ...u, createdAt: u.createdAt.toISOString(), accountCount: owned.reduce((sum, b) => sum + b.count, 0), totalCents: Number(owned.find((b) => b.currency === u.currency)?.cents ?? 0), balancesByCurrency: owned.map((b) => ({ currency: b.currency, cents: Number(b.cents) })) };
    }),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");

  const body = await readBody(req);
  const name = str(body.name, 1, 60);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "admin" ? "admin" : "user";
  const currency = isValidCurrency(body.currency) ? body.currency : "USD";
  const region = regionForCurrency(currency);

  if (!name) return apiError(400, "Full name is required.");
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return apiError(400, "Enter a valid email address.");
  }
  if (password.length < 8) {
    return apiError(400, "Temporary password must be at least 8 characters.");
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return apiError(409, "A user with this email already exists.");
  }

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      currency,
      region,
      status: "active",
    })
    .returning();

  await logNotification({
    userId: created.id,
    type: "system",
    title: "Welcome to Meridian",
    body: `Your account was created by an administrator. Your region is set to ${region} (${currency}). Please change your password after signing in.`,
    createdBy: admin.id,
  });

  return Response.json(
    {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      status: created.status,
      currency: created.currency,
      region: created.region,
      createdAt: created.createdAt.toISOString(),
      accountCount: 0,
      totalCents: 0,
    },
    { status: 201 },
  );
}
