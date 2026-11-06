import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, notifications, transactions, transfers, users } from "@/db/schema";
import { HttpError, readBody, str } from "@/lib/api";
import { accountAccess, bankingError, bankingUser, lockedActiveUser, positiveId, privateHeaders } from "@/lib/banking-server";
import { parseAmount } from "@/lib/banking";
import { generateRefNumber } from "@/lib/ids";
import { money } from "@/lib/format";

export async function POST(req: Request) {
  try {
    const user = await bankingUser(true);
    const body = await readBody(req);
    const mode = String(body.mode); // 'generate_qr', 'pay_qr', 'mobile_money', 'one_tap'

    if (mode === "generate_qr") {
      const accountId = positiveId(body.accountId);
      const [acc] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), accountAccess(user.id)))
        .limit(1);

      if (!acc) throw new HttpError(404, "Account not found.");

      const qrPayload = JSON.stringify({
        bank: "Meridian",
        accountNumber: acc.accountNumber,
        accountName: acc.name,
        currency: acc.currency,
        beneficiary: user.name,
      });

      return Response.json({
        qrCode: btoa(qrPayload),
        accountNumber: acc.accountNumber,
        currency: acc.currency,
        accountName: acc.name,
      });
    }

    if (mode === "pay_qr") {
      const qrDataRaw = str(body.qrData, 5, 1000);
      if (!qrDataRaw) throw new HttpError(400, "Invalid QR code scanned.");

      let parsedQr: any;
      try {
        const decoded = atob(qrDataRaw);
        parsedQr = JSON.parse(decoded);
      } catch {
        throw new HttpError(400, "Scanned QR code is not a valid Meridian payment format.");
      }

      const sourceId = positiveId(body.sourceAccountId);
      const [source] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, sourceId), accountAccess(user.id)))
        .limit(1);

      if (!source) throw new HttpError(404, "Source account not found.");
      const amount = parseAmount(body.amount, source.currency);
      if (!amount || amount <= 0) throw new HttpError(400, "Invalid payment amount.");
      if (amount > source.balanceCents) throw new HttpError(400, "Insufficient funds.");

      const ref = generateRefNumber();

      await db.transaction(async (tx) => {
        await lockedActiveUser(tx, user.id);
        await tx.insert(transfers).values({
          userId: user.id,
          sourceAccountId: source.id,
          transferType: "bill_payment",
          referenceNumber: ref,
          recipientName: parsedQr.beneficiary || parsedQr.accountName,
          recipientAccountNo: parsedQr.accountNumber,
          amountCents: amount,
          status: "completed",
          completedAt: new Date(),
        });

        await tx.insert(transactions).values({
          userId: user.id,
          accountId: source.id,
          kind: "payment",
          category: "Shopping",
          description: `QR Payment to ${parsedQr.beneficiary || parsedQr.accountName}`,
          note: `Scanned Merchant QR`,
          amountCents: amount,
          status: "completed",
        });

        await tx.update(accounts).set({
          balanceCents: sql`${accounts.balanceCents} - ${amount}`,
        }).where(eq(accounts.id, source.id));

        await tx.insert(notifications).values({
          userId: user.id,
          type: "payment",
          title: "Instant QR Payment Complete",
          body: `${money(amount, source.currency)} sent via QR scan. Ref: ${ref}`,
        });
      });

      return Response.json({ ok: true, reference: ref });
    }

    if (mode === "mobile_money") {
      const provider = str(body.provider, 2, 40) || "M-Pesa / Mobile Wallet";
      const phone = str(body.phone, 5, 25);
      if (!phone) throw new HttpError(400, "Recipient mobile number is required.");

      const sourceId = positiveId(body.sourceAccountId);
      const [source] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, sourceId), accountAccess(user.id)))
        .limit(1);

      if (!source) throw new HttpError(404, "Source account not found.");
      const amount = parseAmount(body.amount, source.currency);
      if (!amount || amount <= 0) throw new HttpError(400, "Invalid amount.");
      if (amount > source.balanceCents) throw new HttpError(400, "Insufficient balance.");

      const ref = generateRefNumber();

      await db.transaction(async (tx) => {
        await lockedActiveUser(tx, user.id);
        await tx.insert(transfers).values({
          userId: user.id,
          sourceAccountId: source.id,
          transferType: "to_payee",
          referenceNumber: ref,
          recipientName: `${provider} (${phone})`,
          amountCents: amount,
          status: "completed",
          completedAt: new Date(),
        });

        await tx.insert(transactions).values({
          userId: user.id,
          accountId: source.id,
          kind: "payment",
          category: "Transfers",
          description: `Mobile Money transfer to ${phone}`,
          note: `Provider: ${provider}`,
          amountCents: amount,
          status: "completed",
        });

        await tx.update(accounts).set({
          balanceCents: sql`${accounts.balanceCents} - ${amount}`,
        }).where(eq(accounts.id, source.id));

        await tx.insert(notifications).values({
          userId: user.id,
          type: "payment",
          title: "Mobile Money Sent",
          body: `${money(amount, source.currency)} dispatched to ${phone} via ${provider}.`,
        });
      });

      return Response.json({ ok: true, reference: ref });
    }

    throw new HttpError(400, "Unsupported mobile banking operation.");
  } catch (error) {
    return bankingError(error, "mobile:action");
  }
}
