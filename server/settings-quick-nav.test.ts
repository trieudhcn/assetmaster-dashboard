import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("settings quick navigation", () => {
  it("provides quick anchors for the four primary settings groups", () => {
    const navigation = readFileSync(resolve(import.meta.dirname, "../client/src/components/SettingsQuickNav.tsx"), "utf8");
    expect(navigation).toContain('href: "#settings-brand"');
    expect(navigation).toContain('href: "#settings-branches"');
    expect(navigation).toContain('href: "#settings-menu"');
    expect(navigation).toContain('href: "#settings-enhancements"');
    expect(navigation).toContain("xl:hidden");
    expect(navigation).toContain("xl:block");
  });
});
