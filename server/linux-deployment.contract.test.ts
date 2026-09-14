import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(file: string) {
  return readFileSync(resolve(root, file), "utf8");
}

describe("Ubuntu Docker deployment", () => {
  it("keeps Linux-only identity mounts outside the Desktop override", () => {
    const linux = source("docker-compose.linux.yml");
    const desktop = source("docker-compose.desktop.yml");

    expect(linux).toContain("entra_client_secret");
    expect(linux).toContain("ldap_bind_password");
    expect(linux).toContain("NODE_EXTRA_CA_CERTS");
    expect(linux).toContain("ASSETMASTER_CA_FILE");
    expect(linux).toContain('ENTRA_CLIENT_SECRET: ""');
    expect(desktop).not.toContain("docker-compose.linux.yml");
    expect(desktop).not.toContain("entra_client_secret");
  });

  it(
    "prepares persistent paths and validates production secrets before startup",
    () => {
      const installer = source("scripts/install-ubuntu.sh");
      const guide = source("docs/ubuntu-docker-deployment.md");

      expect(installer).toContain("/srv/assetmaster/data");
      expect(installer).toContain("/etc/assetmaster/secrets");
      expect(installer).toContain("mysql_root_password");
      expect(installer).toContain("ldap_bind_password");
      expect(installer).toContain("entra_client_secret");
      expect(installer).toContain("docker-compose.linux.yml");
      expect(installer).toContain("/readyz");
      expect(installer).toContain("mysqladmin ping");
      expect(installer).toContain("redis-cli --no-auth-warning");
      expect(installer).not.toContain("down -v");
      expect(guide).toContain("docker-compose.desktop.yml");
      expect(guide).toContain("docker-compose.linux.yml");
      expect(guide).toContain("/run/secrets/ldap_bind_password");
      expect(guide).toContain("/run/secrets/entra_client_secret");
    }
  );

  it("starts and probes the complete Linux stack in CI", () => {
    const workflow = source(".github/workflows/ci.yml");

    expect(workflow).toContain("Linux Compose integration");
    expect(workflow).toContain("scripts/install-ubuntu.sh");
    expect(workflow).toContain("docker-compose.linux.yml");
    expect(workflow).toContain("/readyz");
    expect(workflow).toContain("mysqladmin ping");
    expect(workflow).toContain("redis-cli --no-auth-warning");
  });
});
