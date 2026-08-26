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

  it("đặt thu hồi cạnh cấp phát và cho chọn người đang giữ License", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");
    expect(view).not.toContain("data-license-individual-reclaim");
    expect(view).toContain("data-license-inline-reclaim");
    expect(view).toContain("Chọn người cần thu hồi License");
    expect(view).toContain("setPendingRevokeAssignmentId(assignment.id)");
  });

  it("giữ dialog xác nhận ở giữa viewport trên mobile", () => {
    const styles = read("client/src/index.css");
    expect(styles).toContain('[data-slot="alert-dialog-content"]');
    expect(styles).toContain("max-height: calc(100dvh - 2rem) !important");
    expect(styles).toContain("transform: translate(-50%, -50%) !important");
    expect(styles).toContain("@keyframes assetmaster-modal-in { from { opacity: 0; transform: scale(0.97);");
  });

  it("hiển thị mã và tên tài sản trong danh sách cấp phát", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");
    const alertDialog = read("client/src/components/ui/alert-dialog.tsx");
    expect(view).toContain("assignmentRecipientLabel(item)");
    expect(view).not.toContain("item.assignedToName || item.deviceName || `Cấp phát #${item.id}`");
    expect(alertDialog).toContain("-translate-x-1/2 -translate-y-1/2");
  });
});
