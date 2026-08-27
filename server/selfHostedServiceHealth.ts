import net from "node:net";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { selfHostedAuthEnabled } from "./selfHostedAuth";

const PROBE_TIMEOUT_MS = 3_000;

export type ServiceHealthStatus = "ready" | "unavailable" | "not_configured";

export type ServiceHealth = {
  status: ServiceHealthStatus;
  checkedAt: string;
  latencyMs: number | null;
  message: string;
};

function measured(
  status: ServiceHealthStatus,
  startedAt: number,
  message: string
): ServiceHealth {
  return {
    status,
    checkedAt: new Date().toISOString(),
    latencyMs: status === "ready" ? Math.max(0, Date.now() - startedAt) : null,
    message,
  };
}

async function probeMysql(): Promise<ServiceHealth> {
  const startedAt = Date.now();
  const db = await getDb();
  if (!db)
    return measured(
      "not_configured",
      startedAt,
      "Chưa có kết nối database runtime."
    );

  try {
    await db.execute(sql`SELECT 1 AS connection_ok`);
    return measured(
      "ready",
      startedAt,
      "Kết nối và truy vấn kiểm tra thành công."
    );
  } catch {
    return measured(
      "unavailable",
      startedAt,
      "Không thể truy vấn MySQL. Hãy kiểm tra log container và Docker secret."
    );
  }
}

function redisConnection() {
  const rawUrl = process.env.REDIS_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "redis:" || !url.hostname) return null;
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      password: url.password ? decodeURIComponent(url.password) : null,
    };
  } catch {
    return null;
  }
}

function redisCommand(parts: string[]) {
  return `*${parts.length}\r\n${parts.map(part => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join("")}`;
}

async function pingRedis(
  connection: NonNullable<ReturnType<typeof redisConnection>>
) {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({
      host: connection.host,
      port: connection.port,
    });
    let response = "";
    let completed = false;

    const finish = (callback: () => void) => {
      if (completed) return;
      completed = true;
      socket.removeAllListeners();
      socket.destroy();
      callback();
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once("timeout", () =>
      finish(() => reject(new Error("Redis timeout")))
    );
    socket.once("error", () =>
      finish(() => reject(new Error("Redis unavailable")))
    );
    socket.once("connect", () => {
      const commands = connection.password
        ? [redisCommand(["AUTH", connection.password]), redisCommand(["PING"])]
        : [redisCommand(["PING"])];
      socket.write(commands.join(""));
    });
    socket.on("data", chunk => {
      response += chunk.toString("utf8");
      if (response.includes("+PONG\r\n")) finish(resolve);
      else if (response.startsWith("-"))
        finish(() => reject(new Error("Redis rejected probe")));
    });
  });
}

async function probeRedis(): Promise<ServiceHealth> {
  const startedAt = Date.now();
  const connection = redisConnection();
  if (!connection)
    return measured(
      "not_configured",
      startedAt,
      "Chưa cấu hình Redis cho runtime này."
    );

  try {
    await pingRedis(connection);
    return measured("ready", startedAt, "Kết nối và lệnh PING thành công.");
  } catch {
    return measured(
      "unavailable",
      startedAt,
      "Không thể kết nối Redis. Hãy kiểm tra container, network và Docker secret."
    );
  }
}

export async function getSelfHostedServiceHealth() {
  const checkedAt = new Date().toISOString();
  if (!selfHostedAuthEnabled()) {
    return { selfHosted: false, checkedAt, mysql: null, redis: null } as const;
  }

  const [mysql, redis] = await Promise.all([probeMysql(), probeRedis()]);
  return { selfHosted: true, checkedAt, mysql, redis } as const;
}
