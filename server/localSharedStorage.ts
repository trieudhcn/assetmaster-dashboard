import type { Express, Request, Response } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSelfHostedUser, selfHostedAuthEnabled } from "./selfHostedAuth";

function sharedStorageRoot() {
  const value = process.env.SELF_HOSTED_FILE_STORAGE_ROOT?.trim();
  return selfHostedAuthEnabled() && value ? path.resolve(value) : null;
}

function normalizeRelativePath(value: string) {
  const decoded = decodeURIComponent(value).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!decoded || decoded.includes("\0")) throw new Error("Đường dẫn tệp không hợp lệ.");
  const normalized = path.posix.normalize(decoded);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) throw new Error("Đường dẫn tệp vượt ngoài thư mục lưu trữ.");
  return normalized;
}

function resolveSharedPath(root: string, relativePath: string) {
  const target = path.resolve(root, normalizeRelativePath(relativePath));
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("Đường dẫn tệp vượt ngoài thư mục lưu trữ.");
  return target;
}

export function isSharedFileStorageEnabled() {
  return Boolean(sharedStorageRoot());
}

export async function putSharedFile(relativeKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const root = sharedStorageRoot();
  if (!root) throw new Error("Chưa mount SELF_HOSTED_FILE_STORAGE_ROOT cho môi trường self-hosted.");
  const key = normalizeRelativePath(relativeKey);
  const destination = resolveSharedPath(root, key);
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(temporary, data, { mode: 0o640 });
  await fs.rename(temporary, destination);
  return { key, url: `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`, contentType };
}

export async function testSharedDirectory(relativeDirectory: string) {
  const root = sharedStorageRoot();
  if (!root) return { status: "failed" as const, message: "Chưa mount thư mục chia sẻ vào container (SELF_HOSTED_FILE_STORAGE_ROOT)." };
  try {
    const directory = resolveSharedPath(root, relativeDirectory);
    await fs.mkdir(directory, { recursive: true, mode: 0o750 });
    const probe = path.join(directory, `.assetmaster-write-test-${crypto.randomUUID()}`);
    await fs.writeFile(probe, "AssetMaster storage test", { mode: 0o640 });
    await fs.unlink(probe);
    return { status: "success" as const, message: "Thư mục chia sẻ có thể tạo và xóa tệp kiểm tra." };
  } catch {
    return { status: "failed" as const, message: "Không thể ghi vào thư mục chia sẻ. Kiểm tra mount Docker và quyền thư mục trên host." };
  }
}

export function registerSharedStorageRoutes(app: Express) {
  app.get("/api/files/*", async (req: Request, res: Response) => {
    if (!selfHostedAuthEnabled()) return res.status(404).end();
    const user = await getSelfHostedUser(req);
    if (!user) return res.status(401).json({ error: "authentication_required" });
    const root = sharedStorageRoot();
    if (!root) return res.status(503).json({ error: "shared_storage_unavailable" });
    try {
      const filePath = resolveSharedPath(root, String(req.params[0] || ""));
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(filePath, error => {
        if (!error || res.headersSent) return;
        if ((error as NodeJS.ErrnoException).code === "ENOENT") res.status(404).json({ error: "file_not_found" });
        else res.status(500).json({ error: "file_read_failed" });
      });
    } catch {
      res.status(400).json({ error: "invalid_file_path" });
    }
  });
}
