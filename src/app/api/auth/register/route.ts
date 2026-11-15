import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions, users } from "@/db/schema";
import { ACCOUNT_TYPES, parseAmount, TERM_RATES, termMaturity, type AccountType } from "@/lib/banking";
import { createSession, setSessionCookie } from "@/lib/auth";
import { apiError, readBody, str } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { generateAccountNumber } from "@/lib/ids";
import { isValidCurrency, regionForCurrency } from "@/lib/currency";

export async function POST(req: Request) {
  const body = await readBody(req);
  const firstName = str(body.firstName, 1, 60) ?? "";
  const lastName = str(body.lastName, 1, 60) ?? "";
  const name = `${firstName} ${lastName}`.trim();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const country = str(body.country, 2, 80) ?? "";
  const phone = str(body.phone, 7, 32) ?? "";
  const dateOfBirth = str(body.dateOfBirth, 10, 10) ?? "";
  const addressLine = str(body.addressLine, 3, 120) ?? "";
  const city = str(body.city, 2, 80) ?? "";
  const postalCode = str(body.postalCode, 2, 20) ?? "";
  const currency = body.currency;
  const accountCurrency = body.accountCurrency;
  const type = String(body.accountType ?? "checking") as AccountType;

  if (!firstName || !lastName) return apiError(400, "Enter your first and last name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return apiError(400, "Enter a valid email address.");
  if (!/^\+?[\d\s().-]{7,32}$/.test(phone)) return apiError(400, "Enter a valid phone number.");
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const age = (Date.now() - birth.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== dateOfBirth || age < 18 || age > 120) return apiError(400, "You must be at least 18 and enter a valid date of birth.");
  if (!country || !addressLine || !city || !postalCode) return apiError(400, "Complete all address details.");
  if (!isValidCurrency(currency) || !isValidCurrency(accountCurrency)) return apiError(400, "Choose a supported currency.");
  if (!ACCOUNT_TYPES.includes(type) || type === "joint") return apiError(400, "Choose an available account type.");
  if (password.length < 8) return apiError(400, "Password must be at least 8 characters.");
  const amount = parseAmount(body.initialDeposit ?? "0", accountCurrency);
  if (amount === null) return apiError(400, "Enter a valid initial deposit in the selected currency.");
  const term = Number(body.termMonths ?? 6);
  if (type === "fixed_deposit" && (!TERM_RATES[term] || amount <= 0)) return apiError(400, "Fixed deposits need a positive deposit and a 3, 6 or 12 month term.");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return apiError(409, "An account with this email already exists.");

  try {
    const user = await db.transaction(async (tx) => {
      const [createdUser] = await tx.insert(users).values({
        name, email, passwordHash: hashPassword(password), currency, region: regionForCurrency(currency),
        country, phone, dateOfBirth, addressLine, city, postalCode,
      }).returning();
      const number = generateAccountNumber();
      const [account] = await tx.insert(accounts).values({
        userId: createdUser.id, name: `${firstName}'s ${type === "checking" ? "Current" : type === "savings" ? "Savings" : type.replaceAll("_", " ")} Account`,
        type, currency: accountCurrency, accountNumber: number, last4: number.slice(-4), balanceCents: amount,
        termMonths: type === "fixed_deposit" ? term : null,
        interestRateBps: type === "fixed_deposit" ? TERM_RATES[term] : null,
        maturityAt: type === "fixed_deposit" ? termMaturity(term) : null,
      }).returning();
      if (amount > 0) await tx.insert(transactions).values({ userId: createdUser.id, accountId: account.id, kind: "credit", category: "Other", description: "Opening deposit", amountCents: amount, status: "completed" });
      return createdUser;
    });
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    return Response.json({ id: user.id, name: user.name, email: user.email, token }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return apiError(409, "An account with this email already exists.");
    throw error;
  }
}
