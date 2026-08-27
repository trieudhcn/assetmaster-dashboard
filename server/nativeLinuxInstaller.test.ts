import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("native Linux installer and runbook", () => {
  it("cung cấp installer tương tác, không phá hủy dữ liệu và không ghi secret LDAPS vào lệnh", async () => {
    const script = await readFile(
      path.join(root, "scripts/install-self-hosted-linux.sh"),
      "utf8"
    );
    expect(script).toContain("set -Eeuo pipefail");
    expect(script).toContain("--source-dir");
    expect(script).toContain("--letsencrypt-email");
    expect(script).toContain("--ldap-bind-password-file");
    expect(script).toContain(
      "/etc/assetmaster/secrets/assetmaster_ldap_bind_password"
    );
    expect(script).toContain("certbot --nginx --non-interactive");
    expect(script).toContain("systemctl enable --now assetmaster");
    expect(script).not.toMatch(/^\s*(?:mysql\s+.*)?DROP\s+DATABASE/im);
    expect(script).not.toMatch(/^\s*rm\s+-rf\b/m);
    expect(script).not.toMatch(/^\s*docker\s+compose\s+.*\bdown\s+-v\b/m);
  });

  it("mô tả điều kiện HTTP-01 và secret LDAPS native với kiểm soát quyền", async () => {
    const guide = await readFile(
      path.join(root, "docs/linux-local-systemd-step-by-step.md"),
      "utf8"
    );
    expect(guide).toContain("Let’s Encrypt HTTPS qua Nginx");
    expect(guide).toContain("HTTP-01");
    expect(guide).toContain("port 80");
    expect(guide).toContain("certbot renew --dry-run");
    expect(guide).toContain("Cấu hình LDAPS native");
    expect(guide).toContain(
      "/etc/assetmaster/secrets/assetmaster_ldap_bind_password"
    );
    expect(guide).toContain("root:assetmaster");
    expect(guide).toContain("0640");
  });
});
