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
  });
});
