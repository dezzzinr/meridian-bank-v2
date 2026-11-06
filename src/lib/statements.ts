import { and, asc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, accountMembers, transactions, users } from "@/db/schema";
import { accountAccess } from "./banking-server";
import { HttpError } from "./api";
import { ACCOUNT_LABELS, type StatementDTO } from "./banking";

export function statementRange(from: string | null, to: string | null) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startText = from ?? `${today.slice(0, 7)}-01`;
  const endText = to ?? today;
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value).getTime()) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(startText) || !validDate(endText)) throw new HttpError(400, "Choose valid start and end dates.");
  const start = new Date(`${startText}T00:00:00Z`);
  const end = new Date(`${endText}T00:00:00Z`);
  if (end < start || endText > today || end.getTime() - start.getTime() > 366 * 86_400_000) throw new HttpError(400, "Choose a date range of up to one year, ending today or earlier.");
  return { startText, endText, start, endExclusive: new Date(end.getTime() + 86_400_000) };
}
export async function getStatement(userId: number, accountId: number, from: string | null, to: string | null): Promise<StatementDTO> {
  const range = statementRange(from, to);
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ account: accounts, ownerName: users.name }).from(accounts)
      .innerJoin(users, eq(accounts.userId, users.id)).where(and(eq(accounts.id, accountId), accountAccess(userId)));
    if (!row) throw new HttpError(404, "Account not found.");
    const account = row.account;
    const [afterStart] = await tx.select({ net: sql<string>`coalesce(sum(case when ${transactions.kind} in ('credit','transfer_in') then ${transactions.amountCents} else -${transactions.amountCents} end),0)` })
      .from(transactions).where(and(eq(transactions.accountId, accountId), ne(transactions.status, "voided"), gte(transactions.occurredAt, range.start)));
    const rows = await tx.select().from(transactions).where(and(eq(transactions.accountId, accountId), ne(transactions.status, "voided"), gte(transactions.occurredAt, range.start), lt(transactions.occurredAt, range.endExclusive)))
      .orderBy(asc(transactions.occurredAt), asc(transactions.id)).limit(5001);
    if (rows.length > 5000) throw new HttpError(400, "This statement has too many transactions. Choose a shorter date range.");
    const holders = await tx.select({ name: users.name }).from(accountMembers).innerJoin(users, eq(accountMembers.userId, users.id))
      .where(and(eq(accountMembers.accountId, accountId), eq(accountMembers.status, "accepted")));
    const openingCents = account.balanceCents - Number(afterStart.net);
    let balance = openingCents;
    let incomingCents = 0;
    let outgoingCents = 0;
    const lines = rows.map((t) => {
      const incoming = t.kind === "credit" || t.kind === "transfer_in";
      const amountCents = incoming ? t.amountCents : -t.amountCents;
      balance += amountCents;
      if (incoming) incomingCents += t.amountCents; else outgoingCents += t.amountCents;
      return { id: t.id, date: t.occurredAt.toISOString(), description: t.description, category: t.category, status: t.status, amountCents, balanceCents: balance };
    });
    return {
      account: { id: account.id, name: account.name, type: account.type, currency: account.currency, accountNumber: account.accountNumber, holders: [row.ownerName, ...holders.map((h) => h.name)], closedAt: account.closedAt?.toISOString() ?? null },
      from: range.startText, to: range.endText, generatedAt: new Date().toISOString(),
      openingCents, closingCents: balance, incomingCents, outgoingCents, rows: lines,
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

/** Quote all text and neutralize spreadsheet formulas, including leading whitespace. */
export function csvCell(value: string) {
  const safe = /^[\s]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function statementCSV(s: StatementDTO) {
  const num = (n: number) => n / 100;
  const rows: (string | number)[][] = [
    ["Meridian Account Statement"], ["Account", s.account.name], ["Account number", s.account.accountNumber],
    ["Holders", s.account.holders.join("; ")], ["Currency", s.account.currency], ["Period", `${s.from} to ${s.to} (UTC)`],
    ["Opening available balance", num(s.openingCents)], ["Money in", num(s.incomingCents)], ["Money out", num(s.outgoingCents)], ["Closing available balance", num(s.closingCents)],
    ["Note", "Pending entries are included; voided entries excluded. Official authenticated statement."], [],
    ["Date (UTC)", "Description", "Category", "Status", "Amount", "Available balance", "Currency", "Transaction ID"],
    ...s.rows.map((r) => [r.date, r.description, r.category, r.status, num(r.amountCents), num(r.balanceCents), s.account.currency, String(r.id)]),
  ];
  return "\uFEFF" + rows.map((row) => row.map((value) => typeof value === "number" ? value.toFixed(s.account.currency === "JPY" ? 0 : 2) : csvCell(value)).join(",")).join("\r\n");
}
export async function statementPDF(s: StatementDTO) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  // Standard PDF fonts use WinAnsi. Normalize unsupported characters safely.
  const text = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?");
  const amount = (n: number) => `${(n / 100).toFixed(s.account.currency === "JPY" ? 0 : 2)} ${s.account.currency}`;
  const green = rgb(0.06, 0.35, 0.28);
  let page = doc.addPage([595, 842]);
  let y = 788;
  const line = (value: string, size = 10, strong = false) => {
    page.drawText(text(value), { x: 40, y, size, font: strong ? bold : font, color: rgb(0.12, 0.16, 0.14) }); y -= size + 8;
  };
  const tableHeader = () => {
    page.drawRectangle({ x: 35, y: y - 5, width: 525, height: 23, color: rgb(0.89, 0.94, 0.91) });
    for (const [label, x] of [["Date", 40], ["Description / status", 112], ["Amount", 372], ["Balance", 476]] as [string, number][]) page.drawText(label, { x, y, size: 9, font: bold, color: green });
    y -= 29;
  };
  page.drawText("MERIDIAN", { x: 40, y, size: 24, font: bold, color: green }); y -= 34;
  line("ACCOUNT STATEMENT", 13, true);
  line(`${s.from} - ${s.to}  |  UTC  |  ${ACCOUNT_LABELS[s.account.type]}`);
  for (const value of [s.account.name, `Account: ${s.account.accountNumber}`, ...s.account.holders.map((h) => `Holder: ${h}`)]) line(value.slice(0, 90));
  y -= 8;
  line(`Opening available balance: ${amount(s.openingCents)}`, 11, true);
  line(`Money in: ${amount(s.incomingCents)}    Money out: ${amount(s.outgoingCents)}`);
  line(`Closing available balance: ${amount(s.closingCents)}`, 11, true);
  y -= 15; tableHeader();
  if (!s.rows.length) line("No transactions in this period.");
  for (const row of s.rows) {
    if (y < 105) { page = doc.addPage([595, 842]); y = 788; line("MERIDIAN / Continued", 16, true); y -= 8; tableHeader(); }
    page.drawText(row.date.slice(0, 10), { x: 40, y, size: 9, font });
    page.drawText(text(row.description).slice(0, 44), { x: 112, y, size: 9, font });
    page.drawText((row.amountCents / 100).toFixed(s.account.currency === "JPY" ? 0 : 2), { x: 372, y, size: 9, font });
    page.drawText((row.balanceCents / 100).toFixed(s.account.currency === "JPY" ? 0 : 2), { x: 476, y, size: 9, font });
    y -= 13;
    page.drawText(`${row.status} / #${row.id}`, { x: 112, y, size: 8, font, color: rgb(0.45, 0.49, 0.47) });
    y -= 21;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText("Official electronic record. Authenticated ledger balances.", { x: 40, y: 45, size: 8, font });
    p.drawText(`Generated ${s.generatedAt.slice(0, 10)} / ${s.account.currency} / Page ${i + 1} of ${pages.length}`, { x: 40, y: 31, size: 8, font });
  });
  doc.setTitle("Meridian Account Statement");
  doc.setAuthor("Meridian");
  return doc.save();
}
