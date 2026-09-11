import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

function readSecret(variable) {
  const filePath = process.env[`${variable}_FILE`];
  if (!filePath) return process.env[variable] || "";
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    throw new Error(`Cannot read Docker secret for ${variable}`);
  }
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const password = readSecret("MYSQL_APP_PASSWORD");
  if (!password)
    throw new Error(
      "DATABASE_URL or MYSQL_APP_PASSWORD_FILE is required to run self-hosted migrations"
    );
  const host = process.env.ASSETMASTER_DB_HOST || "mysql";
  const port = process.env.ASSETMASTER_DB_PORT || "3306";
  const name = process.env.ASSETMASTER_DB_NAME || "assetmaster";
  const user = process.env.ASSETMASTER_DB_USER || "assetmaster";
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`;
}

const databaseUrl = resolveDatabaseUrl();

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
