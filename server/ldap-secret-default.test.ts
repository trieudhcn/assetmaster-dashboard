import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LDAP_BIND_SECRET_REF,
  LEGACY_LDAP_BIND_SECRET_REF,
  normalizeLdapBindSecretRef,
} from "../shared/directorySecrets";

const root = process.cwd();

describe("LDAP bind secret reference", () => {
  it("uses the canonical Docker secret path and only upgrades the legacy default", () => {
    expect(DEFAULT_LDAP_BIND_SECRET_REF).toBe(
      "/run/secrets/ldap_bind_password"
    );
    expect(normalizeLdapBindSecretRef(LEGACY_LDAP_BIND_SECRET_REF)).toBe(
      DEFAULT_LDAP_BIND_SECRET_REF
    );
    expect(
      normalizeLdapBindSecretRef(
        "/etc/assetmaster/secrets/custom_ldap_password"
      )
    ).toBe("/etc/assetmaster/secrets/custom_ldap_password");
    expect(normalizeLdapBindSecretRef(null)).toBeNull();
  });

  it("keeps the UI, database schema and migration on the same default", async () => {
    const [panel, database, schema, migration] = await Promise.all([
      readFile(
        path.join(
          root,
          "client/src/components/DirectorySettingsPanel.tsx"
        ),
        "utf8"
      ),
      readFile(path.join(root, "server/db.ts"), "utf8"),
      readFile(path.join(root, "drizzle/schema.ts"), "utf8"),
      readFile(
        path.join(root, "drizzle/0069_canonical_ldap_secret_ref.sql"),
        "utf8"
      ),
    ]);

    expect(panel).toContain("DEFAULT_LDAP_BIND_SECRET_REF");
    expect(panel).toContain("normalizeLdapBindSecretRef");
    expect(database).toContain("normalizeLdapBindSecretRef");
    expect(schema).toContain('"/run/secrets/ldap_bind_password"');
    expect(migration).toContain(
      "SET `bindSecretRef` = '/run/secrets/ldap_bind_password'"
    );
    expect(migration).toContain(
      "WHERE `bindSecretRef` = '/run/secrets/assetmaster_ldap_bind_password'"
    );
  });
});
