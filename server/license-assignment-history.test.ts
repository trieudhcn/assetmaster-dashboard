import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Lịch sử cấp phát theo License", () => {
  it("tóm tắt ba lượt gần nhất và cho phép xem toàn bộ lịch sử có phân trang", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");

    expect(view).toContain("licenseAssignmentHistory");
    expect(view).toContain("data-license-assignment-history");
    expect(view).toContain("Lịch sử cấp phát & thu hồi");
    expect(view).toContain('assignment.status === "active" ? "Đang cấp phát" : "Đã thu hồi"');
    expect(view).toContain("Thu hồi {new Intl.DateTimeFormat");
    expect(view).toContain("assignmentTarget(assignment)");
    expect(view).toContain("Hiển thị 3 lượt gần nhất; mở toàn bộ khi cần tra cứu.");
    expect(view).toContain("licenseAssignmentHistoryControls");
    expect(view).toContain("Xem toàn bộ (${rows.length})");
    expect(view).toContain("Trang ${page}/${pages}");
  });
});
