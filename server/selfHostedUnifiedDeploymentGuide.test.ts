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

  it("liên kết đến runbook Ubuntu từng bước với các kiểm soát vận hành cần thiết", async () => {
    const unifiedGuide = await readFile(
      path.join(root, "docs/huong-dan-trien-khai-noi-bo.md"),
      "utf8"
    );
    const linuxGuide = await readFile(
      path.join(root, "docs/linux-server-step-by-step.md"),
      "utf8"
    );

    expect(unifiedGuide).toContain("hướng dẫn Linux Server từng bước");
    expect(linuxGuide).toContain("Ubuntu Server 24.04 LTS");
    expect(linuxGuide).toContain("docker-compose-plugin");
    expect(linuxGuide).toContain("Nginx reverse proxy");
    expect(linuxGuide).toContain("Thiết lập firewall UFW");
    expect(linuxGuide).toContain("Hoàn tất wizard `/setup`");
    expect(linuxGuide).toContain("Cấu hình LDAPS");
    expect(linuxGuide).toContain("assetmaster-backup.timer");
    expect(linuxGuide).toContain("--no-deps app");
    expect(linuxGuide).toContain("docker compose down -v");
  });

  it("có runbook Phương án A cho người mới với các service host và giới hạn LDAPS rõ ràng", async () => {
    const unifiedGuide = await readFile(
      path.join(root, "docs/huong-dan-trien-khai-noi-bo.md"),
      "utf8"
    );
    const localGuide = await readFile(
      path.join(root, "docs/linux-local-systemd-step-by-step.md"),
      "utf8"
    );

    expect(unifiedGuide).toContain(
      "Phương án A: chạy trực tiếp trên Ubuntu Server"
    );
    expect(localGuide).toContain("Node.js 22 LTS");
    expect(localGuide).toContain("MySQL Server");
    expect(localGuide).toContain("Redis Server");
    expect(localGuide).toContain("Tạo service systemd");
    expect(localGuide).toContain("Hoàn tất `/setup`");
    expect(localGuide).toContain("LDAPS chưa hỗ trợ chạy trực tiếp");
    expect(localGuide).toContain("không dùng container");
  });
});
