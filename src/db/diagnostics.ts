import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  users, sessions, accounts, payees, transfers, transactions,
  notifications, beneficiaries, scheduledTransfers, accountMembers, cards, cardActivity,
  loginHistory, trustedDevices, otps,
} from "./schema";

const tables = [
  users, sessions, accounts, payees, transfers, transactions,
  notifications, beneficiaries, scheduledTransfers, accountMembers, cards, cardActivity,
  loginHistory, trustedDevices, otps,
];

/** Metadata only: no customer records or credentials leave this function. */
export async function inspectDatabase(client: Pick<typeof db, "execute"> = db) {
  const result = await client.execute<{ table_name: string; column_name: string }>(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const present = new Map<string, Set<string>>();
  for (const row of result.rows) {
    if (!present.has(row.table_name)) present.set(row.table_name, new Set());
    present.get(row.table_name)!.add(row.column_name);
  }

  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  for (const table of tables) {
    const config = getTableConfig(table);
    const columns = present.get(config.name);
    if (!columns) {
      missingTables.push(config.name);
      continue;
    }
    for (const column of config.columns) {
      if (!columns.has(column.name)) missingColumns.push(`${config.name}.${column.name}`);
    }
  }

  const identifierIssues: string[] = [];
  for (const [table, column] of [["accounts", "account_number"], ["transfers", "reference_number"]] as const) {
    if (!present.get(table)?.has(column)) continue;
    // Identifiers come from the hardcoded allowlist above, never from user input.
    const qualified = sql`${sql.identifier("public")}.${sql.identifier(table)}`;
    const identifier = sql.identifier(column);
    const blanks = await client.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count FROM ${qualified}
      WHERE ${identifier} IS NULL OR btrim(${identifier}) = ''
    `);
    if (blanks.rows[0].count > 0) identifierIssues.push(`${table}.${column}: ${blanks.rows[0].count} blank or missing identifiers`);
    const duplicates = await client.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count FROM (
        SELECT ${identifier} FROM ${qualified}
        WHERE ${identifier} IS NOT NULL AND btrim(${identifier}) <> ''
        GROUP BY ${identifier} HAVING count(*) > 1
      ) AS duplicate_identifiers
    `);
    if (duplicates.rows[0].count > 0) identifierIssues.push(`${table}.${column}: ${duplicates.rows[0].count} duplicate non-empty identifiers (manual review required)`);
  }

  return {
    ok: missingTables.length === 0 && missingColumns.length === 0 && identifierIssues.length === 0,
    presentTables: [...present.keys()].filter((name) => tables.some((table) => getTableConfig(table).name === name)),
    missingTables,
    missingColumns,
    identifierIssues,
  };
}
