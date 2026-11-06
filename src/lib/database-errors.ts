/** Public, sanitized diagnostics. Never return driver SQL, parameters, or URLs. */
export interface DatabaseProblem {
  code: string;
  message: string;
  hint: string;
  status: number;
}

export function describeDatabaseError(error: unknown): DatabaseProblem {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const codes = new Set<string>();
  const messages: string[] = [];

  while (queue.length && seen.size < 15) {
    const item = queue.shift();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    const record = item as Record<string, unknown>;
    if (typeof record.code === "string") codes.add(record.code);
    if (typeof record.message === "string") messages.push(record.message.toLowerCase());
    if (record.cause) queue.push(record.cause);
    if (Array.isArray(record.errors)) queue.push(...record.errors);
  }

  if (codes.has("42703") || codes.has("42P01")) {
    return {
      code: "DATABASE_SCHEMA_OUTDATED",
      message: "The connected database is missing a table or column required by this version.",
      hint: "For a local installation, run npx tsx scripts/check-db.ts in the project folder. Do not run the seed script on existing data.",
      status: 503,
    };
  }
  if (codes.has("28P01") || codes.has("28000")) {
    return {
      code: "DATABASE_AUTH_FAILED",
      message: "The server could not authenticate with the database.",
      hint: "Check the database credentials in DATABASE_URL, then restart the local server. This is not your banking sign-in password.",
      status: 503,
    };
  }
  if (codes.has("3D000")) {
    return {
      code: "DATABASE_NOT_FOUND",
      message: "The database specified in DATABASE_URL does not exist.",
      hint: "Verify the database name and connection string, then restart the local server.",
      status: 503,
    };
  }
  if (codes.has("42501")) {
    return {
      code: "DATABASE_PERMISSION_DENIED",
      message: "The database connection does not have the required permissions.",
      hint: "Ask the database owner to check the connection role's permissions.",
      status: 503,
    };
  }
  if (["23505", "23503"].some((code) => codes.has(code))) {
    return {
      code: "DATABASE_DATA_CONFLICT",
      message: "Existing records conflict with a database constraint.",
      hint: "Keep your data. Ask the database owner to review duplicate identifiers or broken references before retrying.",
      status: 409,
    };
  }
  if (
    [...codes].some((code) => ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "08006", "08001", "57014", "53300", "57P01", "55P03"].includes(code)) ||
    messages.some((message) => /timeout|timed out|connection terminated/.test(message))
  ) {
    return {
      code: "DATABASE_UNAVAILABLE",
      message: "The database could not be reached, or the request timed out.",
      hint: "Check the database host, internet connection, and service status. For local setup, run npx tsx scripts/check-db.ts.",
      status: 503,
    };
  }
  if ([...codes].some((code) => /CERT|TLS|SSL/.test(code)) || messages.some((message) => /certificate|ssl required/.test(message))) {
    return {
      code: "DATABASE_TLS_ERROR",
      message: "A secure connection to the database could not be established.",
      hint: "Use your provider's complete connection string and SSL settings. Do not disable certificate verification.",
      status: 503,
    };
  }
  return {
    code: "REQUEST_FAILED",
    message: "The server could not complete this request.",
    hint: "Retry. If the problem continues, check the local server terminal using the error reference below.",
    status: 500,
  };
}
