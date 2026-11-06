import { loadDatabaseEnvironment, printDatabaseTarget } from "./lib/environment";
import { describeDatabaseError } from "../src/lib/database-errors";

async function main() {
  printDatabaseTarget(loadDatabaseEnvironment());
  if (!process.argv.includes("--apply")) {
    console.log("Preview only. This adds Cards, joint account invitations, account currencies and fixed terms. It also completes any earlier Meridian schema upgrades.");
    console.log("Back up the intended database, then run: npx tsx scripts/upgrade-cards.ts --apply");
    return;
  }
  const { pool } = await import("@/db");
  const { upgradePaymentsDatabase, UpgradeSafetyError } = await import("@/db/upgrade-payments");
  try {
    await upgradePaymentsDatabase();
    console.log("Cards & Accounts upgrade complete. Existing users, balances and history preserved.");
    console.log("Run npx tsx scripts/check-db.ts, then restart the app.");
  } catch (error) {
    console.error(error instanceof UpgradeSafetyError ? error.message : describeDatabaseError(error).message);
    process.exitCode = 1;
  } finally { await pool.end(); }
}
main().catch(() => { console.error("Upgrade could not start. Check DATABASE_URL and installed dependencies."); process.exitCode = 1; });
