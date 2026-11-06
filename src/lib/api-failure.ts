import { randomUUID } from "node:crypto";
import { describeDatabaseError } from "./database-errors";

/** Preserve actionable error codes without leaking SQL or database credentials. */
export function apiFailure(error: unknown, operation: string): Response {
  const problem = describeDatabaseError(error);
  const errorId = randomUUID();
  console.error(`[${operation}] ${errorId}: ${problem.code}. ${problem.message}`);
  return Response.json(
    { error: problem.message, code: problem.code, hint: problem.hint, errorId },
    { status: problem.status, headers: { "Cache-Control": "no-store" } },
  );
}
