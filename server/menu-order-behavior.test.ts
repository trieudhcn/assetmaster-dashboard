import { describe, expect, it } from "vitest";
import { reorderMenuItems } from "../client/src/lib/menuOrder";

describe("kéo-thả thứ tự menu", () => {
  it("di chuyển mục thứ 14 trong danh sách hiện hành mà vẫn giữ nguyên đủ 14 menu", () => {
    const labels = ["Tổng quan", "Danh mục tài sản", "Phân loại tài sản", "Nhà cung cấp & Hãng", "Hợp đồng & Hóa đơn", "Bản quyền & Dịch vụ", "Phụ kiện", "Bàn giao & Cấp phát", "Bảo hành & Sửa chữa", "Phòng Ban & Bộ Phận", "Quản lý nhân viên", "Khấu hao & Thanh lý", "Kiểm kê", "Báo Cáo"];
    const reordered = reorderMenuItems(labels, 13, 5);

    expect(reordered).toHaveLength(14);
    expect(reordered[5]).toBe("Báo Cáo");
    expect(reordered).toContain("Bản quyền & Dịch vụ");
  });
});
