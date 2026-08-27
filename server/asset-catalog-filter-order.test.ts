import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");

describe("Bộ lọc Danh mục tài sản", () => {
  it("không còn state hay dropdown Loại tài sản đã ngừng sử dụng", () => {
    expect(source).not.toContain('const [category, setCategory] = useState("Tất cả loại tài sản")');
    expect(source).not.toContain('value={category} onChange={onCategoryChange}');
    expect(source).not.toContain('onCategoryChange={(value) => applyAssetFilter(setCategory, value)}');
  });

  it("đặt Hóa đơn ngay sau Bảo hành và trước bộ lọc License", () => {
    const warranty = source.indexOf('<FilterSelect value={warranty} onChange={onWarrantyChange}');
    const invoice = source.indexOf('<FilterSelect value={invoice} onChange={onInvoiceChange}');
    const license = source.indexOf('<FilterSelect value={assetCatalogLicenseFilterState.value}');
    expect(warranty).toBeGreaterThan(-1);
    expect(invoice).toBeGreaterThan(warranty);
    expect(license).toBeGreaterThan(invoice);
  });
});
