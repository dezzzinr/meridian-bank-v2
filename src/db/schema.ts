import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ACCOUNT_TYPES, CARD_STATUSES } from "@/lib/banking";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  transactionPinHash: text("transaction_pin_hash"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  biometricsEnabled: boolean("biometrics_enabled").notNull().default(false),
  securityQuestion: text("security_question"),
  securityAnswerHash: text("security_answer_hash"),
  accountLocked: boolean("account_locked").notNull().default(false),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  status: text("status", { enum: ["active", "suspended", "closed"] })
    .notNull()
    .default("active"),
  currency: text("currency").notNull().default("USD"),
  region: text("region").notNull().default("United States"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "transfer",
        "payment",
        "account",
        "security",
        "admin_message",
        "system",
      ],
    })
      .notNull()
      .default("system"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  deviceName: text("device_name").notNull().default("Current Browser"),
  ipAddress: text("ip_address").notNull().default("127.0.0.1"),
  userAgent: text("user_agent"),
  isCurrent: boolean("is_current").notNull().default(false),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const loginHistory = pgTable(
  "login_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address").notNull().default("127.0.0.1"),
    userAgent: text("user_agent"),
    location: text("location").notNull().default("Local Network"),
    status: text("status", { enum: ["success", "failed", "suspicious"] })
      .notNull()
      .default("success"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_history_user_idx").on(t.userId, t.createdAt)]
);

export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceName: text("device_name").notNull(),
    deviceFingerprint: text("device_fingerprint").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trusted_devices_user_fingerprint").on(t.userId, t.deviceFingerprint)]
);

export const otps = pgTable(
  "otps",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // 'login', 'transfer', 'password_reset'
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otps_user_action_idx").on(t.userId, t.action)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ACCOUNT_TYPES }).notNull().default("checking"),
    currency: text("currency").notNull().default("USD"),
    termMonths: integer("term_months"),
    interestRateBps: integer("interest_rate_bps"),
    maturityAt: timestamp("maturity_at", { withTimezone: true }),
    accountNumber: text("account_number").notNull().unique(),
    last4: text("last4").notNull(),
    balanceCents: bigint("balance_cents", { mode: "number" })
      .notNull()
      .default(0),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const accountMembers = pgTable("account_members", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).notNull().default("pending"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("account_members_account_user_idx").on(t.accountId, t.userId), index("account_members_user_idx").on(t.userId)]);

