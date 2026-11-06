import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { loadDatabaseEnvironment } from "../scripts/lib/environment";

async function main() {
  const target = loadDatabaseEnvironment();
  if (!["127.0.0.1", "localhost", "::1"].includes(target.host)) {
    throw new Error("Smoke test only runs against local test PostgreSQL, never a shared/live database.");
  }
  const { db, pool } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { hashPassword } = await import("@/lib/password");
  const email = `payments-test-${randomBytes(5).toString("hex")}@example.test`;
  const password = randomBytes(24).toString("hex");
  let userId: number | undefined;
  let token = "";
  async function request(path: string, method = "GET", body?: unknown) {
    return fetch(`http://localhost:3000${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { "x-meridian-session": token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  try {
    assert.equal((await request("/api/transfers")).status, 401);
    assert.equal((await request("/api/accounts")).status, 401);
    const [user] = await db.insert(users).values({ name: "Disposable payments test", email, passwordHash: hashPassword(password) }).returning({ id: users.id });
    userId = user.id;
    const login = await request("/api/auth/login", "POST", { email, password });
    assert.equal(login.status, 200);
    token = (await login.json()).token;
    const first = await request("/api/accounts", "POST", { name: "Test checking", amount: "50" });
    const second = await request("/api/accounts", "POST", { name: "Test savings", type: "savings", amount: "0" });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const source = await first.json();
    const destination = await second.json();
    assert.ok(source.accountNumber);
    const payload = { sourceAccountId: source.id, destinationType: "account", destinationId: destination.id, amount: "10", note: "Disposable smoke test" };
    assert.equal((await request("/api/transfers", "POST", payload)).status, 201);
    const history = await request("/api/transfers");
    assert.equal(history.status, 200);
    assert.equal((await history.json()).transfers.length, 1);
    console.log("PASS: active user loads accounts and payment history");

    await db.update(users).set({ status: "suspended" }).where(eq(users.id, user.id));
    const suspendedHistory = await request("/api/transfers");
    assert.equal(suspendedHistory.status, 200);
    assert.equal((await suspendedHistory.json()).transfers.length, 1);
    assert.equal((await request("/api/accounts")).status, 200);
    assert.equal((await request("/api/transfers", "POST", payload)).status, 403);
    assert.equal((await request("/api/accounts", "POST", { name: "Not allowed" })).status, 403);
    console.log("PASS: suspension preserves read access and blocks new financial actions");
  } finally {
    // Remove only this disposable fixture, never real/demo users or histories.
    if (userId !== undefined) await db.delete(users).where(eq(users.id, userId));
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Payments smoke test failed");
  process.exitCode = 1;
});
