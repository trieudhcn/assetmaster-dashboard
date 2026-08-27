import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Danh mục tài sản — cột và bộ lọc License", () => {
  it("đặt cột License sau Trạng thái và mặc định ẩn", () => {
    const view = read("client/src/pages/Home.tsx");

    expect(view).toContain('type AssetCatalogColumn = "code" | "name" | "holder" | "branch" | "status" | "license"');
    expect(view).toContain('status: true, license: false, location: true');
    expect(view).toContain('["code", "name", "holder", "branch", "status", "license", "location"');
    expect(view).toContain('{ key: "license", label: "License" }');
  });

  it("chỉ lọc các tài sản có License active khớp tên phần mềm", () => {
    const view = read("client/src/pages/Home.tsx");

    expect(view).toContain('assignment.status === "active" && Boolean(assignment.assetId)');
    expect(view).toContain('const matchesLicense = licenseFilter === "Tất cả Bản quyền"');
    expect(view).toContain('asset.licenseLabels || []');
    expect(view).toContain('matchesVietnameseSearch(licenseName, licenseFilter)');
  });

  it("dùng dropdown chuẩn ở cuối dải lọc và đặt icon lịch sử import cạnh nút đặt lại", () => {
    const view = read("client/src/pages/Home.tsx");

    expect(view).toContain('<FilterSelect value={assetCatalogLicenseFilterState.value}');
    expect(view).toContain('counts={assetCatalogLicenseFilterState.counts}');
    expect(view).toContain('<SlidersHorizontal size={14} />Đặt lại bộ lọc</button><button type="button" onClick={onOpenImportHistory}');
    expect(view).toContain('<History size={15} /></button>');
  });
});
