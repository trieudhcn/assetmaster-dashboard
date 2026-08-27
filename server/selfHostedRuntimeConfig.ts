import crypto from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type RuntimeDatabaseConfig = { databaseUrl: string; databaseName: string; createdAt: string };

function runtimeConfigPath() {
  return process.env.SELF_HOSTED_RUNTIME_CONFIG_PATH || "/data/assetmaster/runtime.json";
}

export async function writeRuntimeDatabaseConfig(config: RuntimeDatabaseConfig) {
  const target = runtimeConfigPath();
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(config), { encoding: "utf8", mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, target);
  await chmod(target, 0o600);
}

export async function readRuntimeDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const raw = await readFile(runtimeConfigPath(), "utf8");
    const config = JSON.parse(raw) as Partial<RuntimeDatabaseConfig>;
    return typeof config.databaseUrl === "string" && config.databaseUrl.startsWith("mysql:") ? config.databaseUrl : null;
  } catch {
    return null;
  }
}
