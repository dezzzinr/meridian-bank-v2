import { randomBytes } from "crypto";

/** Generate a fake IBAN-like account number: MR + 2 check digits + 23 digits. */
export function generateAccountNumber(): string {
  const bank = "0001";
  const branch = "0001";
  const account = randomBytes(6).toString("hex").slice(0, 12).toUpperCase();
  const body = bank + branch + account;
  const check = String(body.length % 97)
    .padStart(2, "0");
  return "MR" + check + body;
}

/** Generate a human-readable transfer reference: MERD-XXXXXXXX */
export function generateRefNumber(): string {
  return "MERD-" + randomBytes(4).toString("hex").toUpperCase();
}
