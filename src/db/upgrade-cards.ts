import { sql } from "drizzle-orm";
import type { DBTransaction } from "@/lib/banking-server";

/** Additive migration: no resets, deletes, relabeling of existing currencies, or balance changes. */
export async function applyCardsUpgrade(tx: DBTransaction) {
  await tx.execute(sql`
    ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS currency text;
    UPDATE public.accounts a SET currency = u.currency FROM public.users u
      WHERE a.user_id = u.id AND (a.currency IS NULL OR a.currency = '');
    ALTER TABLE public.accounts ALTER COLUMN currency SET DEFAULT 'USD';
    ALTER TABLE public.accounts ALTER COLUMN currency SET NOT NULL;
    ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS term_months integer;
    ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS interest_rate_bps integer;
    ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS maturity_at timestamptz;

    CREATE TABLE IF NOT EXISTS public.account_members (
      id serial PRIMARY KEY,
      account_id integer NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending', responded_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS account_members_account_user_idx ON public.account_members(account_id, user_id);
    CREATE INDEX IF NOT EXISTS account_members_user_idx ON public.account_members(user_id);

    CREATE TABLE IF NOT EXISTS public.cards (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      account_id integer NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
      kind text NOT NULL, name text NOT NULL, holder_name text NOT NULL,
      demo_number text NOT NULL UNIQUE, last4 text NOT NULL,
      expiry_month integer NOT NULL, expiry_year integer NOT NULL,
      status text NOT NULL DEFAULT 'active',
      online_enabled boolean NOT NULL DEFAULT true,
      international_enabled boolean NOT NULL DEFAULT false,
      atm_enabled boolean NOT NULL DEFAULT false,
      daily_limit_cents integer NOT NULL DEFAULT 100000,
      monthly_limit_cents integer NOT NULL DEFAULT 500000,
      pin_hash text, pin_changed_at timestamptz,
      auth_failures integer NOT NULL DEFAULT 0, auth_locked_until timestamptz,
      pin_failures integer NOT NULL DEFAULT 0, pin_locked_until timestamptz,
      apple_wallet_demo boolean NOT NULL DEFAULT false,
      google_wallet_demo boolean NOT NULL DEFAULT false,
      delivery_address text, replacement_reason text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS cards_user_idx ON public.cards(user_id);
    CREATE INDEX IF NOT EXISTS cards_account_idx ON public.cards(account_id);
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS card_id integer REFERENCES public.cards(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS public.card_activity (
      id serial PRIMARY KEY,
      card_id integer NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      transaction_id integer REFERENCES public.transactions(id) ON DELETE SET NULL,
      merchant text NOT NULL, amount_cents integer NOT NULL, channel text NOT NULL,
      international boolean NOT NULL DEFAULT false,
      status text NOT NULL, decline_reason text, reference text NOT NULL UNIQUE,
      occurred_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS card_activity_card_time_idx ON public.card_activity(card_id, occurred_at);

    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS transaction_pin_hash text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_secret text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS biometrics_enabled boolean NOT NULL DEFAULT false;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS security_question text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS security_answer_hash text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_locked boolean NOT NULL DEFAULT false;

    ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS device_name text NOT NULL DEFAULT 'Current Browser';
    ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip_address text NOT NULL DEFAULT '127.0.0.1';
    ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_agent text;
    ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false;
    ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

    CREATE TABLE IF NOT EXISTS public.login_history (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      ip_address text NOT NULL DEFAULT '127.0.0.1',
      user_agent text,
      location text NOT NULL DEFAULT 'Local Network',
      status text NOT NULL DEFAULT 'success',
      failure_reason text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS login_history_user_idx ON public.login_history(user_id, created_at);

    CREATE TABLE IF NOT EXISTS public.trusted_devices (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      device_name text NOT NULL,
      device_fingerprint text NOT NULL,
      last_used_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS trusted_devices_user_fingerprint ON public.trusted_devices(user_id, device_fingerprint);

    CREATE TABLE IF NOT EXISTS public.otps (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      action text NOT NULL,
      code text NOT NULL,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS otps_user_action_idx ON public.otps(user_id, action);
  `);
}
