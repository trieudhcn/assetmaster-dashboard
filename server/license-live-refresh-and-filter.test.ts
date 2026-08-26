import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Đồng bộ giao diện License", () => {
  it("dùng bộ lọc Bản quyền tìm kiếm thay cho select native", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).toContain('control.dataset.handoverLicenseFilter = "true"');
    expect(home).toContain('search.placeholder = "Tìm trạng thái Bản quyền..."');
    expect(home).toContain('menu.setAttribute("role", "listbox")');
    expect(home).not.toContain('const select = existing?.querySelector<HTMLSelectElement>("select")');
  });

  it("làm mới sức chứa sau cấp phát và yêu cầu xác nhận trước khi xóa Loại License", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");
    expect(view).toContain("utils.softwareLicenses.capacity.invalidate()");
    expect(view).toContain('window.confirm(`Xóa Loại License');
    expect(view).toContain("Loại này chỉ được xóa khi chưa được dùng");
  });

  it("cho phép yêu cầu thu hồi License riêng lẻ mà không thu hồi tài sản", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");
    expect(view).toContain("data-license-individual-reclaim");
    expect(view).toContain("Tài sản bàn giao vẫn được giữ nguyên");
    expect(view).toContain("onRequestRevoke(assignment.id)");
    expect(view).toContain("setPendingRevokeAssignmentId");
  });
});
