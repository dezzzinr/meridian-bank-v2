# Fixing Payments on localhost (Windows)

There are two independent messages:

- **Your account is suspended:** an administrator must change the customer's status to Active in Admin Console → Users → Manage before the customer can send money. Suspension should not hide existing accounts or payment history.
- **Couldn't load your payments:** an API request failed. A screenshot of this generic message alone does not prove a schema problem. The updated page shows whether history or accounts failed, a safe error code, and a recovery hint.

## Bring over the updated files first

Changes made in the chat workspace do not automatically appear on your computer or GitHub. Download the updated project and extract it to a separate folder. Copy the updated source/config/scripts/docs and package files into your existing project. Keep your existing `.env` / `.env.local` and `.git` folder. Do not copy `.next` or `node_modules`.

This update replaces `drizzle.config.json` with `drizzle.config.ts`. Delete the old JSON file from your local project too. The old JSON config pointed at the sandbox's localhost database; setting DATABASE_URL did not override that hardcoded value.

## Check the database without changing it

1. In VS Code, open your existing project folder (the folder containing package.json).
2. Stop the local server with Ctrl+C.
3. Run `npm install`.
4. Keep your correct PostgreSQL connection string in `.env.local` or `.env` in this folder. Do not paste the connection string into chat or GitHub.
5. Run `npx tsx scripts/check-db.ts`.

This command works in PowerShell, Command Prompt, and Git Bash. It reports the database host, database name, environment source, missing tables or columns, and counts of blank or duplicate identifiers. It never prints passwords, full connection strings, or customer records.

The app and scripts now use Next.js environment precedence. Terminal environment variables override files; `.env.development.local` overrides `.env.local`, which overrides `.env.development`, which overrides `.env`. Quoted values in these files are valid. If you previously set DATABASE_URL in PowerShell, use `Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue` to stop overriding the files, then rerun the check. A new terminal may also be needed if you set a permanent Windows environment variable.

**Localhost is where the app runs, not necessarily where the database lives.** A localhost app can still use your live Neon database. Verify the printed target. Use a development database/branch when possible, and take a backup before changing any shared/live database.

## Repair a missing-schema upgrade safely

Only after confirming the check points to the intended, existing Meridian database:

1. Take a database backup or snapshot.
2. Run `npx tsx scripts/upgrade-payments.ts` to preview the database target without applying changes.
3. Run `npx tsx scripts/upgrade-payments.ts --apply`.
4. Run `npx tsx scripts/check-db.ts` again. Expect `Schema check: OK`.
5. Run `npm run dev` and reopen http://localhost:3000/app/payments.

The upgrade is additive, transactional and repeatable. It fills blank account numbers and transfer references **before** adding unique constraints. It creates referenced tables before adding foreign keys. It does not require pgcrypto, delete users, reset balances, clear transactions, or change user statuses/roles. Existing populated identifiers are preserved. Duplicate non-empty identifiers cause the upgrade to stop for manual review.

**Do not run `scripts/seed.ts` as a repair. That script deletes existing users and banking data.** Do not rerun the earlier SQL that created unique indexes on identical empty strings.

If the check shows all base tables are absent, first verify DATABASE_URL. Only for a confirmed new, empty database, create the schema with `npx drizzle-kit push --config=drizzle.config.ts`. Review any proposed changes; do not use `--force` on an existing/live database.

## Other error codes

- AUTH_REQUIRED / HTTP 401: sign out and sign in again.
- DATABASE_SCHEMA_OUTDATED: use the check and upgrade steps above.
- DATABASE_UNAVAILABLE: verify the database service, connection host, firewall/network and provider status. The app now times out rather than hanging indefinitely.
- DATABASE_AUTH_FAILED: verify the database password/role in the connection string (not the customer's app password).
- DATABASE_PERMISSION_DENIED: have the database owner check the connection role's privileges.
- DATABASE_TLS_ERROR: copy the provider's complete URL with its SSL options. Do not disable certificate verification or append a second question mark to the URL.
- HTTP 500 / REQUEST_FAILED: check the terminal running `npm run dev`. Match the request reference shown on the page to the terminal entry.

On the previous local version, F12 → Network → refresh Payments → inspect `/api/transfers` and `/api/accounts` to see which fails. Do not share request cookies or the `x-meridian-session` header; those are login credentials.

## After it works locally

Commit and push the updated files to GitHub if you also want to update Vercel. If Vercel uses a different database, apply the upgrade separately to that database after taking a backup. Testing against the sandbox is not proof your own local/Neon database was upgraded.
