import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Lịch sử cấp phát theo License", () => {
  it("hiển thị tất cả lượt cấp phát và thu hồi trong chi tiết License", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");

    expect(view).toContain("licenseAssignmentHistory");
    expect(view).toContain("data-license-assignment-history");
    expect(view).toContain("Lịch sử cấp phát & thu hồi");
    expect(view).toContain('assignment.status === "active" ? "Đang cấp phát" : "Đã thu hồi"');
    expect(view).toContain("Thu hồi {new Intl.DateTimeFormat");
    expect(view).toContain("assignmentTarget(assignment)");
  });
});
