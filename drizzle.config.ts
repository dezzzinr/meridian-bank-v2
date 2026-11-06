import { defineConfig } from "drizzle-kit";
import { loadDatabaseEnvironment } from "./scripts/lib/environment";

loadDatabaseEnvironment();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
});
