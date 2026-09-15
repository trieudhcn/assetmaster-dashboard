import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("company brand contact actions", () => {
  it("exposes accessible copy actions for populated company phone and email values", () => {
    const settings = readFileSync(resolve(import.meta.dirname, "../client/src/components/CompanyBrandSettings.tsx"), "utf8");
    const home = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");

    expect(settings).toContain('import { Building2, CheckCircle2, CircleHelp, Copy');
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
    expect(settings).toContain("Ẩn Website trên mẫu nội bộ");
    expect(settings).toContain("checked={draft.hideWebsiteOnInternalPdf}");
    expect(settings).toContain("Đã sao chép ${label}.");
    expect(settings).toContain("const normalizeLogo = async (file: File)");
    expect(settings).toContain('output.toDataURL("image/webp", 0.92)');
    expect(settings).toContain("Đã căn giữa logo theo tỷ lệ chuẩn");
    expect(settings).toContain('grid gap-4 lg:grid-cols-2');
    expect(settings).toContain('id="settings-brand"');
    expect(settings).toContain('id="settings-login-identity"');
    expect(settings).toContain("scroll-mt-24");
    expect(settings).toContain('min-h-11 resize-y pr-10');
    expect(settings).toContain('order-first lg:col-span-2');
    expect(settings).toContain('Hiển thị trong các tài liệu xuất, trừ khi bạn bật tùy chọn mẫu nội bộ.');
    expect(settings).toContain('CircleHelp');
    expect(settings).toContain('group absolute right-3 top-1/2');
    expect(settings).toContain('Ẩn Website trên các tài liệu xuất dùng trong nội bộ.');
    expect(settings).toContain('import { BrandEnhancementsPanel } from "./BrandEnhancementsPanel"');
    expect(settings).toContain("<BrandEnhancementsPanel info={draft}");
    expect(settings).toContain("embedded />");
    expect(home).not.toContain('import { BrandEnhancementsPanel } from "@/components/BrandEnhancementsPanel"');
    expect(home).not.toContain("<BrandEnhancementsPanel info={companyInfo}");
  });
});
