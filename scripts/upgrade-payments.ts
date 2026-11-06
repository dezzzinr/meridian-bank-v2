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
  if (!process.argv.includes("--apply")) {
    console.log("No changes made. This repairs the schema of an existing Meridian database without resetting customer data.");
    console.log("Take a backup first, especially if DATABASE_URL points to the same database as Vercel.");
    console.log("After verifying the target above, run: npx tsx scripts/upgrade-payments.ts --apply");
    return;
  }

  const { pool } = await import("@/db");
  const { upgradePaymentsDatabase, UpgradeSafetyError } = await import("@/db/upgrade-payments");
  try {
    await upgradePaymentsDatabase();
    console.log("Database upgrade complete. Existing users, balances and payment history were preserved.");
    console.log("Run npx tsx scripts/check-db.ts to verify, then restart npm run dev and retry Payments.");
  } catch (error) {
    if (error instanceof UpgradeSafetyError) {
      console.error(error.message);
    } else {
      const problem = describeDatabaseError(error);
      console.error(`Upgrade not applied (transaction rolled back): ${problem.code}`);
      console.error(problem.message);
      console.error(problem.hint);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error("Upgrade could not start. Run npm install and npx tsx scripts/check-db.ts first.");
  process.exitCode = 1;
});
