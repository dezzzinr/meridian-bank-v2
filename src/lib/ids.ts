import { randomBytes, randomInt } from "crypto";

/** Generate a 10-digit numeric demo account number. */
export function generateAccountNumber(): string {
  return String(randomInt(1_000_000_000, 10_000_000_000));
}

/** Generate a human-readable transfer reference: MERD-XXXXXXXX */
export function generateRefNumber(): string {
  return "MERD-" + randomBytes(4).toString("hex").toUpperCase();
}
