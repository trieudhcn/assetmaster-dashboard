import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const systemDropdown = readFileSync(
  resolve(root, "client/src/components/SearchableSelect.tsx"),
  "utf8"
);

describe("maintenance monthly cost dropdowns", () => {
  it("mounts the shared AssetMaster dropdown for year and cost sorting", () => {
    expect(home).toContain('id="maintenance-chart-year" class="w-40"');
    expect(home).toContain("yearDropdownRoot?.render(");
    expect(home).toContain("sortDropdownRoot.render(");
    expect(home).toContain('ariaLabel="Chọn năm chi phí Bảo hành/Sửa chữa"');
    expect(home).toContain('ariaLabel="Sắp xếp phiếu theo chi phí"');
    expect(home).toContain('placeholder="Chọn năm"\n        variant="compact"');
    expect(home).toContain(
      'placeholder="Sắp xếp chi phí"\n          variant="compact"'
    );
    expect(home).not.toContain('searchPlaceholder="Tìm năm..."');
    expect(home).not.toContain('searchPlaceholder="Tìm cách sắp xếp..."');
    expect(home).toContain('{ value: "desc", label: "Chi phí cao → thấp" }');
    expect(home).toContain('{ value: "asc", label: "Chi phí thấp → cao" }');
  });

  it("removes the two native select implementations and cleans up nested roots", () => {
    expect(home).not.toContain(
      'querySelector<HTMLSelectElement>("#maintenance-chart-year")'
    );
    expect(home).not.toContain(
      'sortSelect = document.createElement("select")'
    );
    expect(home).toContain("yearDropdownRoot?.unmount()");
    expect(home).toContain("sortDropdownRoot?.unmount()");
  });

  it("provides an accessible label on the shared dropdown trigger", () => {
    expect(systemDropdown).toContain("ariaLabel?: string");
    expect(systemDropdown).toContain("aria-label={ariaLabel}");
    expect(systemDropdown).toContain('variant?: "default" | "compact"');
    expect(systemDropdown).toContain('{!compact && <div className="border-b');
    expect(systemDropdown).toContain('compact ? "h-10 min-h-10 py-0 text-xs"');
  });
});
