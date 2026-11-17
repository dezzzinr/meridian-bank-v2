# Settings database upgrade

Settings adds columns for KYC review and email notification preferences. Existing account and transaction data is preserved.

For an existing database, back it up and verify `DATABASE_URL` points to the intended database, then run:

```powershell
npx tsx scripts/upgrade-payments.ts --apply
```

The upgrade script is additive and safe to rerun. It is not run automatically by the app. The administrator KYC review page is available at `/admin/kyc` after the upgrade.

Uploaded identity documents are limited to 1.5 MB and accepted as JPG, PNG, or PDF. Document bytes are available only through the admin review endpoint while a submission is pending; they are removed after approval or rejection. Support-assisted verification is also available through the Contact page, and customers should not send identity documents through chat or email.
