import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("settings quick navigation", () => {
  it("provides primary setting links plus icon actions for hidden self-hosted panels", () => {
    const navigation = readFileSync(
      resolve(
        import.meta.dirname,
        "../client/src/components/SettingsQuickNav.tsx"
      ),
      "utf8"
    );
    expect(navigation).toContain('href: "#settings-brand"');
    expect(navigation).toContain('href: "#settings-branches"');
    expect(navigation).toContain('href: "#settings-menu"');
    expect(navigation).toContain('href: "#settings-enhancements"');
    expect(navigation.indexOf('href: "#settings-brand"')).toBeLessThan(
      navigation.indexOf('href: "#settings-enhancements"')
    );
    expect(navigation.indexOf('href: "#settings-enhancements"')).toBeLessThan(
      navigation.indexOf('href: "#settings-directory"')
    );
    expect(navigation).toContain("fixed right-4 top-24");
    expect(navigation).toContain("assetmaster:open-self-hosted-service-status");
    expect(navigation).toContain("assetmaster:open-self-hosted-file-storage");
    expect(navigation).toContain(
      "assetmaster:open-self-hosted-backup-recovery"
    );
    expect(navigation).toContain("ServerCog");
    expect(navigation).toContain("FolderCog");
    expect(navigation).toContain("ShieldCheck");
    expect(navigation).toContain("xl:hidden");
    expect(navigation).toContain("xl:block");
  });
});
