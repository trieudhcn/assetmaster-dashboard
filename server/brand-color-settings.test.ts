import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("configurable primary brand color", () => {
  const enhancements = readFileSync(resolve(import.meta.dirname, "../client/src/components/BrandEnhancementsPanel.tsx"), "utf8");
  const home = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");
  const login = readFileSync(resolve(import.meta.dirname, "../client/src/pages/LoginGateway.tsx"), "utf8");
  const styles = readFileSync(resolve(import.meta.dirname, "../client/src/index.css"), "utf8");

  it("applies and resets the saved brand color", () => {
    expect(enhancements).toContain('const DEFAULT_BRAND_COLOR = "#0F8C8C"');
    expect(enhancements).toContain("const applyColor = (nextColor: string, message: string)");
    expect(enhancements).toContain('applyColor(DEFAULT_BRAND_COLOR, "Đã đặt lại màu chủ đạo mặc định.")');
    expect(enhancements).toContain('<div className="mt-3 grid grid-cols-2 gap-2">');
    expect(enhancements).toContain("<Save size={13} />Áp dụng");
    expect(enhancements).toContain("<RotateCcw size={13} />Đặt lại");
    expect(enhancements).toContain("useEffect(() => setColor(info.brandColor || DEFAULT_BRAND_COLOR), [info.brandColor])");
  });

  it("restores the configured color in authenticated and public screens", () => {
    expect(home).toContain('style.setProperty("--assetmaster-brand", companyInfo.brandColor || "#0F8C8C")');
    expect(login).toContain('style.setProperty("--assetmaster-brand", brandColor)');
  });

  it("bridges the runtime color to primary UI utilities", () => {
    expect(styles).toContain("--assetmaster-brand: #0F8C8C");
    expect(styles).toContain("--primary: var(--assetmaster-brand)");
    expect(styles).toContain('[class~="bg-[#0F8C8C]"]');
    expect(styles).toContain('[class~="text-[#0F8C8C]"]');
    expect(styles).toContain('[class~="hover:bg-[#087A6A]"]:hover');
    expect(styles).toContain(".primary-action { background-color: var(--assetmaster-brand); }");
  });
});
