import crypto from "node:crypto";
import path from "node:path";
import { createConnection } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import argon2 from "argon2";
import {
  completeInstallation,
  getInstallationSettings,
  resetDatabaseConnection,
} from "./db";
import { selfHostedAuthEnabled } from "./selfHostedAuth";
import {
  readRuntimeDatabaseUrl,
  writeRuntimeDatabaseConfig,
} from "./selfHostedRuntimeConfig";

const DATABASE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const HOSTNAME = /^(?:[A-Za-z0-9-]+\.)*[A-Za-z0-9-]+$/;
const PORT = /^[1-9][0-9]{0,4}$/;

export type SetupDatabaseInput = {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
};
export type SetupInput = {
  setupToken: string;
  websiteName: string;
  websiteUrl: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  database: SetupDatabaseInput;
};

export function selfHostedSetupEnabled() {
  return (
    selfHostedAuthEnabled() && process.env.SELF_HOSTED_SETUP_ENABLED === "true"
  );
}

function expectedSetupToken() {
  return process.env.SELF_HOSTED_SETUP_TOKEN || "";
}

function tokensMatch(actual: string, expected: string) {
  if (!actual || !expected || actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function assertSetupAccess(setupToken: string) {
  if (!selfHostedSetupEnabled())
    throw new Error(
      "Trình cài đặt chỉ khả dụng trên bản self-hosted đã bật SELF_HOSTED_SETUP_ENABLED=true."
    );
  if (!tokensMatch(setupToken, expectedSetupToken()))
    throw new Error("Mã cài đặt không hợp lệ hoặc đã hết hiệu lực.");
}

function normalizeWebsiteUrl(value: string) {
  if (!value.trim()) return null;
  const url = new URL(value.trim());
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("Địa chỉ website phải bắt đầu bằng http:// hoặc https://.");
  return url.toString().replace(/\/$/, "");
}

export function validateSetupDatabase(input: SetupDatabaseInput) {
  if (!HOSTNAME.test(input.host.trim()) || input.host.trim().length > 253)
    return "Tên máy chủ MySQL không hợp lệ.";
  if (
    !Number.isInteger(input.port) ||
    input.port < 1 ||
    input.port > 65535 ||
    !PORT.test(String(input.port))
  )
    return "Cổng MySQL không hợp lệ.";
  if (!DATABASE_NAME.test(input.databaseName))
    return "Tên database chỉ gồm chữ, số và dấu gạch dưới; phải bắt đầu bằng chữ cái.";
  if (!input.username.trim() || input.username.length > 128)
    return "Cần nhập tài khoản MySQL.";
  if (!input.password) return "Cần nhập mật khẩu MySQL.";
  return null;
}

function databaseUrl(input: SetupDatabaseInput) {
  return `mysql://${encodeURIComponent(input.username)}:${encodeURIComponent(input.password)}@${input.host.trim()}:${input.port}/${input.databaseName}`;
}

function safeDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/access denied|ER_ACCESS_DENIED/i.test(message))
    return "MySQL từ chối tài khoản hoặc mật khẩu. Hãy kiểm tra quyền truy cập.";
  if (/connect|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(message))
    return "Không thể kết nối MySQL. Hãy kiểm tra địa chỉ, cổng và dịch vụ MySQL.";
  if (/CREATE command denied|ER_DBACCESS_DENIED/i.test(message))
    return "Tài khoản MySQL chưa có quyền tạo database. Hãy dùng tài khoản cài đặt có quyền phù hợp.";
  return "Không thể kiểm tra kết nối MySQL. Vui lòng xem log máy chủ để được hỗ trợ.";
}

async function connect(input: SetupDatabaseInput, withDatabase = false) {
  return createConnection({
    host: input.host.trim(),
    port: input.port,
    user: input.username.trim(),
    password: input.password,
    ...(withDatabase ? { database: input.databaseName } : {}),
    connectTimeout: 8_000,
  });
}

