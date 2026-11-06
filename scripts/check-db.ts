import { loadDatabaseEnvironment, printDatabaseTarget } from "./lib/environment";
import { describeDatabaseError } from "../src/lib/database-errors";

async function main() {
  try {
    printDatabaseTarget(loadDatabaseEnvironment());
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unable to read DATABASE_URL.");
    process.exitCode = 1;
    return;
  }
  const { pool } = await import("@/db");
  try {
    const { inspectDatabase } = await import("@/db/diagnostics");
    const report = await inspectDatabase();
    console.log("Connection: OK");
    console.log("Visible application tables:", report.presentTables.join(", ") || "none");
    if (report.ok) {
      console.log("Schema check: OK. All expected tables and columns are present; identifiers are populated and unique.");
      console.log("This does not test every database permission or API query. If Payments still fails, use the error code and request reference shown on the page.");
      return;
    }
    for (const table of report.missingTables) console.error(`Missing table: ${table}`);
    for (const column of report.missingColumns) console.error(`Missing column: ${column}`);
    for (const issue of report.identifierIssues) console.error(`Identifier issue: ${issue}`);
    console.error("\nVerify this is the intended database. For an existing Meridian installation, take a backup and run:");
    console.error("npx tsx scripts/upgrade-payments.ts --apply");
    console.error("For a confirmed new, empty database only: npx drizzle-kit push --config=drizzle.config.ts");
    console.error("Do not use scripts/seed.ts to repair an existing database; it deletes existing data.");
    process.exitCode = 1;
  } catch (error) {
    const problem = describeDatabaseError(error);
    console.error(`${problem.code}: ${problem.message}`);
    console.error(problem.hint);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error("Database check could not start. Verify dependencies are installed and DATABASE_URL is configured.");
  process.exitCode = 1;
});
