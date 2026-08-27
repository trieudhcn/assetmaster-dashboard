import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("unified self-hosted deployment guide", () => {
  it("hợp nhất local, Docker, installer, Nginx, LDAPS, backup và quyết định production", async () => {
    const guide = await readFile(
      path.join(root, "docs/huong-dan-trien-khai-noi-bo.md"),
      "utf8"
    );

    expect(guide).toContain("Phương án A — Chạy local với Node.js và systemd");
    expect(guide).toContain("Phương án B — Docker Compose production");
    expect(guide).toContain("Hoàn tất installer `/setup`");
    expect(guide).toContain("Cấu hình LDAPS, nhóm quyền và đồng bộ người dùng");
    expect(guide).toContain("Checklist cutover và các blocker hiện còn");
    expect(guide).toContain("Storage nội bộ");
    expect(guide).toContain("ERR_MODULE_NOT_FOUND: vite");
  });
});