/** Synthetic demo cards only. The 0000 prefix is deliberately not a network PAN. */
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["virtual", "physical"] }).notNull(),
  name: text("name").notNull(),
  holderName: text("holder_name").notNull(),
  demoNumber: text("demo_number").notNull().unique(),
  last4: text("last4").notNull(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  status: text("status", { enum: CARD_STATUSES }).notNull().default("active"),
  onlineEnabled: boolean("online_enabled").notNull().default(true),
  internationalEnabled: boolean("international_enabled").notNull().default(false),
  atmEnabled: boolean("atm_enabled").notNull().default(false),
  dailyLimitCents: integer("daily_limit_cents").notNull().default(100000),
  monthlyLimitCents: integer("monthly_limit_cents").notNull().default(500000),
  pinHash: text("pin_hash"),
  pinChangedAt: timestamp("pin_changed_at", { withTimezone: true }),
  authFailures: integer("auth_failures").notNull().default(0),
  authLockedUntil: timestamp("auth_locked_until", { withTimezone: true }),
  pinFailures: integer("pin_failures").notNull().default(0),
  pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
  appleWalletDemo: boolean("apple_wallet_demo").notNull().default(false),
  googleWalletDemo: boolean("google_wallet_demo").notNull().default(false),
  deliveryAddress: text("delivery_address"),
  replacementReason: text("replacement_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("cards_user_idx").on(t.userId), index("cards_account_idx").on(t.accountId)]);

export const payees = pgTable(
  "payees",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    methodType: text("method_type", { enum: ["bank", "email", "mobile"] })
      .notNull()
      .default("bank"),
    methodDetail: text("method_detail").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payees_user_idx").on(t.userId)],
);

/** Saved transfer templates / beneficiaries. */
export const beneficiaries = pgTable(
  "beneficiaries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    recipientName: text("recipient_name").notNull(),
    bankName: text("bank_name"),
    bankCode: text("bank_code"),
    accountNumber: text("account_number").notNull(),
    swiftCode: text("swift_code"),
    country: text("country"),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("beneficiaries_user_idx").on(t.userId)],
);

export const transfers = pgTable(
  "transfers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceAccountId: integer("source_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    destinationAccountId: integer("destination_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    payeeId: integer("payee_id").references(() => payees.id, {
      onDelete: "set null",
    }),
    beneficiaryId: integer("beneficiary_id").references(() => beneficiaries.id, {
      onDelete: "set null",
    }),
    transferType: text("transfer_type", {
      enum: [
        "internal",
        "to_account",
        "to_payee",
        "international",
        "bill_payment",
      ],
    })
      .notNull()
      .default("internal"),
    referenceNumber: text("reference_number").notNull().unique(),
    recipientName: text("recipient_name"),
    recipientBank: text("recipient_bank"),
    recipientAccountNo: text("recipient_account_no"),
    swiftCode: text("swift_code"),
    destinationCurrency: text("destination_currency"),
    exchangeRate: text("exchange_rate"),
    amountCents: integer("amount_cents").notNull(),
    feeCents: integer("fee_cents").notNull().default(0),
    note: text("note"),
    status: text("status", {
      enum: ["pending", "processing", "completed", "voided", "failed"],
    })
      .notNull()
      .default("pending"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transfers_user_idx").on(t.userId),
    index("transfers_status_idx").on(t.status),
    index("transfers_ref_idx").on(t.referenceNumber),
  ],
);

export const scheduledTransfers = pgTable(
  "scheduled_transfers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceAccountId: integer("source_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id").references(
      () => beneficiaries.id,
      { onDelete: "set null" },
    ),
    destinationAccountId: integer("destination_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    transferType: text("transfer_type", {
      enum: ["internal", "to_account", "to_payee", "international", "bill_payment"],
    })
      .notNull()
      .default("internal"),
    recipientName: text("recipient_name"),
    recipientBank: text("recipient_bank"),
    recipientAccountNo: text("recipient_account_no"),
    swiftCode: text("swift_code"),
    amountCents: integer("amount_cents").notNull(),
    note: text("note"),
    frequency: text("frequency", {
      enum: ["once", "daily", "weekly", "biweekly", "monthly"],
    })
      .notNull()
      .default("once"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scheduled_user_idx").on(t.userId),
    index("scheduled_next_run_idx").on(t.nextRunAt, t.active),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    transferId: integer("transfer_id").references(() => transfers.id, {
      onDelete: "set null",
    }),
    payeeId: integer("payee_id").references(() => payees.id, {
      onDelete: "set null",
    }),
    cardId: integer("card_id").references(() => cards.id, { onDelete: "set null" }),
    kind: text("kind", {
      enum: ["credit", "debit", "payment", "transfer_in", "transfer_out"],
    }).notNull(),
    category: text("category").notNull().default("Other"),
    description: text("description").notNull(),
    note: text("note"),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: ["pending", "completed", "voided"] })
      .notNull()
      .default("completed"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_user_idx").on(t.userId),
    index("transactions_account_time_idx").on(t.accountId, t.occurredAt),
  ],
);

export const cardActivity = pgTable("card_activity", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  merchant: text("merchant").notNull(),
  amountCents: integer("amount_cents").notNull(),
  channel: text("channel", { enum: ["pos", "online", "atm"] }).notNull(),
  international: boolean("international").notNull().default(false),
  status: text("status", { enum: ["completed", "declined"] }).notNull(),
  declineReason: text("decline_reason"),
  reference: text("reference").notNull().unique(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("card_activity_card_time_idx").on(t.cardId, t.occurredAt)]);
