import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("company brand contact actions", () => {
  it("exposes accessible copy actions for populated company phone and email values", () => {
    const settings = readFileSync(resolve(import.meta.dirname, "../client/src/components/CompanyBrandSettings.tsx"), "utf8");

    expect(settings).toContain('import { Building2, CheckCircle2, Copy');
    expect(settings).toContain("const copyContact = async");
    expect(settings).toContain("navigator.clipboard.writeText");
    expect(settings).toContain('document.execCommand("copy")');
    expect(settings).toContain('copyButton(draft.phone, "Số điện thoại")');
    expect(settings).toContain('copyButton(draft.email, "Email công ty")');
    expect(settings).toContain('copyButton(draft.taxCode, "Mã số thuế")');
    expect(settings).toContain('aria-label="Sao chép Địa chỉ"');
    expect(settings).toContain("disabled={!value.trim()}");
    expect(settings).toContain("websiteUrl: string");
    expect(settings).toContain("hideWebsiteOnInternalPdf: boolean");
    expect(settings).toContain("Website công ty");
    expect(settings).toContain("Ẩn Website trên mẫu phiếu nội bộ");
    expect(settings).toContain("checked={draft.hideWebsiteOnInternalPdf}");
    expect(settings).toContain("Đã sao chép ${label}.");
    expect(settings).toContain("const normalizeLogo = async (file: File)");
    expect(settings).toContain('output.toDataURL("image/webp", 0.92)');
    expect(settings).toContain("Đã căn giữa logo theo tỷ lệ chuẩn");
  });
});
