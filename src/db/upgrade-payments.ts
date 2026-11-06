import { sql } from "drizzle-orm";
import { db } from "@/db";
import { inspectDatabase } from "./diagnostics";
import { applyCardsUpgrade } from "./upgrade-cards";

export class UpgradeSafetyError extends Error {}

/**
 * Additive repair for existing Meridian installations, including partially
 * applied older instructions. No DELETE, TRUNCATE, balance edits or reseeding.
 * Explicit CLI invocation only — never run migrations from a web request.
 */
export async function upgradePaymentsDatabase() {
  const before = await inspectDatabase();
  const baseTables = ["users", "sessions", "accounts", "payees", "transfers", "transactions"];
  const missingBase = baseTables.filter((table) => !before.presentTables.includes(table));
  if (missingBase.length) {
    throw new UpgradeSafetyError(
      `Stopped: missing base tables (${missingBase.join(", ")}). Verify DATABASE_URL. Only for a confirmed new, empty database, use npx drizzle-kit push --config=drizzle.config.ts instead.`,
    );
  }
  if (before.identifierIssues.some((issue) => issue.includes("duplicate non-empty"))) {
    throw new UpgradeSafetyError("Stopped: duplicate non-empty account numbers or references need manual review. No records were modified.");
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(741839201)`);
    await tx.execute(sql`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'United States';

      CREATE TABLE IF NOT EXISTS public.notifications (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        type text NOT NULL DEFAULT 'system',
        title text NOT NULL,
        body text NOT NULL,
        read_at timestamptz,
        created_by integer REFERENCES public.users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at);

      CREATE TABLE IF NOT EXISTS public.beneficiaries (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        label text NOT NULL,
        recipient_name text NOT NULL,
        bank_name text,
        bank_code text,
        account_number text NOT NULL,
        swift_code text,
        country text,
        currency text NOT NULL DEFAULT 'USD',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS beneficiaries_user_idx ON public.beneficiaries(user_id);

      ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_number text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS reference_number text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS transfer_type text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS fee_cents integer NOT NULL DEFAULT 0;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS beneficiary_id integer;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS recipient_name text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS recipient_bank text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS recipient_account_no text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS swift_code text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS destination_currency text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS exchange_rate text;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
      ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS completed_at timestamptz;

      -- Deterministic, unique demo identifiers; not real bank-issued IBANs.
      -- Fill existing rows BEFORE creating unique constraints.
      UPDATE public.accounts
      SET account_number = 'MR-LEGACY-' || id::text
      WHERE account_number IS NULL OR btrim(account_number) = '';
      UPDATE public.transfers
      SET reference_number = 'MERD-LEGACY-' || id::text
      WHERE reference_number IS NULL OR btrim(reference_number) = '';
      UPDATE public.transfers
      SET transfer_type = CASE WHEN payee_id IS NOT NULL THEN 'to_payee' ELSE 'internal' END
      WHERE transfer_type IS NULL OR btrim(transfer_type) = ''
         OR (transfer_type = 'internal' AND destination_account_id IS NULL AND payee_id IS NOT NULL);
      UPDATE public.transfers SET fee_cents = 0 WHERE fee_cents IS NULL;

      ALTER TABLE public.accounts ALTER COLUMN account_number SET NOT NULL;
      ALTER TABLE public.accounts ALTER COLUMN account_number DROP DEFAULT;
      ALTER TABLE public.transfers ALTER COLUMN reference_number SET NOT NULL;
      ALTER TABLE public.transfers ALTER COLUMN reference_number DROP DEFAULT;
      ALTER TABLE public.transfers ALTER COLUMN transfer_type SET NOT NULL;
      ALTER TABLE public.transfers ALTER COLUMN transfer_type SET DEFAULT 'internal';
      ALTER TABLE public.transfers ALTER COLUMN fee_cents SET NOT NULL;
      ALTER TABLE public.transfers ALTER COLUMN fee_cents SET DEFAULT 0;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
          WHERE i.indrelid = 'public.accounts'::regclass AND a.attname = 'account_number'
            AND i.indisunique AND i.indisvalid AND i.indnkeyatts = 1
            AND i.indpred IS NULL AND i.indexprs IS NULL
        ) THEN
          ALTER TABLE public.accounts ADD CONSTRAINT accounts_account_number_unique UNIQUE (account_number);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
          WHERE i.indrelid = 'public.transfers'::regclass AND a.attname = 'reference_number'
            AND i.indisunique AND i.indisvalid AND i.indnkeyatts = 1
            AND i.indpred IS NULL AND i.indexprs IS NULL
        ) THEN
          ALTER TABLE public.transfers ADD CONSTRAINT transfers_reference_number_unique UNIQUE (reference_number);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
          WHERE c.conrelid = 'public.transfers'::regclass AND c.contype = 'f'
            AND c.confrelid = 'public.beneficiaries'::regclass AND a.attname = 'beneficiary_id'
        ) THEN
          ALTER TABLE public.transfers ADD CONSTRAINT transfers_beneficiary_id_beneficiaries_id_fk
            FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON DELETE SET NULL;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS transfers_status_idx ON public.transfers(status);
      CREATE INDEX IF NOT EXISTS transfers_ref_idx ON public.transfers(reference_number);

      CREATE TABLE IF NOT EXISTS public.scheduled_transfers (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        source_account_id integer NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
        beneficiary_id integer REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
        destination_account_id integer REFERENCES public.accounts(id) ON DELETE SET NULL,
        transfer_type text NOT NULL DEFAULT 'internal',
        recipient_name text,
        recipient_bank text,
        recipient_account_no text,
        swift_code text,
        amount_cents integer NOT NULL,
        note text,
        frequency text NOT NULL DEFAULT 'once',
        next_run_at timestamptz NOT NULL,
        last_run_at timestamptz,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS scheduled_user_idx ON public.scheduled_transfers(user_id);
      CREATE INDEX IF NOT EXISTS scheduled_next_run_idx ON public.scheduled_transfers(next_run_at, active);
    `);

    await applyCardsUpgrade(tx);
    const report = await inspectDatabase(tx);
    if (!report.ok) {
      throw new UpgradeSafetyError(
        `Upgrade rolled back because this database needs additional review: ${[...report.missingTables, ...report.missingColumns, ...report.identifierIssues].join(", ")}. No changes were committed.`,
      );
    }
    return report;
  });
}
