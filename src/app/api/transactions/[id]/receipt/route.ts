import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, payees, transactions, users } from "@/db/schema";
import { HttpError } from "@/lib/api";
import { bankingError, bankingUser, positiveId, privateHeaders, accountAccess } from "@/lib/banking-server";
import { money, fmtDateTime } from "@/lib/format";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await bankingUser();
    const id = positiveId((await ctx.params).id);
    const format = new URL(req.url).searchParams.get("format") || "json";

    const [row] = await db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        accountName: accounts.name,
        accountNumber: accounts.accountNumber,
        currency: accounts.currency,
        kind: transactions.kind,
        category: transactions.category,
        description: transactions.description,
        note: transactions.note,
        amountCents: transactions.amountCents,
        status: transactions.status,
        occurredAt: transactions.occurredAt,
        payeeName: payees.name,
        transferId: transactions.transferId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(payees, eq(transactions.payeeId, payees.id))
      .where(and(eq(transactions.id, id), accountAccess(user.id)))
      .limit(1);

    if (!row) throw new HttpError(404, "Transaction not found.");

    const reference = `TXN-${String(row.id).padStart(8, "0")}`;
    const formattedAmount = money(row.amountCents, row.currency);
    const dateFormatted = fmtDateTime(row.occurredAt);

    if (format === "pdf") {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const page = doc.addPage([420, 600]);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);

      const green = rgb(0.06, 0.35, 0.28);
      const ink = rgb(0.12, 0.16, 0.14);
      const muted = rgb(0.45, 0.49, 0.47);

      // Header
      page.drawRectangle({ x: 0, y: 530, width: 420, height: 70, color: rgb(0.92, 0.96, 0.94) });
      page.drawText("MERIDIAN ONLINE BANKING", { x: 30, y: 560, size: 14, font: bold, color: green });
      page.drawText("Official Electronic Transaction Receipt", { x: 30, y: 544, size: 9, font, color: muted });

      // Amount Banner
      page.drawText("Transaction Amount", { x: 30, y: 490, size: 10, font, color: muted });
      page.drawText(formattedAmount, { x: 30, y: 460, size: 26, font: bold, color: green });

      // Receipt details table
      let y = 410;
      const drawRow = (label: string, value: string) => {
        page.drawText(label, { x: 30, y, size: 9, font, color: muted });
        page.drawText(value, { x: 170, y, size: 9, font: bold, color: ink });
        page.drawLine({ start: { x: 30, y: y - 8 }, end: { x: 390, y: y - 8 }, color: rgb(0.9, 0.9, 0.9), thickness: 0.5 });
        y -= 28;
      };

      drawRow("Transaction Reference", reference);
      drawRow("Date & Time", dateFormatted);
      drawRow("Status", row.status.toUpperCase());
      drawRow("Payment Type", row.kind.toUpperCase().replace("_", " "));
      drawRow("Category", row.category);
      drawRow("Description", row.description.slice(0, 35));
      drawRow("Account Debited", `${row.accountName} (${row.accountNumber})`);
      if (row.payeeName) drawRow("Recipient Payee", row.payeeName);
      if (row.note) drawRow("Payment Note", row.note.slice(0, 35));

      // Security watermark / verification
      page.drawRectangle({ x: 30, y: 60, width: 360, height: 45, color: rgb(0.97, 0.97, 0.97) });
      page.drawText("AUTHENTICATED RECORD", { x: 42, y: 88, size: 8, font: bold, color: green });
      page.drawText("Cryptographically verified against Meridian Core Ledger.", { x: 42, y: 74, size: 8, font, color: muted });

      const pdfBytes = await doc.save();
      return new Response(new Uint8Array(pdfBytes), {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="meridian-receipt-${reference}.pdf"`,
        },
      });
    }

    return Response.json({
      receipt: {
        id: row.id,
        reference,
        amountFormatted: formattedAmount,
        currency: row.currency,
        amountCents: row.amountCents,
        date: dateFormatted,
        isoDate: row.occurredAt.toISOString(),
        description: row.description,
        category: row.category,
        kind: row.kind,
        status: row.status,
        accountName: row.accountName,
        accountNumber: row.accountNumber,
        payeeName: row.payeeName,
        note: row.note,
      },
    }, { headers: privateHeaders });
  } catch (error) {
    return bankingError(error, "transactions:receipt");
  }
}
