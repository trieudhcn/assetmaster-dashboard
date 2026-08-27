import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "client/src/pages/LicensesServicesManagementView.tsx"), "utf8");

describe("Lịch sử License theo nhân viên — thu hồi nhanh", () => {
  it("chỉ đặt icon thu hồi trên các cấp phát đang hoạt động và mở xác nhận dùng chung", () => {
    expect(source).toContain('entry.status === "active" ? <button type="button" data-employee-license-revoke-action');
    expect(source).toContain("onClick={() => setPendingRevokeAssignmentId(entry.id)}");
    expect(source).toContain('disabled={revokeAssignment.isPending}');
    expect(source).toContain('aria-label={`Thu hồi ${entry.license?.productName || "Bản quyền"}`}');
    expect(source).toContain('<RotateCcw size={15} />');
    expect(source).toContain('<AlertDialog open={Boolean(pendingRevokeAssignment)}');
  });
});
