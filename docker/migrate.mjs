import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run self-hosted migrations");
}

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const maxAttempts = Number.parseInt(process.env.ASSETMASTER_MIGRATION_ATTEMPTS || "12", 10);
const retryDelayMs = Number.parseInt(process.env.ASSETMASTER_MIGRATION_RETRY_DELAY_MS || "5000", 10);

function errorCode(error) {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error;
  return candidate.code || candidate.cause?.code;
}

function isRetryableConnectionError(error) {
  return new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EPIPE",
    "PROTOCOL_CONNECTION_LOST",
    "ER_CON_COUNT_ERROR",
  ]).has(errorCode(error));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const database = drizzle(databaseUrl);
for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
  try {
    await migrate(database, { migrationsFolder });
    console.log("AssetMaster: database migrations are up to date.");
    process.exit(0);
  } catch (error) {
    const retryable = isRetryableConnectionError(error);
    if (!retryable || attempt >= Math.max(1, maxAttempts)) {
      console.error(
        "AssetMaster: database migration failed. The application will not start.",
        error instanceof Error ? error.message : "unknown error"
      );
      process.exitCode = 1;
      break;
    }

    console.warn(
      `AssetMaster: database is not ready (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelayMs}ms.`
    );
    await sleep(Math.max(250, retryDelayMs));
  }
}

process.exitCode = 1;
