import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

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

const supplyReturnSchemaRequirements = [
  {
    table: "inventorySupplies",
    column: "damagedQuantity",
    definition:
      "ALTER TABLE \`inventorySupplies\` ADD \`damagedQuantity\` decimal(15,2) DEFAULT '0' NOT NULL AFTER \`stockQuantity\`",
  },
  {
    table: "inventorySupplies",
    column: "repairQuantity",
    definition:
      "ALTER TABLE \`inventorySupplies\` ADD \`repairQuantity\` decimal(15,2) DEFAULT '0' NOT NULL AFTER \`damagedQuantity\`",
  },
  {
    table: "supplyReturnRequests",
    column: "returnReceiptCode",
    definition:
      "ALTER TABLE \`supplyReturnRequests\` ADD \`returnReceiptCode\` varchar(64) AFTER \`sourceReferenceCode\`",
  },
  {
    table: "supplyReturnRequests",
    column: "deliveredByName",
    definition:
      "ALTER TABLE \`supplyReturnRequests\` ADD \`deliveredByName\` varchar(160) AFTER \`returnReceiptCode\`",
  },
  {
    table: "supplyReturnRequests",
    column: "receivedByName",
    definition:
      "ALTER TABLE \`supplyReturnRequests\` ADD \`receivedByName\` varchar(160) AFTER \`deliveredByName\`",
  },
  {
    table: "supplyReturnRequests",
    column: "receiptCreatedAt",
    definition:
      "ALTER TABLE \`supplyReturnRequests\` ADD \`receiptCreatedAt\` timestamp AFTER \`receivedByName\`",
  },
  {
    table: "supplyReturnRequestItems",
    column: "goodQuantity",
    definition:
      "ALTER TABLE \`supplyReturnRequestItems\` ADD \`goodQuantity\` decimal(15,2) DEFAULT '0' NOT NULL AFTER \`requestedQuantity\`",
  },
  {
    table: "supplyReturnRequestItems",
    column: "damagedQuantity",
    definition:
      "ALTER TABLE \`supplyReturnRequestItems\` ADD \`damagedQuantity\` decimal(15,2) DEFAULT '0' NOT NULL AFTER \`goodQuantity\`",
  },
  {
    table: "supplyReturnRequestItems",
    column: "missingQuantity",
    definition:
      "ALTER TABLE \`supplyReturnRequestItems\` ADD \`missingQuantity\` decimal(15,2) DEFAULT '0' NOT NULL AFTER \`damagedQuantity\`",
  },
  {
    table: "supplyReturnRequestItems",
    column: "repairQuantity",
    definition:
      "ALTER TABLE \`supplyReturnRequestItems\` ADD \`repairQuantity\` decimal(15,2) DEFAULT '0' NOT NULL AFTER \`missingQuantity\`",
  },
  {
    table: "supplyReturnRequestItems",
    column: "conditionNote",
    definition:
      "ALTER TABLE \`supplyReturnRequestItems\` ADD \`conditionNote\` text AFTER \`repairQuantity\`",
  },
];

async function ensureSupplyReturnInspectionSchema() {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    for (const requirement of supplyReturnSchemaRequirements) {
      const [rows] = await connection.execute(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
        [requirement.table, requirement.column]
      );
      if (rows.length) continue;
      try {
        await connection.query(requirement.definition);
        console.log(
          `AssetMaster: repaired missing column ${requirement.table}.${requirement.column}.`
        );
      } catch (error) {
        if (error?.code !== "ER_DUP_FIELDNAME") throw error;
      }
    }
    const [indexRows] = await connection.execute(
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplyReturnRequests' AND INDEX_NAME = 'supply_return_requests_receipt_unique' LIMIT 1"
    );
    if (!indexRows.length) {
      try {
        await connection.query(
          "CREATE UNIQUE INDEX \`supply_return_requests_receipt_unique\` ON \`supplyReturnRequests\` (\`returnReceiptCode\`)"
        );
        console.log(
          "AssetMaster: repaired missing supply return receipt index."
        );
      } catch (error) {
        if (error?.code !== "ER_DUP_KEYNAME") throw error;
      }
    }
  } finally {
    await connection.end();
  }
}

const database = drizzle(databaseUrl);
for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
  try {
    await migrate(database, { migrationsFolder });
    await ensureSupplyReturnInspectionSchema();
    console.log("AssetMaster: database migrations and schema are up to date.");
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
