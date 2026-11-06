import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, accountMembers, notifications, transactions, users } from "@/db/schema";
import { HttpError, readBody, str } from "@/lib/api";
import { bankingError, bankingUser, lockedActiveUser, privateHeaders } from "@/lib/banking-server";
import { ACCOUNT_TYPES, parseAmount, TERM_RATES, termMaturity, type AccountType } from "@/lib/banking";
import { isValidCurrency } from "@/lib/currency";
import { generateAccountNumber } from "@/lib/ids";
import { listAccounts, toAccountDTO } from "@/lib/queries";

export async function GET(req: Request) {
  try {
    const user = await bankingUser();
    const includeClosed = new URL(req.url).searchParams.get("includeClosed") === "true";
    return Response.json({ accounts: await listAccounts(user.id, includeClosed) }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "accounts:list"); }
}

export async function POST(req: Request) {
  try {
    const user = await bankingUser(true);
    const body = await readBody(req);
    const name = str(body.name, 2, 48);
    if (!name) throw new HttpError(400, "Account name must be 2–48 characters.");
    const type = String(body.type ?? "checking") as AccountType;
    if (!ACCOUNT_TYPES.includes(type)) throw new HttpError(400, "Choose a supported account type.");
    const currency = type === "foreign_currency" ? body.currency : user.currency;
    if (!isValidCurrency(currency)) throw new HttpError(400, "Choose a supported currency.");
    if (type === "foreign_currency" && currency === user.currency) throw new HttpError(400, "Choose a currency different from your home currency.");
    const amount = parseAmount(body.amount ?? "0", currency);
    if (amount === null) throw new HttpError(400, "Enter a valid opening amount in the selected currency.");
    const term = Number(body.termMonths);
    if (type === "fixed_deposit" && (!TERM_RATES[term] || amount <= 0)) throw new HttpError(400, "Fixed deposits need a positive opening amount and a 3, 6 or 12 month term.");
    const email = typeof body.jointEmail === "string" ? body.jointEmail.trim().toLowerCase() : "";
    if (type === "joint" && (!/^\S+@\S+\.\S+$/.test(email) || email === user.email)) throw new HttpError(400, "Enter another registered customer's email to invite.");

    const account = await db.transaction(async (tx) => {
      await lockedActiveUser(tx, user.id);
      const existing = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, user.id), isNull(accounts.closedAt)));
      if (existing.length >= 20) throw new HttpError(400, "You can have up to 20 open accounts.");
      const [coholder] = type === "joint"
        ? await tx.select({ id: users.id }).from(users).where(and(eq(users.email, email), eq(users.status, "active")))
        : [];
      if (type === "joint" && !coholder) throw new HttpError(400, "The invited customer must have an active registered account.");
      const number = generateAccountNumber();
      const [created] = await tx.insert(accounts).values({
        userId: user.id, name, type, currency, accountNumber: number, last4: number.slice(-4), balanceCents: amount,
        termMonths: type === "fixed_deposit" ? term : null,
        interestRateBps: type === "fixed_deposit" ? TERM_RATES[term] : null,
        maturityAt: type === "fixed_deposit" ? termMaturity(term) : null,
      }).returning();
      if (amount > 0) await tx.insert(transactions).values({ userId: user.id, accountId: created.id, kind: "credit", category: "Other", description: "Demo opening deposit", amountCents: amount, status: "completed" });
      if (coholder) {
        await tx.insert(accountMembers).values({ accountId: created.id, userId: coholder.id });
        await tx.insert(notifications).values({ userId: coholder.id, type: "account", title: "Joint account invitation", body: `${user.name} invited you to ${name}. Accept or decline in Accounts. No balance or transaction access is granted until you accept.`, createdBy: user.id });
      }
      await tx.insert(notifications).values({ userId: user.id, type: "account", title: "Account opened", body: `${name} is ready in ${currency}.${coholder ? " Your co-holder invitation is pending." : ""}` });
      return created;
    });
    return Response.json(toAccountDTO(account, user.id, user.name), { status: 201, headers: privateHeaders });
  } catch (error) { return bankingError(error, "accounts:create"); }
}