async function ensureInstallerDatabase(input: SetupDatabaseInput) {
  let connection;
  try {
    connection = await connect(input);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${input.databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    return;
  } catch (createError) {
    // Docker Compose may provision the database before /setup and intentionally
    // give the runtime account database-only privileges. Continue only when that
    // exact database is already reachable with the supplied account.
    let existingDatabaseConnection;
    try {
      existingDatabaseConnection = await connect(input, true);
      await existingDatabaseConnection.query("SELECT 1 AS connection_ok");
      return;
    } catch {
      throw createError;
    } finally {
      await existingDatabaseConnection?.end().catch(() => undefined);
    }
  } finally {
    await connection?.end().catch(() => undefined);
  }
}

export async function checkSetupDatabase(input: SetupDatabaseInput) {
  const validation = validateSetupDatabase(input);
  if (validation) return { success: false, message: validation };
  let connection;
  try {
    connection = await connect(input);
    await connection.query("SELECT 1 AS connection_ok");
    return {
      success: true,
      message: "Đã kết nối MySQL. Có thể tiếp tục cài đặt.",
    };
  } catch (error) {
    return { success: false, message: safeDatabaseError(error) };
  } finally {
    await connection?.end().catch(() => undefined);
  }
}

export async function installerStatus() {
  if (!selfHostedSetupEnabled())
    return {
      selfHosted: false,
      installed: true,
      databaseReady: Boolean(await readRuntimeDatabaseUrl()),
    };
  try {
    const installation = await getInstallationSettings();
    return {
      selfHosted: true,
      installed: installation?.status === "installed",
      databaseReady: Boolean(await readRuntimeDatabaseUrl()),
      websiteName: installation?.websiteName ?? null,
    };
  } catch {
    return {
      selfHosted: true,
      installed: false,
      databaseReady: Boolean(await readRuntimeDatabaseUrl()),
      websiteName: null,
    };
  }
}

export async function runSelfHostedInstaller(input: SetupInput) {
  assertSetupAccess(input.setupToken);
  const current = await installerStatus();
  if (current.installed)
    throw new Error(
      "AssetMaster đã hoàn tất cài đặt. Không thể chạy lại /setup."
    );
  const dbValidation = validateSetupDatabase(input.database);
  if (dbValidation) throw new Error(dbValidation);
  const websiteName = input.websiteName.trim();
  const adminName = input.adminName.trim();
  const adminEmail = input.adminEmail.trim().toLocaleLowerCase("en-US");
  if (!websiteName || websiteName.length > 255)
    throw new Error("Cần nhập tên website tối đa 255 ký tự.");
  if (!adminName || adminName.length > 255)
    throw new Error("Cần nhập tên Quản trị viên.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || adminEmail.length > 320)
    throw new Error("Email Quản trị viên không hợp lệ.");
  if (input.adminPassword.length < 12 || input.adminPassword.length > 256)
    throw new Error("Mật khẩu Quản trị viên cần từ 12 đến 256 ký tự.");
  const websiteUrl = normalizeWebsiteUrl(input.websiteUrl);
  try {
    await ensureInstallerDatabase(input.database);
  } catch (error) {
    throw new Error(safeDatabaseError(error));
  }
  const url = databaseUrl(input.database);
  if (!process.env.DATABASE_URL) {
    await writeRuntimeDatabaseConfig({
      databaseUrl: url,
      databaseName: input.database.databaseName,
      createdAt: new Date().toISOString(),
    });
    process.env.DATABASE_URL = url;
  }
  resetDatabaseConnection();
  const migrationDb = drizzle(url);
  await migrate(migrationDb, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
  const passwordHash = await argon2.hash(input.adminPassword, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const completed = await completeInstallation({
    websiteName,
    websiteUrl,
    databaseName: input.database.databaseName,
    bootstrapEmail: adminEmail,
    bootstrapName: adminName,
    passwordHash,
  });
  return {
    ...completed,
    message:
      "Đã tạo database, chạy migration và khởi tạo tài khoản Quản trị viên. Bạn có thể đăng nhập.",
  };
}
