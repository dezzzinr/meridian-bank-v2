# Cards and expanded Accounts

## What works in this version

- Virtual and physical **demo** debit cards, linked to an accessible non-fixed-deposit account.
- Masked card numbers; password-confirmed reveal auto-hides after 30 seconds, on window blur, or card selection changes. Numbers start with 0000 and are not payment-network PANs. No CVV is issued or stored.
- Freeze/unfreeze, online/international/ATM controls and daily/monthly spending limits saved in PostgreSQL.
- PIN setting/changing after password confirmation. Only salted scrypt hashes are stored. Reauthentication and ATM PIN checks lock for 15 minutes after 5 incorrect attempts.
- A clearly labeled Test Payment flow enforces card status, expiry, limits, channel controls, balance and PIN. Approved test payments debit the simulated balance in a database transaction; declined authorizations are logged without moving funds.
- Replacement permanently disables the old card and keeps its history. Physical cards have a simulated request/arrival/activation flow. No shipment takes place.
- Apple Pay / Google Pay **demo setup preferences** persist and can be removed. No live wallet card is provisioned. A real issuer integration, Apple/Google approvals and appropriate native/web provisioning flows are required to enable real wallet support.
- Current/checking, savings, fixed deposits, foreign currency and joint accounts.
- Every account retains its own currency, even when an admin changes the user's region. Transfers between different account currencies are deliberately rejected until FX execution is integrated. Dashboard cross-currency summaries use the existing indicative demo rates and are labeled estimates.
- Fixed deposits have 3/6/12 month terms, indicative annual rates, and a maturity lock. They cannot receive top-ups, link cards, or be spent before maturity. Interest is illustrative, not automatically posted.
- Joint accounts invite an existing active customer. The invitee must explicitly accept from Accounts before receiving shared balance, transaction, statement and payment access. Card security controls remain private to the individual cardholder. Only the primary owner may rename or close the account.
- Account details and date-filtered PDF/CSV statements (maximum one-year date range, 5,000 entries). Statements include pending entries, exclude voided entries and reconcile available opening/closing balances. PDFs use standard fonts; characters outside the font's repertoire are normalized. CSV preserves Unicode and neutralizes spreadsheet formulas.
- Account closure requires zero balance, a matured deposit and no pending payments. Records and statements are preserved; linked cards are disabled.

## Update your existing installation (Windows compatible)

1. Download the updated project from this workspace. Copy source, scripts, docs, configuration and package/lock files into your existing project folder. Keep your `.env` / `.env.local` and `.git`. Do not copy `.next` or `node_modules`. Remove the obsolete drizzle.config.json if it exists; drizzle.config.ts is the current config.
2. Stop your local server and run `npm install`.
3. Run `npx tsx scripts/upgrade-cards.ts` to preview which database will be updated. Check the host/database carefully: localhost can still use a live Neon database.
4. Back up that database. Then run `npx tsx scripts/upgrade-cards.ts --apply`.
5. Run `npx tsx scripts/check-db.ts`. Expect Schema check: OK.
6. Run `npm run dev`. Open `/app/cards` and `/app/accounts`.
7. For Vercel, apply the same upgrade to its database (if different) before pushing the updated files to GitHub.

The upgrade is additive and repeatable. It completes earlier Meridian upgrades too, preserves balances/history, and backfills each legacy account's currency from its owner once. It does not change roles or account statuses. A complete new database can instead use `npx drizzle-kit push --config=drizzle.config.ts`.

**Never run scripts/seed.ts on an existing database; it deletes existing customers and banking history.** The optional `scripts/seed-cards-demo.ts` is a separate, non-destructive demo-only enhancement, restricted to the sandbox demo identity unless explicitly invoked. It does not promote users to admin.

## Testing

Use a development database, not production. The integration test is restricted to a local PostgreSQL host and creates/deletes only disposable fixture users. Run `npx tsx tests/cards-accounts-smoke.ts` against a running local app.

This remains a learning/demo banking application. Real card issuing, payment authorization, deposits, interest, delivery and wallet provisioning require a regulated financial provider and a formal security review. Do not store real payment card numbers, PINs, CVVs or customer financial data here.
