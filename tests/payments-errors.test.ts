import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { describeDatabaseError } from "../src/lib/database-errors";
import { apiFailure } from "../src/lib/api-failure";
import { apiJson, ApiRequestError } from "../src/lib/client";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("nested Drizzle missing-column errors have a safe, actionable response", async () => {
  const error = { message: "query contains private values", cause: { code: "42703", message: "column reference_number does not exist" } };
  const problem = describeDatabaseError(error);
  assert.equal(problem.code, "DATABASE_SCHEMA_OUTDATED");
  const response = apiFailure(error, "test:expected-missing-column");
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, "DATABASE_SCHEMA_OUTDATED");
  assert.match(body.hint, /check-db/);
  assert.ok(body.errorId);
  assert.doesNotMatch(JSON.stringify(body), /private values|reference_number/);
});

test("missing tables and authentication failures are distinguished", () => {
  assert.equal(describeDatabaseError({ cause: { code: "42P01" } }).code, "DATABASE_SCHEMA_OUTDATED");
  assert.equal(describeDatabaseError({ cause: { code: "28P01" } }).code, "DATABASE_AUTH_FAILED");
  assert.equal(describeDatabaseError({ code: "42501" }).code, "DATABASE_PERMISSION_DENIED");
  assert.equal(describeDatabaseError({ code: "3D000" }).code, "DATABASE_NOT_FOUND");
});

test("nested connection failures and timeouts do not leak connection strings", () => {
  const cause = { errors: [{ code: "ECONNREFUSED", message: "postgresql://private:secret@host" }] };
  const problem = describeDatabaseError({ cause });
  assert.equal(problem.code, "DATABASE_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(problem), /secret/);
  assert.equal(describeDatabaseError(new Error("Connection terminated due to connection timeout")).code, "DATABASE_UNAVAILABLE");
});

test("successful API payloads pass through", async () => {
  globalThis.fetch = async () => Response.json({ transfers: [{ id: 1 }] });
  const body = await apiJson<{ transfers: { id: number }[] }>("/api/transfers");
  assert.equal(body.transfers[0].id, 1);
});

test("a schema response keeps its code, hint, and reference", async () => {
  globalThis.fetch = async () => Response.json({ error: "Database schema needs an update.", code: "DATABASE_SCHEMA_OUTDATED", hint: "Run the checker.", errorId: "safe-reference" }, { status: 503 });
  await assert.rejects(apiJson("/api/transfers"), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.code, "DATABASE_SCHEMA_OUTDATED");
    assert.equal(error.status, 503);
    assert.equal(error.hint, "Run the checker.");
    assert.equal(error.errorId, "safe-reference");
    return true;
  });
});

test("HTML server errors are not displayed as raw HTML", async () => {
  globalThis.fetch = async () => new Response("<html>private stack trace</html>", { status: 500 });
  await assert.rejects(apiJson("/api/accounts"), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.match(error.message, /HTTP 500/);
    assert.doesNotMatch(error.message, /private|html/);
    return true;
  });
});

test("expired sessions and network errors get distinct instructions", async () => {
  globalThis.fetch = async () => Response.json({ error: "Unauthorized" }, { status: 401 });
  await assert.rejects(apiJson("/api/transfers"), (error: unknown) => error instanceof ApiRequestError && error.code === "AUTH_REQUIRED");
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(apiJson("/api/transfers"), (error: unknown) => error instanceof ApiRequestError && error.code === "NETWORK_ERROR");
});
