import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Đồng bộ giao diện License", () => {
  it("dùng bộ lọc Bản quyền compact thay cho select native", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).toContain('control.dataset.handoverLicenseFilter = "true"');
    expect(home).toContain('createRoot(control)');
    expect(home).toContain('<SearchableSelect value={handoverLicenseFilter}');
    expect(home).toContain('placeholder="Tất cả Bản quyền" variant="compact"');
    expect(home).not.toContain('searchPlaceholder="Tìm trạng thái Bản quyền..."');
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
    const alertDialog = read("client/src/components/ui/alert-dialog.tsx");
    expect(alertDialog).toContain('data-slot="alert-dialog-viewport"');
    expect(alertDialog).toContain("fixed inset-0 z-[101] grid place-items-center p-4");
    expect(alertDialog).toContain("max-h-[calc(100dvh-2rem)]");
  });

  it("hiển thị mã và tên tài sản trong danh sách cấp phát", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");
    const alertDialog = read("client/src/components/ui/alert-dialog.tsx");
    expect(view).toContain("assignmentRecipientLabel(item)");
    expect(view).not.toContain("item.assignedToName || item.deviceName || `Cấp phát #${item.id}`");
    expect(alertDialog).toContain('data-slot="alert-dialog-viewport"');
  });
});
