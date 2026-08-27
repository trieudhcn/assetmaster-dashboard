import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "client/src/pages/LicensesServicesManagementView.tsx"), "utf8");

describe("Bản quyền & Dịch vụ — phân trang", () => {
  it("hiển thị tối đa 5 dòng mỗi trang sau khi lọc và sắp xếp", () => {
    expect(source).toContain("const LICENSE_SERVICE_PAGE_SIZE = 5;");
    expect(source).toContain("const pagedLicenses = filteredLicenses.slice");
    expect(source).toContain("const pagedServices = filteredServices.slice");
    expect(source).toContain("pagedLicenses.map((license) =>");
    expect(source).toContain("pagedServices.map((service) =>");
  });

  it("đặt lại trang khi tìm kiếm hoặc đổi bộ lọc và có điều hướng trước/sau", () => {
    expect(source).toContain("useEffect(() => { setLicensePage(1); }, [query, licenseStatusFilter, vendorFilter, expiryFilter, expirySortDirection]);");
    expect(source).toContain("useEffect(() => { setServicePage(1); }, [query, serviceStatusFilter, vendorFilter, serviceTypeFilter, branchFilter, expiryFilter, expirySortDirection]);");
    expect(source).toContain("data-license-service-pagination");
    expect(source).toContain("Trang ${label} trước");
    expect(source).toContain("Trang ${label} sau");
    expect(source).toContain("Hiển thị <b className=\"text-[#527089]\">{start}–{end}</b> / {total} {label}");
  });
});
