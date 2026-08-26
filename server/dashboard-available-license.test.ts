import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Dashboard License còn trống", () => {
  it("tổng hợp sức chứa thực và chỉ liệt kê License còn số lượng khả dụng", () => {
    const home = read("client/src/pages/Home.tsx");

    expect(home).toContain("dashboardSoftwareLicenseCapacityQuery = trpc.softwareLicenses.capacity.useQuery");
    expect(home).toContain("filter((license) => license.available > 0)");
    expect(home).toContain("data-dashboard-available-licenses");
    expect(home).toContain("Chưa được cấp phát hoặc gắn với bất kỳ tài sản nào.");
    expect(home).toContain('setActiveNav("Bản quyền & Dịch vụ")');
    expect(home).toContain("data-dashboard-branch-license-row");
    expect(home).toContain('data-branch-asset-value-chart className="mt-5 overflow-hidden');
    expect(home).toContain("Tổng nguyên giá tài sản đang còn thuộc công ty, phân theo Chi nhánh.");
    expect(home).toContain("ring-1 ring-[#BFE7E1]");
    expect(home).toContain('document.querySelector<HTMLElement>("[data-dashboard-alert-history-launcher]")?.remove()');
  });
});
