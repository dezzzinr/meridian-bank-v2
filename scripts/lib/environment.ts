import { loadEnvConfig } from "@next/env";

/** Use the same .env* precedence as `next dev`, without printing secrets. */
export function loadDatabaseEnvironment() {
  const fromShell = Boolean(process.env.DATABASE_URL);
  const { loadedEnvFiles } = loadEnvConfig(
    process.cwd(),
    process.env.NODE_ENV !== "production",
  );
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      "DATABASE_URL is missing. Add it to .env.local (beside package.json), then retry. Do not share the connection string.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
    if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error();
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string. Copy the connection string only, not a psql command.");
  }

  return {
    host: url.hostname,
    port: url.port || "5432",
    database: decodeURIComponent(url.pathname.slice(1)),
    source: fromShell
      ? "existing terminal environment (overrides .env files)"
      : loadedEnvFiles.find((file) => file.env?.DATABASE_URL !== undefined)?.path ?? ".env files",
  };
}

export function printDatabaseTarget(target: ReturnType<typeof loadDatabaseEnvironment>) {
  console.log(`Database host: ${target.host}:${target.port}`);
  console.log(`Database name: ${target.database}`);
  console.log(`DATABASE_URL source: ${target.source}`);
  console.log("Credentials are deliberately hidden. These commands use the same DATABASE_URL as your local app.\n");
}
