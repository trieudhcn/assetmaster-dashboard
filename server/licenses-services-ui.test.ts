import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Bản quyền & Dịch vụ", () => {
  it("registers the sidebar entry, deep link and management screen", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

    expect(home).toContain('label: "Bản quyền & Dịch vụ"');
    expect(home).toContain('licenses: "Bản quyền & Dịch vụ"');
    expect(home).toContain('<LicensesServicesManagementView />');
  });

  it("provides licensing, assignment and service-expiry management flows", () => {
    const view = readFileSync(resolve(process.cwd(), "client/src/pages/LicensesServicesManagementView.tsx"), "utf8");

    expect(view).toContain("trpc.softwareLicenses.list.useQuery");
    expect(view).toContain("trpc.softwareLicenses.assign.useMutation");
    expect(view).toContain("trpc.technologyServices.list.useQuery");
    expect(view).toContain("Bản quyền sắp hết hạn");
    expect(view).toContain("Dịch vụ sắp hết hạn");
    expect(view).toContain("Đường truyền Internet");
    expect(view).toContain("Tên miền");
    expect(view).toContain("SSL");
    expect(view).toContain("data-license-services-filter-controls");
    expect(view).toContain("Lọc trạng thái");
    expect(view).toContain("Lọc nhà cung cấp");
    expect(view).toContain("Lọc loại dịch vụ");
    expect(view).toContain("Lọc chi nhánh");
    expect(view).toContain("data-license-services-loading");
    expect(view).toContain("data-license-services-error");
    expect(view).toContain("data-license-services-directory-state");
    expect(view).toContain("Đang tải {label}");
    expect(view).toContain("Không thể tải {label}");
    expect(view).toContain("vendorUnavailable");
    expect(view).toContain("assignmentDirectoryUnavailable");
    expect(view).toContain("Không thể tải dữ liệu quản lý");
  });
});
