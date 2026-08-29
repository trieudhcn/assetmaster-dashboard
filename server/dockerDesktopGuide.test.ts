import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Docker Desktop guide", () => {
  it("hướng dẫn Windows/macOS, Docker Compose, setup và kho tệp dùng chung", async () => {
    const guide = await readFile(
      path.join(process.cwd(), "docs/docker-desktop-step-by-step.md"),
      "utf8"
    );
    expect(guide).toContain("Windows 10/11");
    expect(guide).toContain("macOS");
    expect(guide).toContain(
      "docker compose -f docker-compose.yml -f docker-compose.desktop.yml up -d --build"
    );
    expect(guide).toContain("docker-compose.desktop.yml");
    expect(guide).toContain("compose.env.desktop.template");
    expect(guide).toContain("Đừng copy `docker/compose.env.template`");
    expect(guide).toContain("http://localhost:3000/setup");
    expect(guide).toContain("Kho tệp đính kèm");
    expect(guide).toContain("ASSETMASTER_DESKTOP_FILES_DIR");
    expect(guide).toContain(
      "Backup MySQL trước khi cập nhật source hoặc rebuild app"
    );
    expect(guide).toContain("mysqldump --single-transaction");
    expect(guide).toContain("docker cp");
    expect(guide).toContain("Get-FileHash -Path $backupFile -Algorithm SHA256");
    expect(guide).toContain("Kiểm tra app đã cập nhật sau rebuild");
    expect(guide).toContain("docker inspect --format");
    expect(guide).toContain("--force-recreate --no-deps app");
    expect(guide).toContain("Docker Desktop.** Đây là UAT/desktop stack");
    expect(guide).toContain("$rng.GetBytes($bytes)");
    expect(guide).not.toContain("RandomNumberGenerator]::Fill");
  });

  it("hướng dẫn kết nối Docker Desktop với AD Windows Server 2022 qua LDAPS", async () => {
    const guide = await readFile(
      path.join(process.cwd(), "docs/docker-desktop-ldaps-ad-windows-server-2022.md"),
      "utf8"
    );
    expect(guide).toContain("Active Directory Windows Server 2022");
    expect(guide).toContain("ldaps://dc01.corp.example.local:636");
    expect(guide).toContain("ldap_bind_password.txt");
    expect(guide).toContain("/run/secrets/ldap_bind_password");
    expect(guide).toContain("Server Authentication");
    expect(guide).toContain("Test-NetConnection dc01.corp.example.local -Port 636");
    expect(guide).toContain("userPrincipalName");
    expect(guide).toContain("objectGUID");
    expect(guide).toContain("Giữ Admin cục bộ");
    expect(guide).toContain("không dùng `ldap://` hoặc port `389` cho đăng nhập");
    expect(guide).toContain("Microsoft Learn");
    expect(guide).toContain("build --no-cache app");
    expect(guide).toContain("Không chạy `down -v`");
    expect(guide).toContain("không còn request tới `/manus-storage/empty-maintenance_83a5137a.png`");
  });
});
