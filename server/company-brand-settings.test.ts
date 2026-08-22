import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("company brand contact actions", () => {
  it("exposes accessible copy actions for populated company phone and email values", () => {
    const settings = readFileSync(resolve(import.meta.dirname, "../client/src/components/CompanyBrandSettings.tsx"), "utf8");

    expect(settings).toContain('import { Building2, CheckCircle2, Copy');
    expect(settings).toContain("const copyContact = async");
    expect(settings).toContain("navigator.clipboard?.writeText");
    expect(settings).toContain('document.execCommand("copy")');
    expect(settings).toContain('aria-label="Sao chép Số điện thoại"');
    expect(settings).toContain('aria-label="Sao chép Email công ty"');
    expect(settings).toContain("disabled={!draft.phone.trim()}");
    expect(settings).toContain("disabled={!draft.email.trim()}");
    expect(settings).toContain("Đã sao chép ${label}.");
  });
});
