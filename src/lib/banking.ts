export const ACCOUNT_TYPES = [
  "checking", "savings", "salary", "joint", "student", "fixed_deposit", "money_market",
  "business_checking", "business_savings", "merchant", "corporate", "trust", "escrow", "retirement", "foreign_currency",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export const ACCOUNT_LABELS: Record<AccountType, string> = {
  checking: "Current / checking", savings: "Savings", salary: "Salary", joint: "Joint account",
  student: "Student", fixed_deposit: "Fixed deposit", money_market: "Money market",
  business_checking: "Business checking", business_savings: "Business savings", merchant: "Merchant",
  corporate: "Corporate", trust: "Trust", escrow: "Escrow", retirement: "Retirement",
  foreign_currency: "Foreign currency",
};
export const ACCOUNT_DESCRIPTIONS: Record<AccountType, string> = {
  checking: "Your everyday essentials. Spend, send and receive.",
  savings: "A separate place for the things you're saving for.",
  salary: "A dedicated place for regular salary deposits and everyday spending.",
  student: "A simple everyday account for student life and study expenses.",
  business_checking: "Manage routine business income, supplier payments and transfers.",
  business_savings: "Keep business reserves separate from everyday operating funds.",
  merchant: "A demo settlement account for simulated card and electronic sales.",
  corporate: "Keep company funds organized in a dedicated business account.",
  trust: "A demo account category for funds managed on behalf of beneficiaries.",
  escrow: "A demo holding account for funds awaiting an agreed next step.",
  retirement: "Set aside funds for long-term retirement saving goals.",
  money_market: "A flexible savings category; any interest is illustrative and not automatically credited.",
  fixed_deposit: "Set money aside for a fixed 3, 6 or 12 month term.",
  foreign_currency: "Hold a balance in another supported currency.",
  joint: "Manage a shared balance with an invited customer.",
};
export const ACCOUNT_TYPE_GROUPS: { title: string; types: readonly AccountType[] }[] = [
  { title: "Personal", types: ["checking", "savings", "salary", "student", "joint", "fixed_deposit", "money_market", "retirement", "foreign_currency"] },
  { title: "Business", types: ["business_checking", "business_savings", "merchant", "corporate"] },
  { title: "Specialized", types: ["trust", "escrow"] },
];
export const TERM_RATES: Record<number, number> = { 3: 350, 6: 400, 12: 425 };
export const CARD_STATUSES = ["active", "frozen", "awaiting_activation", "replaced", "closed"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];
export const CARD_NETWORKS = ["visa", "mastercard", "american_express", "discover", "unionpay", "other"] as const;
export type CardNetwork = (typeof CARD_NETWORKS)[number];
export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  active: "Active", frozen: "Frozen", awaiting_activation: "Awaiting activation", replaced: "Replaced", closed: "Closed",
};
export interface CardDTO {
  id: number; accountId: number; accountName: string; currency: string;
  kind: "virtual" | "physical"; network: CardNetwork; name: string; holderName: string;
  last4: string; expiryMonth: number; expiryYear: number; status: CardStatus;
  onlineEnabled: boolean; internationalEnabled: boolean; atmEnabled: boolean;
  dailyLimitCents: number; monthlyLimitCents: number; dailySpentCents: number; monthlySpentCents: number;
  pinSet: boolean; pinChangedAt: string | null;
  appleWalletDemo: boolean; googleWalletDemo: boolean;
  deliveryAddress: string | null; replacementReason: string | null; createdAt: string;
}
export interface CardActivityDTO {
  id: number; cardId: number; merchant: string; amountCents: number; channel: "pos" | "online" | "atm";
  international: boolean; status: "completed" | "declined"; declineReason: string | null;
  reference: string; occurredAt: string;
}
export interface JointInvitationDTO {
  id: number; accountId: number; accountName: string; ownerName: string; currency: string;
  status: "pending" | "accepted" | "declined"; createdAt: string;
}
export interface StatementDTO {
  account: { id: number; name: string; type: AccountType; currency: string; accountNumber: string; holders: string[]; closedAt: string | null };
  from: string; to: string; generatedAt: string;
  openingCents: number; closingCents: number; incomingCents: number; outgoingCents: number;
  rows: { id: number; date: string; description: string; category: string; status: string; amountCents: number; balanceCents: number }[];
}
/** All monetary fields in this demo use fixed hundredths, including JPY. */
export function parseAmount(value: unknown, currency = "USD"): number | null {
  const text = String(value ?? "").trim();
  if (!(currency === "JPY" ? /^\d{1,8}$/ : /^\d{1,8}(\.\d{1,2})?$/).test(text)) return null;
  const [major, fraction = ""] = text.split(".");
  const result = Number(major) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result <= 1_000_000_000 ? result : null;
}
export function termMaturity(months: number, now = new Date()) {
  const result = new Date(now);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}
export function isTermLocked(account: { type: string; maturityAt: string | Date | null }): boolean {
  return account.type === "fixed_deposit" && (!account.maturityAt || new Date(account.maturityAt).getTime() > Date.now());
}
