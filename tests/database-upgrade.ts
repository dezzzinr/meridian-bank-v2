import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { sql } from "drizzle-orm";
import { loadDatabaseEnvironment } from "../scripts/lib/environment";

async function main() {
  const target = loadDatabaseEnvironment();
  if (!["127.0.0.1", "localhost", "::1"].includes(target.host)) {
    throw new Error("Integration test is restricted to a local PostgreSQL test server, not Neon or a shared/live database.");
  }
  const { db, pool } = await import("@/db");
  const fixture = process.argv.includes("--fixture");
  if (fixture) {
    try {
      assert.match(target.database, /^meridian_upgrade_test_[a-f0-9]+$/);
      await db.execute(sql`
        CREATE TABLE users (
          id serial PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
          password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE sessions (
          id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
        );
        CREATE TABLE accounts (
          id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name text NOT NULL, type text NOT NULL DEFAULT 'checking', last4 text NOT NULL,
          balance_cents bigint NOT NULL DEFAULT 0, closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE payees (
          id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name text NOT NULL, method_type text NOT NULL DEFAULT 'bank', method_detail text NOT NULL,
          notes text, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE transfers (
          id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          source_account_id integer NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          destination_account_id integer REFERENCES accounts(id) ON DELETE SET NULL,
          payee_id integer REFERENCES payees(id) ON DELETE SET NULL,
          amount_cents integer NOT NULL, note text, status text NOT NULL DEFAULT 'pending',
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE transactions (
          id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          account_id integer NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          transfer_id integer REFERENCES transfers(id) ON DELETE SET NULL,
          payee_id integer REFERENCES payees(id) ON DELETE SET NULL,
          kind text NOT NULL, category text NOT NULL DEFAULT 'Other', description text NOT NULL,
          note text, amount_cents integer NOT NULL, status text NOT NULL DEFAULT 'completed',
          occurred_at timestamptz NOT NULL DEFAULT now()
        );
        INSERT INTO users (name, email, password_hash) VALUES ('Migration fixture', 'fixture@example.test', 'not-a-login');
        INSERT INTO accounts (user_id, name, last4, balance_cents) VALUES
          (1, 'Checking', '1234', 10000), (1, 'Savings', '5678', 25000), (1, 'Preserved number', '5679', 5000);
        INSERT INTO payees (user_id, name, method_detail) VALUES (1, 'Test payee', '123456789');
        INSERT INTO transfers (user_id, source_account_id, destination_account_id, payee_id, amount_cents, status) VALUES
          (1, 1, 2, NULL, 500, 'completed'), (1, 1, NULL, 1, 250, 'completed'), (1, 1, 2, NULL, 100, 'completed');
        INSERT INTO transactions (user_id, account_id, transfer_id, kind, description, amount_cents) VALUES
          (1, 1, 1, 'transfer_out', 'Historical transfer', 500), (1, 2, 1, 'transfer_in', 'Historical transfer', 500);
      `);
      const { inspectDatabase } = await import("@/db/diagnostics");
      const { upgradePaymentsDatabase } = await import("@/db/upgrade-payments");
      const missing = await inspectDatabase();
      assert.ok(missing.missingColumns.includes("accounts.account_number"));
      assert.ok(missing.missingColumns.includes("transfers.reference_number"));
      console.log("PASS: missing-schema detection");

      // Reproduce the earlier partially applied SQL: multiple empty identifiers.
      await db.execute(sql`
        ALTER TABLE accounts ADD COLUMN account_number text NOT NULL DEFAULT '';
        ALTER TABLE transfers ADD COLUMN reference_number text NOT NULL DEFAULT '';
        ALTER TABLE transfers ADD COLUMN beneficiary_id integer;
        UPDATE accounts SET account_number = 'KEEP-ACCOUNT-NUMBER' WHERE id = 3;
        UPDATE transfers SET reference_number = 'KEEP-TRANSFER-REFERENCE' WHERE id = 3;
        UPDATE transfers SET beneficiary_id = 999 WHERE id = 1;
      `);
      const snapshot = (await db.execute(sql`SELECT id, balance_cents::text FROM accounts ORDER BY id`)).rows;
      await assert.rejects(upgradePaymentsDatabase());
      assert.equal((await inspectDatabase()).missingColumns.includes("users.role"), true);
      assert.deepEqual((await db.execute(sql`SELECT id, balance_cents::text FROM accounts ORDER BY id`)).rows, snapshot);
      console.log("PASS: constraint failure rolls back the complete upgrade");

      await db.execute(sql`UPDATE transfers SET beneficiary_id = NULL WHERE id = 1`);
      const report = await upgradePaymentsDatabase();
      assert.equal(report.ok, true);
      const ids = (await db.execute<{ id: number; account_number: string }>(sql`SELECT id, account_number FROM accounts ORDER BY id`)).rows;
      assert.equal(new Set(ids.map((row) => row.account_number)).size, 3);
      assert.equal(ids[2].account_number, "KEEP-ACCOUNT-NUMBER");
      const refs = (await db.execute<{ id: number; reference_number: string; transfer_type: string }>(sql`SELECT id, reference_number, transfer_type FROM transfers ORDER BY id`)).rows;
      assert.equal(refs[2].reference_number, "KEEP-TRANSFER-REFERENCE");
      assert.equal(refs[1].transfer_type, "to_payee");
      assert.equal(new Set(refs.map((row) => row.reference_number)).size, 3);
      assert.deepEqual((await db.execute(sql`SELECT id, balance_cents::text FROM accounts ORDER BY id`)).rows, snapshot);
      assert.equal((await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM transactions`)).rows[0].count, 2);
      console.log("PASS: blank identifiers repaired; existing identifiers, balances and history preserved");

      await upgradePaymentsDatabase();
      assert.deepEqual((await db.execute(sql`SELECT id, account_number FROM accounts ORDER BY id`)).rows, ids);
      await assert.rejects(db.execute(sql`UPDATE accounts SET account_number = 'KEEP-ACCOUNT-NUMBER' WHERE id = 1`));
      console.log("PASS: repeatable upgrade and uniqueness enforced");
    } finally {
      await pool.end();
    }
    return;
  }

  const name = `meridian_upgrade_test_${randomBytes(5).toString("hex")}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  let created = false;
  try {
    await db.execute(sql`CREATE DATABASE ${sql.identifier(name)}`);
    created = true;
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "tests/database-upgrade.ts", "--fixture"], {
        env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "inherit",
      });
      child.once("error", reject);
      child.once("exit", (value) => resolve(value ?? 1));
    });
    assert.equal(code, 0, "Isolated migration tests failed");
  } finally {
    if (created) await db.execute(sql`DROP DATABASE ${sql.identifier(name)} WITH (FORCE)`);
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[redacted]") : "Database integration test failed");
  process.exitCode = 1;
});
